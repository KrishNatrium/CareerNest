import { Page } from 'puppeteer';
import { BaseScraper, ScrapingResult, ScrapingConfig } from '../BaseScraper';
import { getSourceConfig } from '../../../config/scraping';
import axios, { AxiosInstance } from 'axios';

export interface LinkedInInternship {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postedDate: string;
  applicationUrl: string;
  workType: 'office' | 'remote' | 'hybrid';
  skills: string[];
  externalId: string;
  salary?: string;
  experienceLevel?: string;
}

export interface LinkedInAPIConfig {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  apiVersion?: string;
}

export class LinkedInScraper extends BaseScraper {
  private baseUrl = 'https://www.linkedin.com';
  private apiBaseUrl = 'https://api.linkedin.com/v2';
  private apiClient: AxiosInstance | null = null;
  private apiConfig: LinkedInAPIConfig;
  private seenInternships = new Set<string>();

  constructor(apiConfig: LinkedInAPIConfig = {}) {
    const sourceConfig = getSourceConfig('linkedin');
    const config: Partial<ScrapingConfig> = {
      maxRetries: sourceConfig.retries,
      timeout: sourceConfig.timeout,
      rateLimit: sourceConfig.rateLimit,
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };
    super(config);

    this.apiConfig = {
      apiVersion: apiConfig.apiVersion || 'v2'
    };

    // Only set optional properties if they exist
    const clientId = process.env.LINKEDIN_CLIENT_ID || apiConfig.clientId;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || apiConfig.clientSecret;
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN || apiConfig.accessToken;

    if (clientId) this.apiConfig.clientId = clientId;
    if (clientSecret) this.apiConfig.clientSecret = clientSecret;
    if (accessToken) this.apiConfig.accessToken = accessToken;

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    if (this.apiConfig.accessToken) {
      this.apiClient = axios.create({
        baseURL: this.apiBaseUrl,
        headers: {
          'Authorization': `Bearer ${this.apiConfig.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        timeout: this.config.timeout
      });

      // Add request interceptor for rate limiting
      this.apiClient.interceptors.request.use(async (config) => {
        await this.waitForRateLimit();
        return config;
      });

      // Add response interceptor for error handling
      this.apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 429) {
            console.warn('LinkedIn API rate limit exceeded');
          } else if (error.response?.status === 401) {
            console.error('LinkedIn API authentication failed');
          }
          return Promise.reject(error);
        }
      );
    }
  }

  async scrape(url: string): Promise<ScrapingResult<LinkedInInternship[]>> {
    const startTime = Date.now();

    try {
      // Try API first if available
      if (this.apiClient && this.isApiUrl(url)) {
        console.log('Using LinkedIn API for scraping');
        return await this.scrapeWithApi(url);
      } else {
        console.log('Using web scraping for LinkedIn');
        return await this.scrapeWithBrowser(url);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          url,
          timestamp: new Date(),
          duration,
          retryCount: 0
        }
      };
    }
  }

  private isApiUrl(url: string): boolean {
    // Check if the URL can be handled by the API
    return url.includes('/jobs/search') || url.includes('api.linkedin.com');
  }

  private async scrapeWithApi(url: string): Promise<ScrapingResult<LinkedInInternship[]>> {
    const startTime = Date.now();

    try {
      if (!this.apiClient) {
        throw new Error('LinkedIn API client not initialized');
      }

      // Parse search parameters from URL
      const searchParams = this.parseSearchParams(url);
      
      // Make API request to search for jobs
      const response = await this.apiClient.get('/jobSearch', {
        params: {
          keywords: searchParams.keywords || 'internship',
          location: searchParams.location,
          experienceLevel: 'INTERNSHIP',
          count: searchParams.count || 25,
          start: searchParams.start || 0
        }
      });

      const jobs = response.data.elements || [];
      const internships = await this.processApiJobs(jobs);

      // Filter out duplicates
      const newInternships = internships.filter(internship => 
        !this.seenInternships.has(internship.externalId)
      );
      
      // Add to seen set
      newInternships.forEach(internship => 
        this.seenInternships.add(internship.externalId)
      );

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: newInternships,
        metadata: {
          url,
          timestamp: new Date(),
          duration,
          retryCount: 0
        }
      };

    } catch (error) {
      console.error('LinkedIn API scraping failed:', error);
      
      // Fallback to web scraping
      console.log('Falling back to web scraping');
      return await this.scrapeWithBrowser(url);
    }
  }

  private async scrapeWithBrowser(url: string): Promise<ScrapingResult<LinkedInInternship[]>> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      page = await this.createPage();
      
      // Navigate to the URL
      await this.safeNavigate(page, url);
      
      // Handle LinkedIn's anti-bot measures
      await this.handleLinkedInAuth(page);
      
      // Wait for job listings to load
      await this.safeWaitForSelector(page, '.jobs-search__results-list, .job-card-container', 15000);
      
      // Extract internship data
      const internships = await this.extractInternshipsFromPage(page);
      
      // Filter out duplicates
      const newInternships = internships.filter(internship => 
        !this.seenInternships.has(internship.externalId)
      );
      
      // Add to seen set
      newInternships.forEach(internship => 
        this.seenInternships.add(internship.externalId)
      );

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: newInternships,
        metadata: {
          url,
          timestamp: new Date(),
          duration,
          retryCount: 0
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          url,
          timestamp: new Date(),
          duration,
          retryCount: 0
        }
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private parseSearchParams(url: string): {
    keywords?: string;
    location?: string;
    count?: number;
    start?: number;
  } {
    try {
      const urlObj = new URL(url);
      const result: {
        keywords?: string;
        location?: string;
        count?: number;
        start?: number;
      } = {};

      const keywords = urlObj.searchParams.get('keywords');
      const location = urlObj.searchParams.get('location');
      const count = urlObj.searchParams.get('count');
      const start = urlObj.searchParams.get('start');

      if (keywords) result.keywords = keywords;
      if (location) result.location = location;
      if (count) result.count = parseInt(count);
      if (start) result.start = parseInt(start);

      // Set defaults if not provided
      if (!result.count) result.count = 25;
      if (!result.start) result.start = 0;

      return result;
    } catch {
      return { count: 25, start: 0 };
    }
  }

  private async processApiJobs(jobs: any[]): Promise<LinkedInInternship[]> {
    const internships: LinkedInInternship[] = [];

    for (const job of jobs) {
      try {
        const internship: LinkedInInternship = {
          id: job.id || `linkedin-${Date.now()}-${Math.random()}`,
          title: job.title || '',
          company: job.companyName || job.company?.name || '',
          location: job.location || '',
          description: job.description || '',
          postedDate: job.listedAt ? new Date(job.listedAt).toISOString() : '',
          applicationUrl: job.applyUrl || `https://www.linkedin.com/jobs/view/${job.id}`,
          workType: this.determineWorkType(job.location, job.workplaceTypes),
          skills: job.skills || [],
          externalId: job.id || `linkedin-api-${Date.now()}-${Math.random()}`,
          salary: job.salary || undefined,
          experienceLevel: job.experienceLevel || 'INTERNSHIP'
        };

        internships.push(internship);
      } catch (error) {
        console.error('Error processing API job:', error);
      }
    }

    return internships;
  }

  private async handleLinkedInAuth(page: Page): Promise<void> {
    try {
      // Check if we're on a login page
      const isLoginPage = await page.$('.login-form, .sign-in-form');
      
      if (isLoginPage) {
        console.warn('LinkedIn requires authentication - some data may not be accessible');
        
        // Try to access public job listings
        await page.goto('https://www.linkedin.com/jobs/search?keywords=internship&location=&geoId=&f_TPR=&position=1&pageNum=0');
        await this.delay(3000);
      }

      // Handle cookie consent if present
      const cookieButton = await page.$('[data-tracking-control-name="guest-homepage-basic_cookie-consent-accept"]');
      if (cookieButton) {
        await cookieButton.click();
        await this.delay(1000);
      }

    } catch (error) {
      console.warn('Error handling LinkedIn auth:', error);
    }
  }

  private async extractInternshipsFromPage(page: Page): Promise<LinkedInInternship[]> {
    return await page.evaluate(() => {
      const jobElements = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      const internships: any[] = [];

      jobElements.forEach((element: any, index: number) => {
        try {
          // Extract basic information
          const titleElement = element.querySelector('.job-card-list__title, .sr-only');
          const companyElement = element.querySelector('.job-card-container__company-name, .job-card-list__company-name');
          const locationElement = element.querySelector('.job-card-container__metadata-item, .job-card-list__metadata');
          const linkElement = element.querySelector('a[href*="/jobs/view/"]');

          if (!titleElement || !companyElement) {
            return; // Skip if essential elements are missing
          }

          const title = titleElement.textContent?.trim() || '';
          const company = companyElement.textContent?.trim() || '';
          const location = locationElement?.textContent?.trim() || '';

          // Extract application URL
          const applicationLink = linkElement?.getAttribute('href') || '';
          const applicationUrl = applicationLink.startsWith('http') 
            ? applicationLink 
            : `https://www.linkedin.com${applicationLink}`;

          // Extract job ID from URL
          const urlMatch = applicationLink.match(/\/jobs\/view\/(\d+)/);
          const externalId = urlMatch ? `linkedin-${urlMatch[1]}` : `linkedin-web-${index}-${Date.now()}`;

          // Extract posted date (if available)
          const postedElement = element.querySelector('.job-card-container__listed-time, .job-card-list__posted-date');
          const postedDate = postedElement?.textContent?.trim() || '';

          // Extract description (if available in listing)
          const descriptionElement = element.querySelector('.job-card-list__description, .job-card-container__description');
          const description = descriptionElement?.textContent?.trim() || '';

          // Determine work type
          let workType: 'office' | 'remote' | 'hybrid' = 'office';
          const locationText = location.toLowerCase();
          if (locationText.includes('remote')) {
            workType = 'remote';
          } else if (locationText.includes('hybrid')) {
            workType = 'hybrid';
          }

          const internship: any = {
            id: externalId,
            title,
            company,
            location,
            description,
            postedDate,
            applicationUrl,
            workType,
            skills: [], // Skills are typically not available in listing view
            externalId
          };

          internships.push(internship);
        } catch (error) {
          console.error('Error extracting LinkedIn internship data:', error);
        }
      });

      return internships;
    });
  }

  private determineWorkType(location: string, workplaceTypes?: string[]): 'office' | 'remote' | 'hybrid' {
    if (workplaceTypes) {
      if (workplaceTypes.includes('REMOTE')) return 'remote';
      if (workplaceTypes.includes('HYBRID')) return 'hybrid';
    }

    const locationText = location?.toLowerCase() || '';
    if (locationText.includes('remote')) return 'remote';
    if (locationText.includes('hybrid')) return 'hybrid';
    
    return 'office';
  }

  // OAuth flow for LinkedIn API access
  async initiateOAuthFlow(): Promise<string> {
    if (!this.apiConfig.clientId) {
      throw new Error('LinkedIn Client ID not configured');
    }

    const state = Math.random().toString(36).substring(7);
    const scope = 'r_liteprofile r_emailaddress w_member_social';
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${this.apiConfig.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(scope)}`;

    return authUrl;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    if (!this.apiConfig.clientId || !this.apiConfig.clientSecret) {
      throw new Error('LinkedIn Client ID and Secret not configured');
    }

    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';

    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.apiConfig.clientId,
        client_secret: this.apiConfig.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const accessToken = response.data.access_token;
      this.apiConfig.accessToken = accessToken;
      this.initializeApiClient();

      return accessToken;
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateData(data: any): boolean {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(internship => {
      return (
        typeof internship.id === 'string' &&
        typeof internship.title === 'string' &&
        typeof internship.company === 'string' &&
        typeof internship.applicationUrl === 'string' &&
        typeof internship.externalId === 'string' &&
        internship.title.length > 0 &&
        internship.company.length > 0
      );
    });
  }

  // Method to search for internships with specific criteria
  async searchInternships(criteria: {
    keywords?: string;
    location?: string;
    experienceLevel?: string;
    count?: number;
  }): Promise<ScrapingResult<LinkedInInternship[]>> {
    const searchUrl = this.buildSearchUrl(criteria);
    return await this.scrape(searchUrl);
  }

  private buildSearchUrl(criteria: {
    keywords?: string;
    location?: string;
    experienceLevel?: string;
    count?: number;
  }): string {
    const params = new URLSearchParams();
    
    if (criteria.keywords) params.append('keywords', criteria.keywords);
    if (criteria.location) params.append('location', criteria.location);
    if (criteria.experienceLevel) params.append('f_E', criteria.experienceLevel);
    if (criteria.count) params.append('count', criteria.count.toString());

    return `${this.baseUrl}/jobs/search?${params.toString()}`;
  }

  // Clear the seen internships cache
  clearCache(): void {
    this.seenInternships.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.seenInternships.size,
      items: Array.from(this.seenInternships)
    };
  }

  // Check if API is available
  isApiAvailable(): boolean {
    return this.apiClient !== null && !!this.apiConfig.accessToken;
  }

  // Get API configuration status
  getApiStatus(): {
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasAccessToken: boolean;
    isConfigured: boolean;
  } {
    return {
      hasClientId: !!this.apiConfig.clientId,
      hasClientSecret: !!this.apiConfig.clientSecret,
      hasAccessToken: !!this.apiConfig.accessToken,
      isConfigured: this.isApiAvailable()
    };
  }
}