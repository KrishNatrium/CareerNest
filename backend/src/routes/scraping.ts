import { Router, Request, Response } from 'express';
import { ScrapingService } from '../services/ScrapingService';
import { ScrapingJobModel } from '../models/ScrapingJob';
import { ScrapingLogger } from '../services/scraping/ScrapingLogger';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get scraping system status
router.get('/status', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    const status = await scrapingService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting scraping status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCRAPING_STATUS_ERROR',
        message: 'Failed to get scraping status'
      }
    });
  }
});

// Add a new scraping job
router.post('/jobs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { source, url, type = 'single_page', priority = 0, delay = 0, metadata = {} } = req.body;

    if (!source || !url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Source and URL are required'
        }
      });
    }

    const scrapingService = ScrapingService.getInstance();
    const jobId = await scrapingService.addScrapingJob(source, url, type, {
      priority,
      delay,
      metadata
    });

    return res.status(201).json({
      success: true,
      data: {
        jobId,
        message: 'Scraping job added successfully'
      }
    });
  } catch (error) {
    console.error('Error adding scraping job:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SCRAPING_JOB_ERROR',
        message: error instanceof Error ? error.message : 'Failed to add scraping job'
      }
    });
  }
});

// Add a recurring scraping job
router.post('/jobs/recurring', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      source, 
      url, 
      cronExpression, 
      type = 'incremental', 
      priority = 0, 
      metadata = {} 
    } = req.body;

    if (!name || !source || !url || !cronExpression) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, source, URL, and cron expression are required'
        }
      });
    }

    const scrapingService = ScrapingService.getInstance();
    await scrapingService.addRecurringJob(name, source, url, cronExpression, type, {
      priority,
      metadata
    });

    return res.status(201).json({
      success: true,
      data: {
        message: 'Recurring scraping job added successfully'
      }
    });
  } catch (error) {
    console.error('Error adding recurring scraping job:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RECURRING_JOB_ERROR',
        message: error instanceof Error ? error.message : 'Failed to add recurring scraping job'
      }
    });
  }
});

// Get scraping jobs
router.get('/jobs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, source, limit = '50' } = req.query;
    let jobs;

    if (status) {
      jobs = await ScrapingJobModel.findByStatus(status as any, parseInt(limit as string));
    } else if (source) {
      jobs = await ScrapingJobModel.findBySource(source as string, parseInt(limit as string));
    } else {
      // Get recent jobs from all sources
      jobs = await ScrapingJobModel.findRecentBySource('', 24);
    }

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Error getting scraping jobs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'JOBS_FETCH_ERROR',
        message: 'Failed to fetch scraping jobs'
      }
    });
  }
});

// Get scraping job statistics
router.get('/jobs/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const stats = await ScrapingJobModel.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting scraping job stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to get scraping job statistics'
      }
    });
  }
});

// Pause scraping processing
router.post('/pause', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    await scrapingService.pauseProcessing();
    
    res.json({
      success: true,
      data: {
        message: 'Scraping processing paused'
      }
    });
  } catch (error) {
    console.error('Error pausing scraping:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAUSE_ERROR',
        message: 'Failed to pause scraping processing'
      }
    });
  }
});

// Resume scraping processing
router.post('/resume', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    await scrapingService.resumeProcessing();
    
    res.json({
      success: true,
      data: {
        message: 'Scraping processing resumed'
      }
    });
  } catch (error) {
    console.error('Error resuming scraping:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESUME_ERROR',
        message: 'Failed to resume scraping processing'
      }
    });
  }
});

// Retry failed jobs
router.post('/jobs/retry-failed', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    await scrapingService.retryFailedJobs();
    
    res.json({
      success: true,
      data: {
        message: 'Failed jobs queued for retry'
      }
    });
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RETRY_ERROR',
        message: 'Failed to retry failed jobs'
      }
    });
  }
});

// Cleanup completed jobs
router.post('/jobs/cleanup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { daysOld = 30 } = req.body;
    
    const deletedCount = await ScrapingJobModel.cleanupOldJobs(daysOld);
    
    res.json({
      success: true,
      data: {
        message: `Cleaned up ${deletedCount} old jobs`,
        deletedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEANUP_ERROR',
        message: 'Failed to cleanup old jobs'
      }
    });
  }
});

// Internshala-specific endpoints
router.post('/internshala/scrape-category', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, location } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category is required'
        }
      });
    }

    const scrapingService = ScrapingService.getInstance();
    const jobId = await scrapingService.scrapeInternshalaCategory(category, location);

    return res.status(201).json({
      success: true,
      data: {
        jobId,
        message: `Internshala ${category} scraping job started`
      }
    });
  } catch (error) {
    console.error('Error starting Internshala category scraping:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNSHALA_SCRAPE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start Internshala scraping'
      }
    });
  }
});

