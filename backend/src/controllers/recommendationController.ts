import { Request, Response } from 'express'
import { RecommendationService } from '../services/RecommendationService'

export class RecommendationController {
  /**
   * Get personalized recommendations for the authenticated user
   */
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const { 
        limit = 20, 
        min_score = 0.1, 
        exclude_applied = true 
      } = req.query

      const recommendations = await RecommendationService.generateRecommendations(userId, {
        limit: parseInt(limit as string),
        min_score: parseFloat(min_score as string),
        exclude_applied: exclude_applied === 'true'
      })

      res.json({
        success: true,
        data: {
          recommendations,
          total_count: recommendations.length,
          user_id: userId
        }
      })
    } catch (error) {
      console.error('Error getting recommendations:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: 'Failed to generate recommendations',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Record user feedback on a recommendation
   */
  static async recordFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const { internship_id, feedback } = req.body

      // Validate input
      if (!internship_id || !feedback) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: 'internship_id and feedback are required'
          }
        })
        return
      }

      if (!['helpful', 'not_helpful', 'applied'].includes(feedback)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feedback type',
            details: 'feedback must be one of: helpful, not_helpful, applied'
          }
        })
        return
      }

      await RecommendationService.recordFeedback(userId, internship_id, feedback)

      res.json({
        success: true,
        message: 'Feedback recorded successfully'
      })
    } catch (error) {
      console.error('Error recording feedback:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'FEEDBACK_ERROR',
          message: 'Failed to record feedback',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Get recommendation explanation for a specific internship
   */
  static async getRecommendationExplanation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const internshipId = parseInt(req.params.internshipId)

      if (!internshipId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid internship ID'
          }
        })
        return
      }

      // Generate recommendations with limit 1 to get explanation for specific internship
      const recommendations = await RecommendationService.generateRecommendations(userId, {
        limit: 200, // Get more to find the specific internship
        min_score: 0
      })

      const targetRecommendation = recommendations.find(
        rec => rec.internship.id === internshipId
      )

      if (!targetRecommendation) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Recommendation not found for this internship'
          }
        })
        return
      }

      res.json({
        success: true,
        data: {
          internship_id: internshipId,
          score: targetRecommendation.score,
          explanation: targetRecommendation.explanation
        }
      })
    } catch (error) {
      console.error('Error getting recommendation explanation:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPLANATION_ERROR',
          message: 'Failed to get recommendation explanation',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Get recommendation statistics for the user
   */
  static async getRecommendationStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id

      // Get all recommendations to calculate stats
      const recommendations = await RecommendationService.generateRecommendations(userId, {
        limit: 100,
        min_score: 0
      })

      const stats = {
        total_recommendations: recommendations.length,
        high_score_count: recommendations.filter(r => r.score >= 0.7).length,
        medium_score_count: recommendations.filter(r => r.score >= 0.4 && r.score < 0.7).length,
        low_score_count: recommendations.filter(r => r.score < 0.4).length,
        average_score: recommendations.length > 0 
          ? recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length 
          : 0,
        top_companies: RecommendationController.getTopCompanies(recommendations),
        top_locations: RecommendationController.getTopLocations(recommendations)
      }

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      console.error('Error getting recommendation stats:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get recommendation statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Helper method to get top companies from recommendations
   */
  private static getTopCompanies(recommendations: any[]): Array<{company: string, count: number}> {
    const companyCounts = new Map<string, number>()
    
    recommendations.forEach(rec => {
      const company = rec.internship.company_name
      companyCounts.set(company, (companyCounts.get(company) || 0) + 1)
    })

    return Array.from(companyCounts.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * Helper method to get top locations from recommendations
   */
  private static getTopLocations(recommendations: any[]): Array<{location: string, count: number}> {
    const locationCounts = new Map<string, number>()
    
    recommendations.forEach(rec => {
      const location = rec.internship.location || 'Remote'
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
    })

    return Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }
}