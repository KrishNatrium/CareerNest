import { Router } from 'express';
import { InternshipController } from '../controllers/internshipController';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
// import { authenticateToken } from '../middleware/auth';

const router = Router();

// Search internships with advanced filtering
router.get('/', 
  cacheMiddleware({
    ttl: 300, // 5 minutes
    tags: ['internships', 'search'],
    keyGenerator: (req) => {
      const query = JSON.stringify(req.query)
      return `search:${Buffer.from(query).toString('base64')}`
    }
  }),
  InternshipController.searchInternships
);

// Get search suggestions for autocomplete
router.get('/search/suggestions',
  cacheMiddleware({
    ttl: 1800, // 30 minutes
    tags: ['suggestions', 'search']
  }),
  InternshipController.getSearchSuggestions
);

// Get popular searches
router.get('/search/popular',
  cacheMiddleware({
    ttl: 3600, // 1 hour
    tags: ['popular', 'search']
  }),
  InternshipController.getPopularSearches
);

// Get filter options for UI
router.get('/filters/options',
  cacheMiddleware({
    ttl: 7200, // 2 hours
    tags: ['filters', 'options']
  }),
  InternshipController.getFilterOptions
);

// Get internship statistics
router.get('/stats/overview',
  cacheMiddleware({
    ttl: 1800, // 30 minutes
    tags: ['stats', 'overview']
  }),
  InternshipController.getInternshipStats
);

// Get recent internships
router.get('/recent/list',
  cacheMiddleware({
    ttl: 600, // 10 minutes
    tags: ['internships', 'recent']
  }),
  InternshipController.getRecentInternships
);

// Get internships with upcoming deadlines
router.get('/deadlines/upcoming',
  cacheMiddleware({
    ttl: 3600, // 1 hour
    tags: ['deadlines', 'upcoming']
  }),
  InternshipController.getUpcomingDeadlines
);

// Get single internship by ID (must be last to avoid conflicts)
router.get('/:id',
  cacheMiddleware({
    ttl: 1800, // 30 minutes
    tags: ['internships', 'details'],
    keyGenerator: (req) => `internship:${req.params.id}`
  }),
  InternshipController.getInternshipById
);

export default router;