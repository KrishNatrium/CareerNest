import { Job } from 'bull';
import { BaseScraper } from './BaseScraper';
import { ScrapingQueue, ScrapingJobData, ScrapingJobResult } from './ScrapingQueue';
import { ProxyManager, ProxyConfig } from './ProxyManager';
import { ScrapingJob } from '../../models/ScrapingJob';
import { ScrapingProcessor } from './ScrapingProcessor';
import { InternshalaScaper } from './scrapers/InternshalaScaper';
import { LinkedInScraper } from './scrapers/LinkedInScraper';
import { ScrapingLogger } from './ScrapingLogger';

export interface ScrapingManagerConfig {
  concurrency?: number;
  proxies?: ProxyConfig[];
  redis?: any;
}

export class ScrapingManager {
  private queue: ScrapingQueue;
  private proxyManager: ProxyManager;
  private scrapers: Map<string, BaseScraper> = new Map();
  private logger: ScrapingLogger;

  constructor(config: ScrapingManagerConfig = {}) {
    this.queue = new ScrapingQueue(config.redis);
    this.proxyManager = new ProxyManager(config.proxies || []);
    this.logger = ScrapingLogger.getInstance();
    
    this.setupJobProcessor(config.concurrency || 3);
  }

  private setupJobProcessor(concurrency: number): void {
    this.queue.getQueue().process(concurrency, async (job: Job<ScrapingJobData>) => {
      return await this.processScrapingJob(job);
    });
  }

  private async processScrapingJob(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
    const { source, url } = job.data;
    const jobId = job.id as string;

    try {
      await this.logger.info(source, `Starting scraping job for URL: ${url}`, { url }, jobId);

      // Update job status in database
      await this.updateScrapingJobStatus(jobId, 'running', {
        started_at: new Date(),
      });

      // Get appropriate scraper
      const scraper = this.scrapers.get(source);
      if (!scraper) {
        const error = `No scraper found for source: ${source}`;
        await this.logger.error(source, error, { availableScrapers: Array.from(this.scrapers.keys()) }, jobId);
        throw new Error(error);
      }

      // Initialize scraper if not already done
      if (!scraper.listenerCount('initialized')) {
        await this.logger.debug(source, 'Initializing scraper', {}, jobId);
        await scraper.initialize();
      }

      // Update progress
      await job.progress(25);

      // Perform scraping
      await this.logger.info(source, 'Starting data extraction', { url }, jobId);
      const result = await scraper.scrape(url);
      
      if (!result.success) {
        await this.logger.warn(source, `Scraping failed: ${result.error}`, { url, error: result.error }, jobId);
      } else {
        await this.logger.info(source, `Scraping completed successfully`, { 
          url, 
          recordsFound: Array.isArray(result.data) ? result.data.length : 1 
        }, jobId);
      }
      
      // Update progress
      await job.progress(50);

      let processedData = null;
      let recordsProcessed = 0;
      let recordsAdded = 0;

      // Process and store the scraped data if successful
      if (result.success && result.data) {
        await this.logger.info(source, 'Starting data processing and storage', { 
          recordCount: Array.isArray(result.data) ? result.data.length : 1 
        }, jobId);

        if (source === 'internshala' && scraper instanceof InternshalaScaper) {
          processedData = await ScrapingProcessor.processInternshalaData(result.data, source);
          recordsProcessed = processedData.totalScraped;
          recordsAdded = processedData.storageResult.inserted;
        } else if (source === 'linkedin' && scraper instanceof LinkedInScraper) {
          processedData = await ScrapingProcessor.processLinkedInData(result.data, source);
          recordsProcessed = processedData.totalScraped;
          recordsAdded = processedData.storageResult.inserted;
        }

        if (processedData) {
          await this.logger.info(source, 'Data processing completed', {
            totalScraped: processedData.totalScraped,
            inserted: processedData.storageResult.inserted,
            updated: processedData.storageResult.updated,
            skipped: processedData.storageResult.skipped,
            processingTime: processedData.processingTime
          }, jobId);

          if (processedData.errors.length > 0) {
            await this.logger.warn(source, 'Processing completed with errors', {
              errorCount: processedData.errors.length,
              errors: processedData.errors
            }, jobId);
          }
        }
      }

      // Update progress
      await job.progress(75);

      const jobResult: ScrapingJobResult = {
        ...result,
        jobId,
        source,
        processedAt: new Date(),
        ...(processedData && { processingResult: processedData })
      };

      // Update job status in database
      await this.updateScrapingJobStatus(jobId, 'completed', {
        completed_at: new Date(),
        records_processed: recordsProcessed || (Array.isArray(result.data) ? result.data.length : 1),
        records_added: recordsAdded || (Array.isArray(result.data) ? result.data.length : (result.success ? 1 : 0)),
      });

      await this.logger.info(source, 'Scraping job completed successfully', {
        recordsProcessed,
        recordsAdded,
        duration: result.metadata?.duration
      }, jobId);

      await job.progress(100);
      return jobResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(source, `Scraping job failed: ${errorMessage}`, { 
        url, 
        error: errorMessage 
      }, jobId);
      
      // Update job status in database
      await this.updateScrapingJobStatus(jobId, 'failed', {
        completed_at: new Date(),
        error_message: errorMessage,
      });

      throw error;
    }
  }

