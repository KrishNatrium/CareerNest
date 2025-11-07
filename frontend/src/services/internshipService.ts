import api from './api'
import {
  Internship,
  InternshipSearchFilters,
  InternshipSearchResult,
  SearchSuggestion,
  PopularSearch,
  FilterOptions,
  InternshipStats
} from '../types/internship.types'

export class InternshipService {
  /**
   * Search internships with filters
   */
  static async searchInternships(filters: InternshipSearchFilters): Promise<InternshipSearchResult> {
    const params = new URLSearchParams()
    
    // Add filters to params
    if (filters.keywords) params.append('keywords', filters.keywords)
    if (filters.location) params.append('location', filters.location)
    if (filters.company) params.append('company', filters.company)
    if (filters.min_stipend !== undefined) params.append('min_stipend', filters.min_stipend.toString())
    if (filters.max_stipend !== undefined) params.append('max_stipend', filters.max_stipend.toString())
    if (filters.min_duration !== undefined) params.append('min_duration', filters.min_duration.toString())
    if (filters.max_duration !== undefined) params.append('max_duration', filters.max_duration.toString())
    if (filters.work_type) params.append('work_type', filters.work_type)
    if (filters.skills && filters.skills.length > 0) params.append('skills', filters.skills.join(','))
    if (filters.posted_after) params.append('posted_after', filters.posted_after)
    if (filters.deadline_before) params.append('deadline_before', filters.deadline_before)
    if (filters.source_website) params.append('source_website', filters.source_website)
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.sort_order) params.append('sort_order', filters.sort_order)

    const response = await api.get(`/internships?${params.toString()}`)
    return response.data.data
  }

  /**
   * Get single internship by ID
   */
  static async getInternshipById(id: number): Promise<Internship> {
    const response = await api.get(`/internships/${id}`)
    return response.data.data
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSearchSuggestions(
    query: string, 
    type?: 'keyword' | 'location' | 'company' | 'skill'
  ): Promise<SearchSuggestion[]> {
    const params = new URLSearchParams({ q: query })
    if (type) params.append('type', type)

    const response = await api.get(`/internships/search/suggestions?${params.toString()}`)
    return response.data.data
  }

  /**
   * Get popular searches
   */
  static async getPopularSearches(limit: number = 10): Promise<PopularSearch[]> {
    const response = await api.get(`/internships/search/popular?limit=${limit}`)
    return response.data.data
  }

  /**
   * Get filter options for UI
   */
  static async getFilterOptions(): Promise<FilterOptions> {
    const response = await api.get('/internships/filters/options')
    return response.data.data
  }

  /**
   * Get internship statistics
   */
  static async getInternshipStats(): Promise<InternshipStats> {
    const response = await api.get('/internships/stats/overview')
    return response.data.data
  }

  /**
   * Get recent internships
   */
  static async getRecentInternships(days: number = 7, limit: number = 20): Promise<Internship[]> {
    const response = await api.get(`/internships/recent/list?days=${days}&limit=${limit}`)
    return response.data.data
  }

  /**
   * Get internships with upcoming deadlines
   */
  static async getUpcomingDeadlines(days: number = 7): Promise<Internship[]> {
    const response = await api.get(`/internships/deadlines/upcoming?days=${days}`)
    return response.data.data
  }
}