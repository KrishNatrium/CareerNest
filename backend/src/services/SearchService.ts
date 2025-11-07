import { pool } from '../config/database'
import { cacheService } from './CacheService'
import { CACHE_KEYS, CACHE_TTL } from '../constants/cache'
import { 
  InternshipSearchFilters, 
  InternshipSearchResult
} from '../types/internship.types'
import crypto from 'crypto'

export interface SearchSuggestion {
  text: string
  type: 'keyword' | 'location' | 'company' | 'skill'
  count?: number
}

export interface PopularSearch {
  query: string
  count: number
}

export class SearchService {
  /**
   * Generate cache key for search results
   */
  private static generateCacheKey(filters: InternshipSearchFilters): string {
    const filterString = JSON.stringify(filters)
    const hash = crypto.createHash('md5').update(filterString).digest('hex')
    return `${CACHE_KEYS.INTERNSHIP_SEARCH}${hash}`
  }

  /**
   * Enhanced search with full-text search and caching
   */
  static async searchInternships(filters: InternshipSearchFilters): Promise<InternshipSearchResult> {
    // Try to get from cache first
    const cacheKey = this.generateCacheKey(filters)
    const cachedResult = await cacheService.get<InternshipSearchResult>(cacheKey)
    
    if (cachedResult) {
      // Track popular searches
      if (filters.keywords) {
        await this.trackPopularSearch(filters.keywords)
      }
      return cachedResult
    }

    const client = await pool.connect()
    try {
      const conditions: string[] = ['is_active = true']
      const values: any[] = []
      let paramCount = 1

      // Full-text search with ranking
      if (filters.keywords) {
        const searchQuery = filters.keywords.trim()
        conditions.push(`(
          to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || company_name) 
          @@ plainto_tsquery('english', $${paramCount})
        )`)
        values.push(searchQuery)
        paramCount++
      }

      // Location search with fuzzy matching
      if (filters.location) {
        conditions.push(`(
          location ILIKE $${paramCount} OR
          to_tsvector('english', location) @@ plainto_tsquery('english', $${paramCount + 1})
        )`)
        values.push(`%${filters.location}%`)
        values.push(filters.location)
        paramCount += 2
      }

      // Company search
      if (filters.company) {
        conditions.push(`(
          company_name ILIKE $${paramCount} OR
          to_tsvector('english', company_name) @@ plainto_tsquery('english', $${paramCount + 1})
        )`)
        values.push(`%${filters.company}%`)
        values.push(filters.company)
        paramCount += 2
      }

      // Stipend range
      if (filters.min_stipend !== undefined) {
        conditions.push(`stipend >= $${paramCount}`)
        values.push(filters.min_stipend)
        paramCount++
      }

      if (filters.max_stipend !== undefined) {
        conditions.push(`stipend <= $${paramCount}`)
        values.push(filters.max_stipend)
        paramCount++
      }

      // Duration range
      if (filters.min_duration !== undefined) {
        conditions.push(`duration_months >= $${paramCount}`)
        values.push(filters.min_duration)
        paramCount++
      }

      if (filters.max_duration !== undefined) {
        conditions.push(`duration_months <= $${paramCount}`)
        values.push(filters.max_duration)
        paramCount++
      }

      // Work type
      if (filters.work_type) {
        conditions.push(`work_type = $${paramCount}`)
        values.push(filters.work_type)
        paramCount++
      }

      // Skills matching (array overlap)
      if (filters.skills && filters.skills.length > 0) {
        conditions.push(`required_skills && $${paramCount}`)
        values.push(filters.skills)
        paramCount++
      }

      // Date filters
      if (filters.posted_after) {
        conditions.push(`posted_date >= $${paramCount}`)
        values.push(filters.posted_after)
        paramCount++
      }

      if (filters.deadline_before) {
        conditions.push(`application_deadline <= $${paramCount}`)
        values.push(filters.deadline_before)
        paramCount++
      }

      // Source website
      if (filters.source_website) {
        conditions.push(`source_website = $${paramCount}`)
        values.push(filters.source_website)
        paramCount++
      }

      // Build ORDER BY clause with relevance scoring
      let orderBy = 'posted_date DESC'
      if (filters.sort_by) {
        const sortOrder = (filters.sort_order || 'desc').toUpperCase()
        switch (filters.sort_by) {
          case 'posted_date':
            orderBy = `posted_date ${sortOrder}`
            break
          case 'deadline':
            orderBy = `application_deadline ${sortOrder} NULLS LAST`
            break
          case 'stipend':
            orderBy = `stipend ${sortOrder} NULLS LAST`
            break
          case 'relevance':
            if (filters.keywords) {
              orderBy = `ts_rank(
                to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || company_name), 
                plainto_tsquery('english', $1)
              ) DESC, posted_date DESC`
            }
            break
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM internships ${whereClause}`
      const countResult = await client.query(countQuery, values)
      const totalCount = parseInt(countResult.rows[0].total)

      // Get paginated results
      const limit = Math.min(filters.limit || 20, 100) // Cap at 100
      const offset = filters.offset || 0
      
      const dataQuery = `
        SELECT 
          id,
          title,
          company_name,
          description,
          location,
          stipend,
          duration_months,
          work_type,
          required_skills,
          application_url,
          source_website,
          posted_date,
          application_deadline,
          created_at,
          updated_at
          ${filters.keywords && filters.sort_by === 'relevance' ? 
            `, ts_rank(
              to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || company_name), 
              plainto_tsquery('english', $1)
            ) as relevance_score` : ''
          }
        FROM internships 
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `

      values.push(limit, offset)
      const dataResult = await client.query(dataQuery, values)

      const result: InternshipSearchResult = {
        internships: dataResult.rows,
        total_count: totalCount,
        has_more: offset + limit < totalCount
      }

      // Cache the result
      await cacheService.set(cacheKey, result, { ttl: CACHE_TTL.INTERNSHIP_SEARCH })

      // Track popular searches
      if (filters.keywords) {
        await this.trackPopularSearch(filters.keywords)
      }

      return result
    } finally {
      client.release()
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSearchSuggestions(query: string, type?: 'keyword' | 'location' | 'company' | 'skill'): Promise<SearchSuggestion[]> {
    const cacheKey = `${CACHE_KEYS.SEARCH_SUGGESTIONS}${type || 'all'}:${query.toLowerCase()}`
    const cached = await cacheService.get<SearchSuggestion[]>(cacheKey)
    
    if (cached) {
      return cached
    }

    const client = await pool.connect()
    try {
      const suggestions: SearchSuggestion[] = []
      const searchTerm = `%${query.toLowerCase()}%`

      // Get location suggestions
      if (!type || type === 'location') {
        const locationQuery = `
          SELECT DISTINCT location, COUNT(*) as count
          FROM internships 
          WHERE is_active = true 
          AND location IS NOT NULL 
          AND LOWER(location) LIKE $1
          GROUP BY location
          ORDER BY count DESC, location
          LIMIT 5
        `
        const locationResult = await client.query(locationQuery, [searchTerm])
        locationResult.rows.forEach(row => {
          suggestions.push({
            text: row.location,
            type: 'location',
            count: parseInt(row.count)
          })
        })
      }

      // Get company suggestions
      if (!type || type === 'company') {
        const companyQuery = `
          SELECT DISTINCT company_name, COUNT(*) as count
          FROM internships 
          WHERE is_active = true 
          AND LOWER(company_name) LIKE $1
          GROUP BY company_name
          ORDER BY count DESC, company_name
          LIMIT 5
        `
        const companyResult = await client.query(companyQuery, [searchTerm])
        companyResult.rows.forEach(row => {
          suggestions.push({
            text: row.company_name,
            type: 'company',
            count: parseInt(row.count)
          })
        })
      }

      // Get skill suggestions
      if (!type || type === 'skill') {
        const skillQuery = `
          SELECT DISTINCT skill, COUNT(*) as count
          FROM (
            SELECT UNNEST(required_skills) as skill
            FROM internships 
            WHERE is_active = true
          ) skills
          WHERE LOWER(skill) LIKE $1
          GROUP BY skill
          ORDER BY count DESC, skill
          LIMIT 5
        `
        const skillResult = await client.query(skillQuery, [searchTerm])
        skillResult.rows.forEach(row => {
          suggestions.push({
            text: row.skill,
            type: 'skill',
            count: parseInt(row.count)
          })
        })
      }

      // Get keyword suggestions from titles
      if (!type || type === 'keyword') {
        const keywordQuery = `
          SELECT title, COUNT(*) as count
          FROM internships 
          WHERE is_active = true 
          AND to_tsvector('english', title) @@ plainto_tsquery('english', $1)
          GROUP BY title
          ORDER BY count DESC, title
          LIMIT 3
        `
        const keywordResult = await client.query(keywordQuery, [query])
        keywordResult.rows.forEach(row => {
          suggestions.push({
            text: row.title,
            type: 'keyword',
            count: parseInt(row.count)
          })
        })
      }

      // Sort by relevance and count
      suggestions.sort((a, b) => (b.count || 0) - (a.count || 0))
      const limitedSuggestions = suggestions.slice(0, 10)

      // Cache suggestions
      await cacheService.set(cacheKey, limitedSuggestions, { ttl: CACHE_TTL.SEARCH_SUGGESTIONS })

      return limitedSuggestions
    } finally {
      client.release()
    }
  }

  /**
   * Get popular searches
   */
  static async getPopularSearches(limit: number = 10): Promise<PopularSearch[]> {
    // Simplified implementation - get from cache or return empty array
    const cached = await cacheService.get<PopularSearch[]>(CACHE_KEYS.POPULAR_SEARCHES)
    
    if (cached) {
      return cached.slice(0, limit)
    }

    // Return empty array for now - this would be populated by actual search tracking
    return []
  }

  /**
   * Track popular searches
   */
  private static async trackPopularSearch(query: string): Promise<void> {
    const normalizedQuery = query.toLowerCase().trim()
    if (normalizedQuery.length < 2) return

    // Simplified tracking - just store in cache for now
    const cached = await cacheService.get<PopularSearch[]>(CACHE_KEYS.POPULAR_SEARCHES) || []
    
    // Find existing or create new entry
    const existingIndex = cached.findIndex(item => item.query === normalizedQuery)
    if (existingIndex >= 0) {
      cached[existingIndex].count++
    } else {
      cached.push({ query: normalizedQuery, count: 1 })
    }
    
    // Sort by count and store back
    cached.sort((a, b) => b.count - a.count)
    await cacheService.set(CACHE_KEYS.POPULAR_SEARCHES, cached.slice(0, 50), { ttl: CACHE_TTL.POPULAR_SEARCHES })
  }

  /**
   * Get filter options for UI
   */
  static async getFilterOptions(): Promise<{
    locations: string[]
    companies: string[]
    skills: string[]
    workTypes: string[]
    sources: string[]
  }> {
    const cacheKey = 'filter:options'
    const cached = await cacheService.get<any>(cacheKey)
    
    if (cached) {
      return cached
    }

    const client = await pool.connect()
    try {
      // Get unique locations
      const locationQuery = `
        SELECT DISTINCT location, COUNT(*) as count
        FROM internships 
        WHERE is_active = true AND location IS NOT NULL
        GROUP BY location
        ORDER BY count DESC, location
        LIMIT 50
      `
      const locationResult = await client.query(locationQuery)
      const locations = locationResult.rows.map(row => row.location)

      // Get unique companies
      const companyQuery = `
        SELECT DISTINCT company_name, COUNT(*) as count
        FROM internships 
        WHERE is_active = true
        GROUP BY company_name
        ORDER BY count DESC, company_name
        LIMIT 100
      `
      const companyResult = await client.query(companyQuery)
      const companies = companyResult.rows.map(row => row.company_name)

      // Get unique skills
      const skillQuery = `
        SELECT skill, COUNT(*) as count
        FROM (
          SELECT UNNEST(required_skills) as skill
          FROM internships 
          WHERE is_active = true
        ) skills
        GROUP BY skill
        ORDER BY count DESC, skill
        LIMIT 100
      `
      const skillResult = await client.query(skillQuery)
      const skills = skillResult.rows.map(row => row.skill)

      // Get work types
      const workTypeQuery = `
        SELECT DISTINCT work_type, COUNT(*) as count
        FROM internships 
        WHERE is_active = true
        GROUP BY work_type
        ORDER BY count DESC
      `
      const workTypeResult = await client.query(workTypeQuery)
      const workTypes = workTypeResult.rows.map(row => row.work_type)

      // Get sources
      const sourceQuery = `
        SELECT DISTINCT source_website, COUNT(*) as count
        FROM internships 
        WHERE is_active = true
        GROUP BY source_website
        ORDER BY count DESC
      `
      const sourceResult = await client.query(sourceQuery)
      const sources = sourceResult.rows.map(row => row.source_website)

      const result = {
        locations,
        companies,
        skills,
        workTypes,
        sources
      }

      // Cache for 1 hour
      await cacheService.set(cacheKey, result, { ttl: CACHE_TTL.FILTER_OPTIONS })

      return result
    } finally {
      client.release()
    }
  }

  /**
   * Clear search cache (useful when new internships are added)
   */
  static async clearSearchCache(): Promise<void> {
    await cacheService.invalidatePattern(`${CACHE_KEYS.INTERNSHIP_SEARCH}*`)
    await cacheService.invalidatePattern(`${CACHE_KEYS.SEARCH_SUGGESTIONS}*`)
    await cacheService.delete('filter:options')
  }
}