  private async updateScrapingJobStatus(
    jobId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    updates: Partial<{
      started_at: Date;
      completed_at: Date;
      records_processed: number;
      records_added: number;
      records_updated: number;
      error_message: string;
    }>
  ): Promise<void> {
    try {
      await ScrapingJob.updateJobStatus(jobId, status, updates);
    } catch (error) {
      console.error('Failed to update scraping job status:', error);
    }
  }

  registerScraper(source: string, scraper: BaseScraper): void {
    this.scrapers.set(source, scraper);
    this.logger.info('system', `Registered scraper for source: ${source}`, { source });
  }

  unregisterScraper(source: string): void {
    const scraper = this.scrapers.get(source);
    if (scraper) {
      scraper.cleanup();
      this.scrapers.delete(source);
      console.log(`Unregistered scraper for source: ${source}`);
    }
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
    if (!this.scrapers.has(source)) {
      throw new Error(`No scraper registered for source: ${source}`);
    }

    // Create job record in database
    const jobRecord = await ScrapingJob.createJob({
      source_name: source,
      job_type: type,
      status: 'pending',
    });

    const jobData: ScrapingJobData = {
      source,
      url,
      type,
      ...(options.priority !== undefined && { priority: options.priority }),
      metadata: {
        ...options.metadata,
        dbJobId: jobRecord.id,
      },
    };

    const job = await this.queue.addJob(jobData, {
      priority: options.priority,
      delay: options.delay,
    });

    return job.id as string;
  }

  async addRecurringScrapingJob(
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
    if (!this.scrapers.has(source)) {
      throw new Error(`No scraper registered for source: ${source}`);
    }

    const jobData: ScrapingJobData = {
      source,
      url,
      type,
      ...(options.priority !== undefined && { priority: options.priority }),
      ...(options.metadata && { metadata: options.metadata }),
    };

    await this.queue.addRecurringJob(name, jobData, cronExpression, {
      priority: options.priority,
    });
  }

  async getQueueStatus(): Promise<{
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
    const queueHealth = await this.queue.getQueueHealth();
    
    return {
      ...queueHealth,
      registeredScrapers: Array.from(this.scrapers.keys()),
      proxyStats: {
        total: this.proxyManager.getProxyStats().length,
        healthy: this.proxyManager.getHealthyProxyCount(),
      },
    };
  }

  async pauseProcessing(): Promise<void> {
    await this.queue.pauseQueue();
  }

  async resumeProcessing(): Promise<void> {
    await this.queue.resumeQueue();
  }

  async retryFailedJobs(): Promise<void> {
    await this.queue.retryFailedJobs();
  }

  async cleanupCompletedJobs(olderThanHours = 24): Promise<void> {
    const grace = olderThanHours * 60 * 60 * 1000; // Convert to milliseconds
    await this.queue.cleanQueue(grace);
  }

  async shutdown(): Promise<void> {
    await this.logger.info('system', 'Shutting down scraping manager...');
    
    // Pause queue to prevent new jobs
    await this.queue.pauseQueue();
    
    // Cleanup all scrapers
    for (const [source, scraper] of this.scrapers) {
      try {
        await scraper.cleanup();
        await this.logger.info('system', `Cleaned up scraper for ${source}`);
      } catch (error) {
        await this.logger.error('system', `Error cleaning up scraper for ${source}`, { 
          source, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Close queue and proxy manager
    await this.queue.close();
    this.proxyManager.destroy();
    
    // Shutdown logger
    await this.logger.shutdown();
    
    await this.logger.info('system', 'Scraping manager shutdown complete');
  }

  getProxyManager(): ProxyManager {
    return this.proxyManager;
  }

  getQueue(): ScrapingQueue {
    return this.queue;
  }
}