import { Page } from 'puppeteer';
import { BaseScraper, ScrapingResult, ScrapingConfig } from '../BaseScraper';
import { getSourceConfig } from '../../../config/scraping';

export interface InternshalaInternship {
  id: string;
  title: string;
  company: string;
  location: string;
  duration: string;
  stipend: string;
  postedDate: string;
  applicationDeadline?: string;
  description: string;
  skills: string[];
  workType: 'office' | 'remote' | 'hybrid';
  applicationUrl: string;
  externalId: string;
}

export class InternshalaScaper extends BaseScraper {
  private baseUrl = 'https://internshala.com';
  private seenInternships = new Set<string>();

  constructor() {
    const sourceConfig = getSourceConfig('internshala');
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
  }

  async scrape(url: string): Promise<ScrapingResult<InternshalaInternship[]>> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      page = await this.createPage();
      
      // Navigate to the URL
      await this.safeNavigate(page, url);
      
      // Wait for internship listings to load
      await this.safeWaitForSelector(page, '.internship_meta', 10000);
      
      // Extract internship data
      const internships = await this.extractInternships(page);
      
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

  private async extractInternships(page: Page): Promise<InternshalaInternship[]> {
    return await page.evaluate(() => {
      const internshipElements = document.querySelectorAll('.internship_meta');
      const internships: any[] = [];

      internshipElements.forEach((element: any, index: number) => {
        try {
          // Extract basic information
          const titleElement = element.querySelector('.job-title a');
          const companyElement = element.querySelector('.company-name');
          const locationElement = element.querySelector('.location_link');
          const durationElement = element.querySelector('.duration');
          const stipendElement = element.querySelector('.stipend');
          const postedElement = element.querySelector('.status-success');

          if (!titleElement || !companyElement) {
            return; // Skip if essential elements are missing
          }

          const title = titleElement.textContent?.trim() || '';
          const company = companyElement.textContent?.trim() || '';
          const location = locationElement?.textContent?.trim() || '';
          const duration = durationElement?.textContent?.trim() || '';
          const stipend = stipendElement?.textContent?.trim() || '';
          const postedDate = postedElement?.textContent?.trim() || '';

          // Extract application URL
          const applicationLink = titleElement.getAttribute('href') || '';
          const applicationUrl = applicationLink.startsWith('http') 
            ? applicationLink 
            : `https://internshala.com${applicationLink}`;

          // Extract external ID from URL
          const urlMatch = applicationLink.match(/\/internship\/detail\/([^\/]+)/);
          const externalId = urlMatch ? urlMatch[1] : `internshala-${index}-${Date.now()}`;

          // Extract skills (if available)
          const skillsElements = element.querySelectorAll('.skill-tag, .skills-required span');
          const skills: string[] = [];
          skillsElements.forEach((skillEl: any) => {
            const skill = skillEl.textContent?.trim();
            if (skill) skills.push(skill);
          });

          // Determine work type
          let workType: 'office' | 'remote' | 'hybrid' = 'office';
          const locationText = location.toLowerCase();
          if (locationText.includes('remote') || locationText.includes('work from home')) {
            workType = 'remote';
          } else if (locationText.includes('hybrid')) {
            workType = 'hybrid';
          }

          // Extract description (if available in listing)
          const descriptionElement = element.querySelector('.internship_other_details_container, .job-description');
          const description = descriptionElement?.textContent?.trim() || '';

          // Extract application deadline (if available)
          const deadlineElement = element.querySelector('.apply_by, .deadline');
          const applicationDeadline = deadlineElement?.textContent?.trim();

          const internship: any = {
            id: externalId,
            title,
            company,
            location,
            duration,
            stipend,
            postedDate,
            applicationDeadline,
            description,
            skills,
            workType,
            applicationUrl,
            externalId
          };

          internships.push(internship);
        } catch (error) {
          console.error('Error extracting internship data:', error);
        }
      });

      return internships;
    });
  }

  async scrapeWithPagination(baseUrl: string, maxPages: number = 5): Promise<ScrapingResult<InternshalaInternship[]>> {
    const allInternships: InternshalaInternship[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (currentPage <= maxPages && hasNextPage) {
      const pageUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${currentPage}`;
      
      const result = await this.retryOperation(async () => {
        return await this.scrape(pageUrl);
      });

      if (result.success && result.data) {
        allInternships.push(...result.data);
        
        // Check if there are more pages (simple heuristic)
        hasNextPage = result.data.length > 0;
        
        if (result.data.length === 0) {
          console.log(`No more internships found on page ${currentPage}`);
          break;
        }
        
        console.log(`Scraped page ${currentPage}: found ${result.data.length} internships`);
      } else {
        console.error(`Failed to scrape page ${currentPage}:`, result.error);
        hasNextPage = false;
      }

      currentPage++;
      
      // Add delay between pages to be respectful
      await this.delay(2000);
    }

    return {
      success: true,
      data: allInternships,
      metadata: {
        url: baseUrl,
        timestamp: new Date(),
        duration: 0,
        retryCount: 0
      }
    };
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

  // Method to scrape specific categories
  async scrapeCategory(category: string, location?: string): Promise<ScrapingResult<InternshalaInternship[]>> {
    let url = `${this.baseUrl}/internships/${category}`;
    
    if (location) {
      url += `/${location}`;
    }

    return await this.scrapeWithPagination(url);
  }

  // Method to scrape popular categories
  async scrapePopularCategories(): Promise<ScrapingResult<InternshalaInternship[]>> {
    const categories = [
      'computer-science',
      'marketing',
      'business-development',
      'content-writing',
      'graphic-design',
      'web-development',
      'android-app-development',
      'data-science'
    ];

    const allInternships: InternshalaInternship[] = [];

    for (const category of categories) {
      try {
        console.log(`Scraping category: ${category}`);
        const result = await this.scrapeCategory(category);
        
        if (result.success && result.data) {
          allInternships.push(...result.data);
          console.log(`Found ${result.data.length} internships in ${category}`);
        }
        
        // Add delay between categories
        await this.delay(3000);
      } catch (error) {
        console.error(`Error scraping category ${category}:`, error);
      }
    }

    return {
      success: true,
      data: allInternships,
      metadata: {
        url: `${this.baseUrl}/internships`,
        timestamp: new Date(),
        duration: 0,
        retryCount: 0
      }
    };
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
}