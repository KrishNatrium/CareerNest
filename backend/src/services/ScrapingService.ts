import { ScrapingManager } from './scraping/ScrapingManager';
import { InternshalaScaper } from './scraping/scrapers/InternshalaScaper';
import { LinkedInScraper } from './scraping/scrapers/LinkedInScraper';
import { scrapingConfig, validateScrapingConfig } from '../config/scraping';

export class ScrapingService {
  private static instance: ScrapingService;
  private scrapingManager: ScrapingManager | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ScrapingService {
    if (!ScrapingService.instance) {
      ScrapingService.instance = new ScrapingService();
    }
    return ScrapingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate configuration
      validateScrapingConfig();

      // Initialize scraping manager
      this.scrapingManager = new ScrapingManager(scrapingConfig.manager);

      // Register scrapers
      await this.registerScrapers();

      this.isInitialized = true;
      console.log('Scraping service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize scraping service:', error);
      throw error;
    }
  }

  private async registerScrapers(): Promise<void> {
    if (!this.scrapingManager) {
      throw new Error('Scraping manager not initialized');
    }

    // Register Internshala scraper
    if (scrapingConfig.sources.internshala.enabled) {
      const internshalaScaper = new InternshalaScaper();
      await internshalaScaper.initialize();
      this.scrapingManager.registerScraper('internshala', internshalaScaper);
      console.log('Registered Internshala scraper');
    }

    // Register LinkedIn scraper
    if (scrapingConfig.sources.linkedin.enabled) {
      const linkedInScraper = new LinkedInScraper();
      await linkedInScraper.initialize();
      this.scrapingManager.registerScraper('linkedin', linkedInScraper);
      console.log('Registered LinkedIn scraper');
    }

    console.log('Scraper registration completed');
  }

  getManager(): ScrapingManager {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized. Call initialize() first.');
    }
    return this.scrapingManager;
  }

  async addScrapingJob(
    source: string,
    url: string,
    type: 'full_scrape' | 'incremental' | 'single_page' = 'single_page',
    options: {
      priority?: number;
      delay?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized');
    }

    return await this.scrapingManager.addScrapingJob(source, url, type, options);
  }

  async addRecurringJob(
    name: string,
    source: string,
    url: string,
    cronExpression: string,
    type: 'full_scrape' | 'incremental' = 'incremental',
    options: {
      priority?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized');
    }

    await this.scrapingManager.addRecurringScrapingJob(
      name,
      source,
      url,
      cronExpression,
      type,
      options
    );
  }

  async getStatus(): Promise<{
    isHealthy: boolean;
    activeJobs: number;
    waitingJobs: number;
    failedJobs: number;
    completedJobs: number;
    registeredScrapers: string[];
    proxyStats: {
      total: number;
      healthy: number;
    };
  }> {
    if (!this.scrapingManager) {
      return {
        isHealthy: false,
        activeJobs: 0,
        waitingJobs: 0,
        failedJobs: 0,
        completedJobs: 0,
        registeredScrapers: [],
        proxyStats: {
          total: 0,
          healthy: 0,
        },
      };
    }

    return await this.scrapingManager.getQueueStatus();
  }

  async pauseProcessing(): Promise<void> {
    if (this.scrapingManager) {
      await this.scrapingManager.pauseProcessing();
    }
  }

  async resumeProcessing(): Promise<void> {
    if (this.scrapingManager) {
      await this.scrapingManager.resumeProcessing();
    }
  }

  async retryFailedJobs(): Promise<void> {
    if (this.scrapingManager) {
      await this.scrapingManager.retryFailedJobs();
    }
  }

  async cleanup(): Promise<void> {
    if (this.scrapingManager) {
      await this.scrapingManager.cleanupCompletedJobs();
    }
  }

  async shutdown(): Promise<void> {
    if (this.scrapingManager) {
      await this.scrapingManager.shutdown();
      this.scrapingManager = null;
    }
    this.isInitialized = false;
    console.log('Scraping service shut down');
  }

  isReady(): boolean {
    return this.isInitialized && this.scrapingManager !== null;
  }

  // Convenience methods for Internshala scraping
  async scrapeInternshalaCategory(category: string, location?: string): Promise<string> {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized');
    }

    let url = `https://internshala.com/internships/${category}`;
    if (location) {
      url += `/${location}`;
    }

    return await this.addScrapingJob('internshala', url, 'full_scrape', {
      priority: 5,
      metadata: { category, location }
    });
  }

  async scrapeInternshalaPopularCategories(): Promise<string> {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized');
    }

    return await this.addScrapingJob('internshala', 'https://internshala.com/internships', 'full_scrape', {
      priority: 10,
      metadata: { type: 'popular_categories' }
    });
  }

  async scheduleInternshalaRecurring(): Promise<void> {
    // Schedule daily scraping of popular categories
    await this.addRecurringJob(
      'internshala-daily-scrape',
      'internshala',
      'https://internshala.com/internships',
      '0 2 * * *', // Daily at 2 AM
      'incremental',
      {
        priority: 5,
        metadata: { type: 'daily_scrape' }
      }
    );

    // Schedule hourly scraping of new internships
    await this.addRecurringJob(
      'internshala-hourly-new',
      'internshala',
      'https://internshala.com/internships?sort=latest',
      '0 * * * *', // Every hour
      'incremental',
      {
        priority: 8,
        metadata: { type: 'hourly_new' }
      }
    );
  }

  // Convenience methods for LinkedIn scraping
  async scrapeLinkedInJobs(criteria: {
    keywords?: string;
    location?: string;
    experienceLevel?: string;
    count?: number;
  }): Promise<string> {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized');
    }

    const params = new URLSearchParams();
    if (criteria.keywords) params.append('keywords', criteria.keywords);
    if (criteria.location) params.append('location', criteria.location);
    if (criteria.experienceLevel) params.append('f_E', criteria.experienceLevel);
    if (criteria.count) params.append('count', criteria.count.toString());

    const url = `https://www.linkedin.com/jobs/search?${params.toString()}`;

    return await this.addScrapingJob('linkedin', url, 'full_scrape', {
      priority: 7,
      metadata: { ...criteria, type: 'job_search' }
    });
  }

  async scrapeLinkedInInternships(location?: string): Promise<string> {
    if (!this.scrapingManager) {
      throw new Error('Scraping service not initialized');
    }

    const params = new URLSearchParams({
      keywords: 'internship',
      f_E: '1', // Entry level
      f_JT: 'I' // Internship job type
    });

    if (location) {
      params.append('location', location);
    }

    const url = `https://www.linkedin.com/jobs/search?${params.toString()}`;

    return await this.addScrapingJob('linkedin', url, 'full_scrape', {
      priority: 8,
      metadata: { location, type: 'internship_search' }
    });
  }

  async scheduleLinkedInRecurring(): Promise<void> {
    // Schedule daily scraping of internships
    await this.addRecurringJob(
      'linkedin-daily-internships',
      'linkedin',
      'https://www.linkedin.com/jobs/search?keywords=internship&f_E=1&f_JT=I',
      '0 3 * * *', // Daily at 3 AM
      'incremental',
      {
        priority: 6,
        metadata: { type: 'daily_internships' }
      }
    );

    // Schedule hourly scraping of new postings
    await this.addRecurringJob(
      'linkedin-hourly-new',
      'linkedin',
      'https://www.linkedin.com/jobs/search?keywords=internship&f_TPR=r86400', // Last 24 hours
      '30 * * * *', // Every hour at 30 minutes
      'incremental',
      {
        priority: 7,
        metadata: { type: 'hourly_new' }
      }
    );
  }

  // OAuth methods for LinkedIn API
  async getLinkedInAuthUrl(): Promise<string> {
    // This is a simplified approach - in a real implementation,
    // you'd need to access the specific LinkedIn scraper instance
    const linkedInScraper = new LinkedInScraper();
    return await linkedInScraper.initiateOAuthFlow();
  }

  async exchangeLinkedInCode(code: string): Promise<string> {
    const linkedInScraper = new LinkedInScraper();
    return await linkedInScraper.exchangeCodeForToken(code);
  }
}