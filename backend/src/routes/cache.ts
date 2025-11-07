import { Router } from 'express'
import { cacheService } from '../services/CacheService'
import { cacheWarmingService } from '../services/CacheWarmingService'
import { sessionService } from '../services/SessionService'
import { isRedisAvailable } from '../config/redis'

const router = Router()

// Get cache statistics
router.get('/stats', async (_req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const cacheStats = await cacheService.getStats()
    const sessionStats = await sessionService.getSessionStats()
    const warmingStats = await cacheWarmingService.getWarmingStats()

    return res.json({
      success: true,
      data: {
        cache: cacheStats,
        sessions: sessionStats,
        warming: warmingStats
      }
    })
  } catch (error) {
    console.error('Cache stats error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    })
  }
})

// Warm cache manually
router.post('/warm', async (_req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const result = await cacheWarmingService.warmAll()
    await cacheWarmingService.warmPopularSearches()

    return res.json({
      success: true,
      data: {
        message: 'Cache warming completed',
        result
      }
    })
  } catch (error) {
    console.error('Cache warming error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    })
  }
})

// Invalidate cache by pattern
router.delete('/pattern/:pattern', async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const { pattern } = req.params
    const deletedCount = await cacheService.invalidatePattern(pattern)

    return res.json({
      success: true,
      data: {
        message: `Invalidated ${deletedCount} cache entries`,
        deletedCount
      }
    })
  } catch (error) {
    console.error('Cache invalidation error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    })
  }
})

// Invalidate cache by tags
router.delete('/tags', async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const { tags } = req.body
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'Tags must be an array'
      })
    }

    const deletedCount = await cacheService.invalidateByTags(tags)

    return res.json({
      success: true,
      data: {
        message: `Invalidated ${deletedCount} cache entries by tags`,
        deletedCount,
        tags
      }
    })
  } catch (error) {
    console.error('Cache invalidation by tags error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache by tags'
    })
  }
})

// Flush all cache
router.delete('/flush', async (_req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const success = await cacheService.flushAll()

    return res.json({
      success,
      data: {
        message: success ? 'All cache flushed successfully' : 'Failed to flush cache'
      }
    })
  } catch (error) {
    console.error('Cache flush error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to flush cache'
    })
  }
})

// Get specific cache key
router.get('/key/:key', async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const { key } = req.params
    const value = await cacheService.get(key)

    return res.json({
      success: true,
      data: {
        key,
        value,
        exists: value !== null
      }
    })
  } catch (error) {
    console.error('Cache get error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get cache key'
    })
  }
})

// Set cache key manually
router.put('/key/:key', async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.json({
        success: false,
        error: 'Redis not available'
      })
    }

    const { key } = req.params
    const { value, ttl = 3600, tags = [] } = req.body

    let success: boolean
    if (tags.length > 0) {
      success = await cacheService.setWithTags(key, value, tags, { ttl })
    } else {
      success = await cacheService.set(key, value, { ttl })
    }

    return res.json({
      success,
      data: {
        message: success ? 'Cache key set successfully' : 'Failed to set cache key',
        key,
        ttl,
        tags
      }
    })
  } catch (error) {
    console.error('Cache set error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to set cache key'
    })
  }
})

export default router