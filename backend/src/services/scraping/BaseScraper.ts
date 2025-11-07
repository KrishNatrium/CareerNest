import puppeteer, { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';

export interface ScrapingConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  userAgents: string[];
  proxies?: string[];
  rateLimit: {
    requests: number;
    window: number; // in milliseconds
  };
}

export interface ScrapingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    url: string;
    timestamp: Date;
    duration: number;
    retryCount: number;
  };
}

export abstract class BaseScraper extends EventEmitter {
  protected browser: Browser | null = null;
  protected config: ScrapingConfig;
  private requestQueue: Array<{ timestamp: number; resolve: () => void }> = [];

  constructor(config: Partial<ScrapingConfig> = {}) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
      rateLimit: {
        requests: 10,
        window: 60000 // 1 minute
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.emit('cleanup');
    }
  }

  protected async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();
    
    // Set random user agent
    const userAgent = this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
    await page.setUserAgent(userAgent);

    // Set viewport
    await page.setViewport({
      width: 1366 + Math.floor(Math.random() * 100),
      height: 768 + Math.floor(Math.random() * 100)
    });

    // Set timeout
    page.setDefaultTimeout(this.config.timeout);

    return page;
  }

  protected async waitForRateLimit(): Promise<void> {
    return new Promise((resolve) => {
      const now = Date.now();
      
      // Clean old requests outside the window
      this.requestQueue = this.requestQueue.filter(
        req => now - req.timestamp < this.config.rateLimit.window
      );

      if (this.requestQueue.length < this.config.rateLimit.requests) {
        this.requestQueue.push({ timestamp: now, resolve });
        resolve();
      } else {
        // Wait until the oldest request is outside the window
        const oldestRequest = this.requestQueue[0];
        const waitTime = this.config.rateLimit.window - (now - oldestRequest.timestamp);
        
        setTimeout(() => {
          this.requestQueue.push({ timestamp: Date.now(), resolve });
          resolve();
        }, waitTime);
      }
    });
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      await this.waitForRateLimit();
      return await operation();
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        this.emit('retry', { retryCount: retryCount + 1, error });
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return this.retryOperation(operation, retryCount + 1);
      }
      throw error;
    }
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async safeNavigate(page: Page, url: string): Promise<void> {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.config.timeout
    });
  }

  protected async safeWaitForSelector(page: Page, selector: string, timeout?: number): Promise<void> {
    await page.waitForSelector(selector, {
      timeout: timeout || this.config.timeout
    });
  }

  // Abstract methods that must be implemented by subclasses
  abstract scrape(url: string): Promise<ScrapingResult>;
  abstract validateData(data: any): boolean;
}