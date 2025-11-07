import Bull, { Queue, Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import { ScrapingResult } from './BaseScraper';

export interface ScrapingJobData {
  source: string;
  url: string;
  type: 'full_scrape' | 'incremental' | 'single_page';
  priority?: number;
  metadata?: Record<string, any>;
}

export interface ScrapingJobResult extends ScrapingResult {
  jobId: string;
  source: string;
  processedAt: Date;
}

export class ScrapingQueue {
  private queue: Queue<ScrapingJobData>;
  private redis: Redis;

  constructor(redisConfig?: any) {
    // Initialize Redis connection
    this.redis = new Redis(redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    // Initialize Bull queue
    this.queue = new Bull<ScrapingJobData>('scraping-jobs', {
      redis: redisConfig || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100,    // Keep last 100 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.queue.on('completed', (job: Job<ScrapingJobData>, _result: ScrapingJobResult) => {
      console.log(`Scraping job ${job.id} completed for source: ${job.data.source}`);
    });

    this.queue.on('failed', (job: Job<ScrapingJobData>, err: Error) => {
      console.error(`Scraping job ${job.id} failed for source: ${job.data.source}`, err.message);
    });

    this.queue.on('stalled', (job: Job<ScrapingJobData>) => {
      console.warn(`Scraping job ${job.id} stalled for source: ${job.data.source}`);
    });

    this.queue.on('progress', (job: Job<ScrapingJobData>, progress: number) => {
      console.log(`Scraping job ${job.id} progress: ${progress}% for source: ${job.data.source}`);
    });
  }

  async addJob(
    jobData: ScrapingJobData,
    options?: JobOptions
  ): Promise<Job<ScrapingJobData>> {
    const jobOptions: JobOptions = {
      priority: jobData.priority || 0,
      delay: 0,
      ...options,
    };

    // Add job to queue
    const job = await this.queue.add(jobData, jobOptions);
    console.log(`Added scraping job ${job.id} for source: ${jobData.source}`);
    
    return job;
  }

  async addRecurringJob(
    name: string,
    jobData: ScrapingJobData,
    cronExpression: string,
    options?: JobOptions
  ): Promise<void> {
    await this.queue.add(jobData, {
      repeat: { cron: cronExpression },
      ...options,
    });
    console.log(`Added recurring scraping job "${name}" with cron: ${cronExpression}`);
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    console.log('Scraping queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    console.log('Scraping queue resumed');
  }

  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return await this.queue.getJobCounts();
  }

  async getJobs(
    types: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>,
    start = 0,
    end = -1
  ): Promise<Job<ScrapingJobData>[]> {
    return await this.queue.getJobs(types, start, end);
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`Removed scraping job ${jobId}`);
    }
  }

  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.queue.getFailed();
    for (const job of failedJobs) {
      await job.retry();
    }
    console.log(`Retried ${failedJobs.length} failed jobs`);
  }

  async cleanQueue(grace: number = 0): Promise<void> {
    await this.queue.clean(grace, 'completed');
    await this.queue.clean(grace, 'failed');
    console.log('Queue cleaned');
  }

  async getQueueHealth(): Promise<{
    isHealthy: boolean;
    activeJobs: number;
    waitingJobs: number;
    failedJobs: number;
    completedJobs: number;
  }> {
    try {
      const counts = await this.getJobCounts();
      return {
        isHealthy: true,
        activeJobs: counts.active,
        waitingJobs: counts.waiting,
        failedJobs: counts.failed,
        completedJobs: counts.completed,
      };
    } catch (error) {
      return {
        isHealthy: false,
        activeJobs: 0,
        waitingJobs: 0,
        failedJobs: 0,
        completedJobs: 0,
      };
    }
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.redis.disconnect();
    console.log('Scraping queue closed');
  }

  getQueue(): Queue<ScrapingJobData> {
    return this.queue;
  }
}