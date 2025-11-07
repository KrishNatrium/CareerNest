import api from './api'
import { Internship } from '../types/internship.types'

export interface RecommendationResult {
  internship: Internship
  score: number
  explanation: string[]
}

export interface RecommendationFilters {
  limit?: number
  min_score?: number
  exclude_applied?: boolean
}

export interface RecommendationStats {
  total_recommendations: number
  high_score_count: number
  medium_score_count: number
  low_score_count: number
  average_score: number
  top_companies: Array<{ company: string; count: number }>
  top_locations: Array<{ location: string; count: number }>
}

export interface RecommendationExplanation {
  internship_id: number
  score: number
  explanation: string[]
}

export type FeedbackType = 'helpful' | 'not_helpful' | 'applied'

class RecommendationService {
  /**
   * Get personalized recommendations for the current user
   */
  async getRecommendations(filters: RecommendationFilters = {}): Promise<RecommendationResult[]> {
    try {
      const params = new URLSearchParams()
      
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.min_score !== undefined) params.append('min_score', filters.min_score.toString())
      if (filters.exclude_applied !== undefined) params.append('exclude_applied', filters.exclude_applied.toString())

      const response = await api.get(`/recommendations?${params.toString()}`)
      
      if (response.data.success) {
        return response.data.data.recommendations
      } else {
        throw new Error(response.data.error?.message || 'Failed to get recommendations')
      }
    } catch (error: any) {
      console.error('Error getting recommendations:', error)
      throw new Error(error.response?.data?.error?.message || 'Failed to get recommendations')
    }
  }

  /**
   * Record user feedback on a recommendation
   */
  async recordFeedback(internshipId: number, feedback: FeedbackType): Promise<void> {
    try {
      const response = await api.post('/recommendations/feedback', {
        internship_id: internshipId,
        feedback
      })
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to record feedback')
      }
    } catch (error: any) {
      console.error('Error recording feedback:', error)
      throw new Error(error.response?.data?.error?.message || 'Failed to record feedback')
    }
  }

  /**
   * Get explanation for why an internship was recommended
   */
  async getRecommendationExplanation(internshipId: number): Promise<RecommendationExplanation> {
    try {
      const response = await api.get(`/recommendations/explanation/${internshipId}`)
      
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.error?.message || 'Failed to get explanation')
      }
    } catch (error: any) {
      console.error('Error getting recommendation explanation:', error)
      throw new Error(error.response?.data?.error?.message || 'Failed to get explanation')
    }
  }

  /**
   * Get recommendation statistics for the current user
   */
  async getRecommendationStats(): Promise<RecommendationStats> {
    try {
      const response = await api.get('/recommendations/stats')
      
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.error?.message || 'Failed to get stats')
      }
    } catch (error: any) {
      console.error('Error getting recommendation stats:', error)
      throw new Error(error.response?.data?.error?.message || 'Failed to get stats')
    }
  }
}

export default new RecommendationService()