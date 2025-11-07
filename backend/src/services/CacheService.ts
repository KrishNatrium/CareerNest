import { redisClient, isRedisAvailable } from '../config/redis'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
}

export class CacheService {
  private static instance: CacheService
  private defaultTTL = 3600 // 1 hour default
  private keyPrefix = 'internship_aggregator:'

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.keyPrefix
    return `${keyPrefix}${key}`
  }

  /**
   * Set cache value
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!isRedisAvailable()) {
      console.warn('Redis not available, skipping cache set')
      return false
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix)
      const ttl = options.ttl || this.defaultTTL
      const serializedValue = JSON.stringify(value)

      await redisClient.setEx(cacheKey, ttl, serializedValue)
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!isRedisAvailable()) {
      return null
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix)
      const value = await redisClient.get(cacheKey)
      
      if (value === null) {
        return null
      }

      return JSON.parse(value) as T
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix)
      const result = await redisClient.del(cacheKey)
      return result > 0
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix)
      const result = await redisClient.exists(cacheKey)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Get or set cache value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = await this.get<T>(key, options)
    if (cachedValue !== null) {
      return cachedValue
    }

    // If not in cache, fetch and set
    const value = await fetchFunction()
    await this.set(key, value, options)
    return value
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    if (!isRedisAvailable()) {
      return 0
    }

    try {
      const searchPattern = this.generateKey(pattern, options.prefix)
      const keys = await redisClient.keys(searchPattern)
      
      if (keys.length === 0) {
        return 0
      }

      const result = await redisClient.del(keys)
      return result
    } catch (error) {
      console.error('Cache invalidate pattern error:', error)
      return 0
    }
  }

  /**
   * Set cache with tags for group invalidation
   */
  async setWithTags(
    key: string,
    value: any,
    tags: string[],
    options: CacheOptions = {}
  ): Promise<boolean> {
    const success = await this.set(key, value, options)
    
    if (success && tags.length > 0) {
      // Store key-tag relationships
      for (const tag of tags) {
        const tagKey = this.generateKey(`tag:${tag}`, options.prefix)
        await redisClient.sAdd(tagKey, this.generateKey(key, options.prefix))
        
        // Set TTL for tag keys (longer than data TTL)
        const tagTTL = (options.ttl || this.defaultTTL) * 2
        await redisClient.expire(tagKey, tagTTL)
      }
    }

    return success
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[], options: CacheOptions = {}): Promise<number> {
    if (!isRedisAvailable()) {
      return 0
    }

    try {
      let totalDeleted = 0

      for (const tag of tags) {
        const tagKey = this.generateKey(`tag:${tag}`, options.prefix)
        const keys = await redisClient.sMembers(tagKey)
        
        if (keys.length > 0) {
          const deleted = await redisClient.del(keys)
          totalDeleted += deleted
        }

        // Delete the tag key itself
        await redisClient.del(tagKey)
      }

      return totalDeleted
    } catch (error) {
      console.error('Cache invalidate by tags error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean
    keyCount: number
    memoryUsage: string
    hitRate?: number
  }> {
    if (!isRedisAvailable()) {
      return {
        connected: false,
        keyCount: 0,
        memoryUsage: '0B'
      }
    }

    try {
      const info = await redisClient.info('memory')
      const keyCount = await redisClient.dbSize()
      
      // Extract memory usage from info
      const memoryMatch = info.match(/used_memory_human:(.+)/)
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : '0B'

      return {
        connected: true,
        keyCount,
        memoryUsage
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        connected: false,
        keyCount: 0,
        memoryUsage: '0B'
      }
    }
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      await redisClient.flushDb()
      return true
    } catch (error) {
      console.error('Cache flush error:', error)
      return false
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance()