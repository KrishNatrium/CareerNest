import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../services/CacheService'
import { isRedisAvailable } from '../config/redis'

export interface CacheMiddlewareOptions {
  ttl?: number
  keyGenerator?: (req: Request) => string
  tags?: string[]
  skipCache?: (req: Request) => boolean
}

/**
 * Cache middleware for GET requests
 */
export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Skip cache if Redis is not available
    if (!isRedisAvailable()) {
      return next()
    }

    // Skip cache if condition is met
    if (options.skipCache && options.skipCache(req)) {
      return next()
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultCacheKey(req)

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey)
      
      if (cachedData) {
        // Add cache hit header
        res.set('X-Cache', 'HIT')
        res.set('X-Cache-Key', cacheKey)
        return res.json(cachedData)
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res)
      
      // Override json method to cache the response
      res.json = function(data: any) {
        // Cache the response data
        const ttl = options.ttl || 300 // 5 minutes default
        
        if (options.tags) {
          cacheService.setWithTags(cacheKey, data, options.tags, { ttl })
        } else {
          cacheService.set(cacheKey, data, { ttl })
        }

        // Add cache miss header
        res.set('X-Cache', 'MISS')
        res.set('X-Cache-Key', cacheKey)
        
        // Call original json method
        return originalJson(data)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next()
    }
  }
}

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req: Request): string {
  const baseUrl = req.baseUrl || ''
  const path = req.path || ''
  const query = JSON.stringify(req.query)
  const userId = (req as any).user?.id || 'anonymous'
  
  return `${baseUrl}${path}:${userId}:${Buffer.from(query).toString('base64')}`
}

/**
 * Cache invalidation middleware
 */
export const invalidateCacheMiddleware = (patterns: string[] | ((req: Request) => string[])) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)

    // Override response methods to invalidate cache after successful response
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const invalidationPatterns = typeof patterns === 'function' 
            ? patterns(req) 
            : patterns

          for (const pattern of invalidationPatterns) {
            await cacheService.invalidatePattern(pattern)
          }
        } catch (error) {
          console.error('Cache invalidation error:', error)
        }
      }
    }

    res.json = function(data: any) {
      invalidateCache()
      return originalJson(data)
    }

    res.send = function(data: any) {
      invalidateCache()
      return originalSend(data)
    }

    next()
  }
}

/**
 * Tag-based cache invalidation middleware
 */
export const invalidateCacheByTagsMiddleware = (tags: string[] | ((req: Request) => string[])) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)

    // Override response methods to invalidate cache after successful response
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const invalidationTags = typeof tags === 'function' 
            ? tags(req) 
            : tags

          await cacheService.invalidateByTags(invalidationTags)
        } catch (error) {
          console.error('Cache invalidation by tags error:', error)
        }
      }
    }

    res.json = function(data: any) {
      invalidateCache()
      return originalJson(data)
    }

    res.send = function(data: any) {
      invalidateCache()
      return originalSend(data)
    }

    next()
  }
}

/**
 * User-specific cache invalidation middleware
 */
export const invalidateUserCacheMiddleware = () => {
  return invalidateCacheByTagsMiddleware((req: Request) => {
    const userId = (req as any).user?.id
    return userId ? [`user:${userId}`] : []
  })
}