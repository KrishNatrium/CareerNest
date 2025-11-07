import { Request, Response } from 'express'
import { SearchService } from '../services/SearchService'
import { InternshipModel } from '../models/Internship'
import { cacheService } from '../services/CacheService'
import { CACHE_KEYS, CACHE_TTL } from '../constants/cache'
import { InternshipSearchFilters, WorkType } from '../types/internship.types'

export class InternshipController {
  /**
   * Search internships with advanced filtering and caching
   */
  static async searchInternships(req: Request, res: Response) {
    try {
      const {
        keywords,
        location,
        company,
        min_stipend,
        max_stipend,
        min_duration,
        max_duration,
        work_type,
        skills,
        posted_after,
        deadline_before,
        source_website,
        page = '1',
        limit = '20',
        sort_by = 'posted_date',
        sort_order = 'desc'
      } = req.query

      // Parse and validate parameters
      const pageNum = Math.max(1, parseInt(page as string) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20))
      const offset = (pageNum - 1) * limitNum

      // Build search filters
      const filters: InternshipSearchFilters = {
        limit: limitNum,
        offset,
        sort_by: sort_by as any,
        sort_order: sort_order as 'asc' | 'desc'
      }

      // Add optional filters only if they exist
      if (keywords) filters.keywords = keywords as string
      if (location) filters.location = location as string
      if (company) filters.company = company as string
      if (min_stipend) filters.min_stipend = parseInt(min_stipend as string)
      if (max_stipend) filters.max_stipend = parseInt(max_stipend as string)
      if (min_duration) filters.min_duration = parseInt(min_duration as string)
      if (max_duration) filters.max_duration = parseInt(max_duration as string)
      if (work_type) filters.work_type = work_type as WorkType
      if (skills) filters.skills = (skills as string).split(',').map(s => s.trim()).filter(Boolean)
      if (posted_after) filters.posted_after = new Date(posted_after as string)
      if (deadline_before) filters.deadline_before = new Date(deadline_before as string)
      if (source_website) filters.source_website = source_website as string



      const result = await SearchService.searchInternships(filters)

      return res.json({
        success: true,
        data: {
          internships: result.internships,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total_count,
            totalPages: Math.ceil(result.total_count / limitNum),
            hasMore: result.has_more
          }
        }
      })
    } catch (error) {
      console.error('Error searching internships:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search internships'
        }
      })
    }
  }

  /**
   * Get single internship by ID with caching
   */
  static async getInternshipById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const internshipId = parseInt(id)

      if (isNaN(internshipId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid internship ID'
          }
        })
      }

      // Try cache first
      const cacheKey = `${CACHE_KEYS.INTERNSHIP_DETAILS}${internshipId}`
      let internship = await cacheService.get(cacheKey)

      if (!internship) {
        internship = await InternshipModel.findById(internshipId)
        if (internship) {
          await cacheService.set(cacheKey, internship, { ttl: CACHE_TTL.INTERNSHIP_DETAILS })
        }
      }

      if (!internship) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Internship not found'
          }
        })
      }

      return res.json({
        success: true,
        data: internship
      })
    } catch (error) {
      console.error('Error fetching internship:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch internship'
        }
      })
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSearchSuggestions(req: Request, res: Response) {
    try {
      const { q: query, type } = req.query

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.json({
          success: true,
          data: []
        })
      }

      const suggestions = await SearchService.getSearchSuggestions(
        query.trim(),
        type as 'keyword' | 'location' | 'company' | 'skill'
      )

      return res.json({
        success: true,
        data: suggestions
      })
    } catch (error) {
      console.error('Error getting search suggestions:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Failed to get search suggestions'
        }
      })
    }
  }

  /**
   * Get popular searches
   */
  static async getPopularSearches(_req: Request, res: Response) {
    try {
      const { limit = '10' } = _req.query
      const limitNum = Math.min(20, Math.max(1, parseInt(limit as string) || 10))

      const popularSearches = await SearchService.getPopularSearches(limitNum)

      return res.json({
        success: true,
        data: popularSearches
      })
    } catch (error) {
      console.error('Error getting popular searches:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'POPULAR_SEARCHES_ERROR',
          message: 'Failed to get popular searches'
        }
      })
    }
  }

  /**
   * Get filter options for UI
   */
  static async getFilterOptions(_req: Request, res: Response) {
    try {
      const options = await SearchService.getFilterOptions()

      return res.json({
        success: true,
        data: options
      })
    } catch (error) {
      console.error('Error getting filter options:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'FILTER_OPTIONS_ERROR',
          message: 'Failed to get filter options'
        }
      })
    }
  }

  /**
   * Get internship statistics
   */
  static async getInternshipStats(_req: Request, res: Response) {
    try {
      // Try cache first
      const cacheKey = 'internship:stats'
      let stats = await cacheService.get(cacheKey)

      if (!stats) {
        stats = await InternshipModel.getStats()
        await cacheService.set(cacheKey, stats, { ttl: CACHE_TTL.INTERNSHIP_STATS })
      }

      return res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      console.error('Error fetching internship stats:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to fetch internship statistics'
        }
      })
    }
  }

  /**
   * Get recent internships
   */
  static async getRecentInternships(req: Request, res: Response) {
    try {
      const { days = '7', limit = '20' } = req.query
      const daysNum = Math.min(30, Math.max(1, parseInt(days as string) || 7))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20))

      const cacheKey = `recent:internships:${daysNum}:${limitNum}`
      let internships = await cacheService.get(cacheKey)

      if (!internships) {
        internships = await InternshipModel.findRecent(daysNum, limitNum)
        await cacheService.set(cacheKey, internships, { ttl: CACHE_TTL.RECENT_INTERNSHIPS })
      }

      return res.json({
        success: true,
        data: internships
      })
    } catch (error) {
      console.error('Error fetching recent internships:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'RECENT_ERROR',
          message: 'Failed to fetch recent internships'
        }
      })
    }
  }

  /**
   * Get internships with upcoming deadlines
   */
  static async getUpcomingDeadlines(req: Request, res: Response) {
    try {
      const { days = '7' } = req.query
      const daysNum = Math.min(30, Math.max(1, parseInt(days as string) || 7))

      const cacheKey = `deadlines:upcoming:${daysNum}`
      let internships = await cacheService.get(cacheKey)

      if (!internships) {
        internships = await InternshipModel.findUpcomingDeadlines(daysNum)
        await cacheService.set(cacheKey, internships, { ttl: CACHE_TTL.UPCOMING_DEADLINES })
      }

      return res.json({
        success: true,
        data: internships
      })
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'DEADLINES_ERROR',
          message: 'Failed to fetch upcoming deadlines'
        }
      })
    }
  }
}