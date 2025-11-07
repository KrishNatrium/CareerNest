import { cacheService } from './CacheService'
import { pool } from '../config/database'

export interface WarmingStrategy {
  key: string
  query: string
  ttl: number
  tags?: string[]
  enabled: boolean
}

export class CacheWarmingService {
  private static instance: CacheWarmingService
  private warmingStrategies: WarmingStrategy[] = []
  private isWarming = false

  private constructor() {
    this.initializeStrategies()
  }

  public static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService()
    }
    return CacheWarmingService.instance
  }

  /**
   * Initialize default warming strategies
   */
  private initializeStrategies(): void {
    this.warmingStrategies = [
      {
        key: 'popular_locations',
        query: `
          SELECT location, COUNT(*) as count 
          FROM internships 
          WHERE is_active = true AND location IS NOT NULL 
          GROUP BY location 
          ORDER BY count DESC 
          LIMIT 20
        `,
        ttl: 3600, // 1 hour
        tags: ['locations', 'popular'],
        enabled: true
      },
      {
        key: 'popular_companies',
        query: `
          SELECT company_name, COUNT(*) as count 
          FROM internships 
          WHERE is_active = true 
          GROUP BY company_name 
          ORDER BY count DESC 
          LIMIT 50
        `,
        ttl: 7200, // 2 hours
        tags: ['companies', 'popular'],
        enabled: true
      },
      {
        key: 'popular_skills',
        query: `
          SELECT skill, COUNT(*) as count 
          FROM (
            SELECT UNNEST(required_skills) as skill 
            FROM internships 
            WHERE is_active = true AND required_skills IS NOT NULL
          ) skills_expanded 
          GROUP BY skill 
          ORDER BY count DESC 
          LIMIT 30
        `,
        ttl: 3600, // 1 hour
        tags: ['skills', 'popular'],
        enabled: true
      },
      {
        key: 'recent_internships',
        query: `
          SELECT * FROM internships 
          WHERE is_active = true 
          ORDER BY created_at DESC 
          LIMIT 100
        `,
        ttl: 1800, // 30 minutes
        tags: ['internships', 'recent'],
        enabled: true
      },
      {
        key: 'high_stipend_internships',
        query: `
          SELECT * FROM internships 
          WHERE is_active = true AND stipend > 0 
          ORDER BY stipend DESC 
          LIMIT 50
        `,
        ttl: 3600, // 1 hour
        tags: ['internships', 'high_stipend'],
        enabled: true
      },
      {
        key: 'internship_stats',
        query: `
          SELECT 
            COUNT(*) as total_internships,
            COUNT(CASE WHEN stipend > 0 THEN 1 END) as paid_internships,
            COUNT(CASE WHEN work_type = 'remote' THEN 1 END) as remote_internships,
            AVG(CASE WHEN stipend > 0 THEN stipend END) as avg_stipend,
            COUNT(DISTINCT company_name) as total_companies,
            COUNT(DISTINCT location) as total_locations
          FROM internships 
          WHERE is_active = true
        `,
        ttl: 1800, // 30 minutes
        tags: ['stats', 'dashboard'],
        enabled: true
      }
    ]
  }

  /**
   * Add a custom warming strategy
   */
  addStrategy(strategy: WarmingStrategy): void {
    this.warmingStrategies.push(strategy)
  }

  /**
   * Remove a warming strategy
   */
  removeStrategy(key: string): boolean {
    const index = this.warmingStrategies.findIndex(s => s.key === key)
    if (index !== -1) {
      this.warmingStrategies.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Enable/disable a warming strategy
   */
  toggleStrategy(key: string, enabled: boolean): boolean {
    const strategy = this.warmingStrategies.find(s => s.key === key)
    if (strategy) {
      strategy.enabled = enabled
      return true
    }
    return false
  }

  /**
   * Warm cache for a specific strategy
   */
  async warmStrategy(strategy: WarmingStrategy): Promise<boolean> {
    try {
      console.log(`🔥 Warming cache for: ${strategy.key}`)
      
      const client = await pool.connect()
      const result = await client.query(strategy.query)
      client.release()

      const success = await cacheService.setWithTags(
        strategy.key,
        result.rows,
        strategy.tags || [],
        { ttl: strategy.ttl }
      )

      if (success) {
        console.log(`✅ Cache warmed for: ${strategy.key} (${result.rows.length} records)`)
      } else {
        console.warn(`⚠️ Failed to warm cache for: ${strategy.key}`)
      }

      return success
    } catch (error) {
      console.error(`❌ Error warming cache for ${strategy.key}:`, error)
      return false
    }
  }

  /**
   * Warm all enabled strategies
   */
  async warmAll(): Promise<{ success: number; failed: number }> {
    if (this.isWarming) {
      console.log('Cache warming already in progress')
      return { success: 0, failed: 0 }
    }

    this.isWarming = true
    console.log('🔥 Starting cache warming process...')

    let success = 0
    let failed = 0

    try {
      const enabledStrategies = this.warmingStrategies.filter(s => s.enabled)
      
      for (const strategy of enabledStrategies) {
        const result = await this.warmStrategy(strategy)
        if (result) {
          success++
        } else {
          failed++
        }
      }

      console.log(`🔥 Cache warming completed: ${success} success, ${failed} failed`)
    } catch (error) {
      console.error('❌ Cache warming process error:', error)
      failed++
    } finally {
      this.isWarming = false
    }

    return { success, failed }
  }

  /**
   * Warm cache for popular searches
   */
  async warmPopularSearches(): Promise<boolean> {
    try {
      // Get popular search terms from application logs or user behavior
      const popularSearches = [
        { keywords: 'software developer', location: 'bangalore' },
        { keywords: 'data science', location: 'mumbai' },
        { keywords: 'web development', location: 'delhi' },
        { keywords: 'machine learning', location: 'pune' },
        { keywords: 'mobile app', location: 'hyderabad' },
        { keywords: 'ui ux design', location: 'chennai' },
        { keywords: 'digital marketing', location: 'gurgaon' },
        { keywords: 'content writing', location: 'noida' }
      ]

      let warmedCount = 0

      for (const search of popularSearches) {
        const cacheKey = `search:${search.keywords}:${search.location}`
        
        // Check if already cached
        const exists = await cacheService.exists(cacheKey)
        if (exists) {
          continue
        }

        // Execute search query
        const client = await pool.connect()
        const query = `
          SELECT * FROM internships 
          WHERE is_active = true 
          AND (
            title ILIKE $1 
            OR description ILIKE $1 
            OR company_name ILIKE $1
            OR $2 = ANY(required_skills)
          )
          AND location ILIKE $3
          ORDER BY created_at DESC 
          LIMIT 20
        `
        
        const result = await client.query(query, [
          `%${search.keywords}%`,
          search.keywords,
          `%${search.location}%`
        ])
        client.release()

        // Cache the results
        await cacheService.setWithTags(
          cacheKey,
          result.rows,
          ['search', 'popular', search.location],
          { ttl: 1800 } // 30 minutes
        )

        warmedCount++
      }

      console.log(`🔥 Warmed ${warmedCount} popular searches`)
      return true
    } catch (error) {
      console.error('❌ Error warming popular searches:', error)
      return false
    }
  }

  /**
   * Warm user-specific caches
   */
  async warmUserCache(userId: number): Promise<boolean> {
    try {
      // Get user preferences
      const client = await pool.connect()
      
      const userQuery = `
        SELECT u.*, up.preferred_locations, up.min_stipend, up.work_type,
               array_agg(us.skill_name) as skills
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        LEFT JOIN user_skills us ON u.id = us.user_id
        WHERE u.id = $1
        GROUP BY u.id, up.preferred_locations, up.min_stipend, up.work_type
      `
      
      const userResult = await client.query(userQuery, [userId])
      
      if (userResult.rows.length === 0) {
        client.release()
        return false
      }

      const user = userResult.rows[0]
      
      // Warm recommendations cache
      const recommendationsQuery = `
        SELECT i.*, 
               CASE 
                 WHEN $2::text[] && i.required_skills THEN 3
                 WHEN i.location = ANY($3::text[]) THEN 2
                 ELSE 1
               END as relevance_score
        FROM internships i
        WHERE i.is_active = true
        AND (
          $2::text[] && i.required_skills
          OR i.location = ANY($3::text[])
          OR ($4 > 0 AND i.stipend >= $4)
        )
        ORDER BY relevance_score DESC, i.created_at DESC
        LIMIT 50
      `
      
      const recommendationsResult = await client.query(recommendationsQuery, [
        userId,
        user.skills || [],
        user.preferred_locations || [],
        user.min_stipend || 0
      ])
      
      client.release()

      // Cache user recommendations
      const cacheKey = `user_recommendations:${userId}`
      await cacheService.setWithTags(
        cacheKey,
        recommendationsResult.rows,
        ['recommendations', `user:${userId}`],
        { ttl: 3600 } // 1 hour
      )

      console.log(`🔥 Warmed cache for user ${userId}`)
      return true
    } catch (error) {
      console.error(`❌ Error warming user cache for ${userId}:`, error)
      return false
    }
  }

  /**
   * Get warming statistics
   */
  async getWarmingStats(): Promise<{
    totalStrategies: number
    enabledStrategies: number
    isWarming: boolean
    lastWarmingTime?: Date
  }> {
    return {
      totalStrategies: this.warmingStrategies.length,
      enabledStrategies: this.warmingStrategies.filter(s => s.enabled).length,
      isWarming: this.isWarming
    }
  }

  /**
   * Schedule automatic cache warming
   */
  scheduleWarming(intervalMinutes: number = 60): void {
    setInterval(async () => {
      console.log('🔥 Scheduled cache warming started')
      await this.warmAll()
      await this.warmPopularSearches()
    }, intervalMinutes * 60 * 1000)

    console.log(`🔥 Cache warming scheduled every ${intervalMinutes} minutes`)
  }
}

// Export singleton instance
export const cacheWarmingService = CacheWarmingService.getInstance()