router.post('/internshala/scrape-popular', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    const jobId = await scrapingService.scrapeInternshalaPopularCategories();

    return res.json({
      success: true,
      data: {
        jobId,
        message: 'Internshala popular categories scraping job started'
      }
    });
  } catch (error) {
    console.error('Error starting Internshala popular scraping:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNSHALA_SCRAPE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start Internshala scraping'
      }
    });
  }
});

router.post('/internshala/schedule-recurring', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    await scrapingService.scheduleInternshalaRecurring();

    return res.json({
      success: true,
      data: {
        message: 'Internshala recurring jobs scheduled successfully'
      }
    });
  } catch (error) {
    console.error('Error scheduling Internshala recurring jobs:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to schedule recurring jobs'
      }
    });
  }
});

// LinkedIn-specific endpoints
router.post('/linkedin/scrape-jobs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { keywords, location, experienceLevel, count } = req.body;

    const scrapingService = ScrapingService.getInstance();
    const jobId = await scrapingService.scrapeLinkedInJobs({
      keywords,
      location,
      experienceLevel,
      count
    });

    return res.status(201).json({
      success: true,
      data: {
        jobId,
        message: 'LinkedIn job scraping started'
      }
    });
  } catch (error) {
    console.error('Error starting LinkedIn job scraping:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LINKEDIN_SCRAPE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start LinkedIn scraping'
      }
    });
  }
});

router.post('/linkedin/scrape-internships', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { location } = req.body;

    const scrapingService = ScrapingService.getInstance();
    const jobId = await scrapingService.scrapeLinkedInInternships(location);

    return res.status(201).json({
      success: true,
      data: {
        jobId,
        message: 'LinkedIn internship scraping started'
      }
    });
  } catch (error) {
    console.error('Error starting LinkedIn internship scraping:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LINKEDIN_SCRAPE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start LinkedIn scraping'
      }
    });
  }
});

router.post('/linkedin/schedule-recurring', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    await scrapingService.scheduleLinkedInRecurring();

    return res.json({
      success: true,
      data: {
        message: 'LinkedIn recurring jobs scheduled successfully'
      }
    });
  } catch (error) {
    console.error('Error scheduling LinkedIn recurring jobs:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to schedule recurring jobs'
      }
    });
  }
});

// LinkedIn OAuth endpoints
router.get('/linkedin/auth-url', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const scrapingService = ScrapingService.getInstance();
    const authUrl = await scrapingService.getLinkedInAuthUrl();

    return res.json({
      success: true,
      data: {
        authUrl,
        message: 'LinkedIn OAuth URL generated'
      }
    });
  } catch (error) {
    console.error('Error generating LinkedIn auth URL:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate OAuth URL'
      }
    });
  }
});

router.post('/linkedin/exchange-code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Authorization code is required'
        }
      });
    }

    const scrapingService = ScrapingService.getInstance();
    const accessToken = await scrapingService.exchangeLinkedInCode(code);

    return res.json({
      success: true,
      data: {
        message: 'LinkedIn access token obtained successfully',
        // Don't return the actual token for security
        hasToken: !!accessToken
      }
    });
  } catch (error) {
    console.error('Error exchanging LinkedIn code:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to exchange authorization code'
      }
    });
  }
});

// Logging endpoints
router.get('/logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { source, level, startDate, endDate, limit = '100', offset = '0' } = req.query;
    
    const logger = ScrapingLogger.getInstance();
    const query: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (source) query.source = source as string;
    if (level) query.level = level as string;
    if (startDate) query.startDate = new Date(startDate as string);
    if (endDate) query.endDate = new Date(endDate as string);

    const result = await logger.getLogs(query);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching scraping logs:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOGS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch logs'
      }
    });
  }
});

router.get('/logs/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const logger = ScrapingLogger.getInstance();
    const stats = await logger.getLogStats();

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOG_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch log statistics'
      }
    });
  }
});

router.post('/logs/cleanup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { daysOld = 30 } = req.body;
    
    const logger = ScrapingLogger.getInstance();
    const deletedCount = await logger.cleanupOldLogs(daysOld);

    return res.json({
      success: true,
      data: {
        message: `Cleaned up ${deletedCount} old log entries`,
        deletedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOG_CLEANUP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cleanup logs'
      }
    });
  }
});

export default router;