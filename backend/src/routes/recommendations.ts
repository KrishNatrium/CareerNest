import { Router } from 'express'
import { RecommendationController } from '../controllers/recommendationController'
import { authenticateToken } from '../middleware/auth'
import { cacheMiddleware, invalidateUserCacheMiddleware } from '../middleware/cacheMiddleware'

const router = Router()

// All recommendation routes require authentication
router.use(authenticateToken)

// Get personalized recommendations
router.get('/',
  cacheMiddleware({
    ttl: 3600, // 1 hour
    tags: ['recommendations'],
    keyGenerator: (req) => `user_recommendations:${(req as any).user.id}`
  }),
  RecommendationController.getRecommendations
)

// Record feedback on a recommendation
router.post('/feedback',
  invalidateUserCacheMiddleware(),
  RecommendationController.recordFeedback
)

// Get explanation for a specific recommendation
router.get('/explanation/:internshipId',
  cacheMiddleware({
    ttl: 1800, // 30 minutes
    tags: ['recommendations', 'explanations'],
    keyGenerator: (req) => `recommendation_explanation:${(req as any).user.id}:${req.params.internshipId}`
  }),
  RecommendationController.getRecommendationExplanation
)

// Get recommendation statistics
router.get('/stats',
  cacheMiddleware({
    ttl: 3600, // 1 hour
    tags: ['recommendations', 'stats'],
    keyGenerator: (req) => `recommendation_stats:${(req as any).user.id}`
  }),
  RecommendationController.getRecommendationStats
)

export default router