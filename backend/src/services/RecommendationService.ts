import { pool } from '../config/database'
import { UserModel } from '../models/User'
import { Internship } from '../types/internship.types'
import { UserWithDetails, ProficiencyLevel } from '../types/user.types'

export interface RecommendationScore {
  internship_id: number
  score: number
  skill_match_score: number
  location_match_score: number
  preference_match_score: number
  explanation: string[]
}

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

export class RecommendationService {
  private static readonly SKILL_WEIGHTS = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4
  }

  private static readonly LOCATION_WEIGHT = 0.3
  private static readonly SKILL_WEIGHT = 0.5
  private static readonly PREFERENCE_WEIGHT = 0.2

  /**
   * Generate personalized recommendations for a user
   */
  static async generateRecommendations(
    userId: number, 
    filters: RecommendationFilters = {}
  ): Promise<RecommendationResult[]> {
    const { limit = 20, min_score = 0.1, exclude_applied = true } = filters

    // Get user details with skills and preferences
    const user = await UserModel.findByIdWithDetails(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // If user has no skills or preferences, return fallback recommendations
    if (!user.skills.length && !user.preferences) {
      return await this.getFallbackRecommendations(userId, limit)
    }

    // Get candidate internships
    const candidateInternships = await this.getCandidateInternships(userId, exclude_applied)
    
    // Calculate scores for each internship
    const scoredInternships = await Promise.all(
      candidateInternships.map(internship => 
        this.calculateRecommendationScore(user, internship)
      )
    )

    // Filter by minimum score and sort by score descending
    const filteredRecommendations = scoredInternships
      .filter(item => item.score >= min_score)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return filteredRecommendations
  }

  /**
   * Calculate recommendation score for a user-internship pair
   */
  private static async calculateRecommendationScore(
    user: UserWithDetails,
    internship: Internship
  ): Promise<RecommendationResult> {
    const explanation: string[] = []
    
    // Calculate skill match score
    const skillMatchResult = this.calculateSkillMatch(user.skills, internship.required_skills)
    const skillScore = skillMatchResult.score
    explanation.push(...skillMatchResult.explanations)

    // Calculate location match score
    const locationMatchResult = this.calculateLocationMatch(user, internship)
    const locationScore = locationMatchResult.score
    explanation.push(...locationMatchResult.explanations)

    // Calculate preference match score
    const preferenceMatchResult = this.calculatePreferenceMatch(user.preferences, internship)
    const preferenceScore = preferenceMatchResult.score
    explanation.push(...preferenceMatchResult.explanations)

    // Calculate weighted final score
    const finalScore = (
      skillScore * this.SKILL_WEIGHT +
      locationScore * this.LOCATION_WEIGHT +
      preferenceScore * this.PREFERENCE_WEIGHT
    )

    return {
      internship,
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      explanation
    }
  }

  /**
   * Calculate skill match score between user skills and internship requirements
   */
  private static calculateSkillMatch(
    userSkills: Array<{ skill_name: string; proficiency_level: ProficiencyLevel }>,
    requiredSkills: string[]
  ): { score: number; explanations: string[] } {
    if (!requiredSkills.length) {
      return { score: 0.5, explanations: ['No specific skills required'] }
    }

    if (!userSkills.length) {
      return { score: 0.1, explanations: ['No skills in your profile to match'] }
    }

    const userSkillMap = new Map(
      userSkills.map(skill => [skill.skill_name.toLowerCase(), skill.proficiency_level])
    )

    let totalPossibleScore = 0
    let actualScore = 0
    const matchedSkills: string[] = []
    const missingSkills: string[] = []

    for (const requiredSkill of requiredSkills) {
      const skillKey = requiredSkill.toLowerCase()
      totalPossibleScore += this.SKILL_WEIGHTS.expert // Max possible score per skill
      
      if (userSkillMap.has(skillKey)) {
        const proficiency = userSkillMap.get(skillKey)!
        const skillWeight = this.SKILL_WEIGHTS[proficiency]
        actualScore += skillWeight
        matchedSkills.push(`${requiredSkill} (${proficiency})`)
      } else {
        missingSkills.push(requiredSkill)
      }
    }

    const score = totalPossibleScore > 0 ? actualScore / totalPossibleScore : 0
    const explanations: string[] = []

    if (matchedSkills.length > 0) {
      explanations.push(`Matching skills: ${matchedSkills.join(', ')}`)
    }
    
    if (missingSkills.length > 0 && missingSkills.length <= 3) {
      explanations.push(`Skills to develop: ${missingSkills.join(', ')}`)
    }

    const matchPercentage = Math.round((matchedSkills.length / requiredSkills.length) * 100)
    explanations.push(`${matchPercentage}% skill match`)

    return { score, explanations }
  }

  /**
   * Calculate location match score
   */
  private static calculateLocationMatch(
    user: UserWithDetails,
    internship: Internship
  ): { score: number; explanations: string[] } {
    const explanations: string[] = []

    // If internship is remote, it's always a good match
    if (internship.work_type === 'remote') {
      explanations.push('Remote work available')
      return { score: 1.0, explanations }
    }

    // If user has no location preferences, give neutral score
    if (!user.preferences?.preferred_locations?.length && !user.location) {
      explanations.push('No location preference specified')
      return { score: 0.5, explanations }
    }

    // Check user's current location
    if (user.location && internship.location) {
      if (this.isLocationMatch(user.location, internship.location)) {
        explanations.push(`Matches your location: ${user.location}`)
        return { score: 1.0, explanations }
      }
    }

    // Check preferred locations
    if (user.preferences?.preferred_locations?.length && internship.location) {
      for (const preferredLocation of user.preferences.preferred_locations) {
        if (this.isLocationMatch(preferredLocation, internship.location)) {
          explanations.push(`Matches preferred location: ${preferredLocation}`)
          return { score: 0.9, explanations }
        }
      }
    }

    // If hybrid, give partial credit
    if (internship.work_type === 'hybrid') {
      explanations.push('Hybrid work option available')
      return { score: 0.7, explanations }
    }

    explanations.push('Location may require relocation')
    return { score: 0.2, explanations }
  }

  /**
   * Calculate preference match score (stipend, duration, work type)
   */
  private static calculatePreferenceMatch(
    preferences: any,
    internship: Internship
  ): { score: number; explanations: string[] } {
    if (!preferences) {
      return { score: 0.5, explanations: ['No preferences set'] }
    }

    const explanations: string[] = []
    let score = 0.5 // Base score
    let factors = 0

    // Check stipend preference
    if (preferences.min_stipend && internship.stipend) {
      factors++
      if (internship.stipend >= preferences.min_stipend) {
        score += 0.3
        explanations.push(`Meets minimum stipend requirement (₹${preferences.min_stipend})`)
      } else {
        score -= 0.2
        explanations.push(`Below preferred stipend (₹${preferences.min_stipend})`)
      }
    }

    // Check duration preference
    if (preferences.max_duration_months && internship.duration_months) {
      factors++
      if (internship.duration_months <= preferences.max_duration_months) {
        score += 0.2
        explanations.push(`Duration fits preference (≤${preferences.max_duration_months} months)`)
      } else {
        score -= 0.1
        explanations.push(`Longer than preferred duration (${preferences.max_duration_months} months)`)
      }
    }

    // Check work type preference
    if (preferences.work_type && preferences.work_type !== 'any') {
      factors++
      if (internship.work_type === preferences.work_type) {
        score += 0.3
        explanations.push(`Matches work type preference: ${preferences.work_type}`)
      } else if (internship.work_type === 'hybrid' && preferences.work_type === 'remote') {
        score += 0.1
        explanations.push('Hybrid work available (close to remote preference)')
      } else {
        score -= 0.1
        explanations.push(`Different work type: ${internship.work_type}`)
      }
    }

    // Normalize score if we had factors to consider
    if (factors === 0) {
      explanations.push('No specific preferences to match')
    }

    return { score: Math.max(0, Math.min(1, score)), explanations }
  }

  /**
   * Check if two locations match (fuzzy matching)
   */
  private static isLocationMatch(location1: string, location2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim()
    const loc1 = normalize(location1)
    const loc2 = normalize(location2)

    // Exact match
    if (loc1 === loc2) return true

    // Check if one contains the other
    if (loc1.includes(loc2) || loc2.includes(loc1)) return true

    // Check for common city/state patterns
    const extractCity = (location: string) => {
      const parts = location.split(',')
      return parts[0].trim().toLowerCase()
    }

    return extractCity(loc1) === extractCity(loc2)
  }

  /**
   * Get candidate internships for recommendation (excluding already applied)
   */
  private static async getCandidateInternships(
    userId: number,
    excludeApplied: boolean = true
  ): Promise<Internship[]> {
    const client = await pool.connect()
    try {
      let query = `
        SELECT i.* FROM internships i
        WHERE i.is_active = true
        AND (i.application_deadline IS NULL OR i.application_deadline > NOW())
      `
      const values: any[] = []

      if (excludeApplied) {
        query += `
          AND i.id NOT IN (
            SELECT internship_id FROM user_applications 
            WHERE user_id = $1
          )
        `
        values.push(userId)
      }

      query += ' ORDER BY i.posted_date DESC LIMIT 200'

      const result = await client.query(query, values)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get fallback recommendations for users with limited profile data
   */
  private static async getFallbackRecommendations(
    userId: number,
    limit: number
  ): Promise<RecommendationResult[]> {
    const client = await pool.connect()
    try {
      // Get recent, popular internships
      const query = `
        SELECT i.* FROM internships i
        WHERE i.is_active = true
        AND (i.application_deadline IS NULL OR i.application_deadline > NOW())
        AND i.id NOT IN (
          SELECT internship_id FROM user_applications 
          WHERE user_id = $1
        )
        ORDER BY i.posted_date DESC, i.created_at DESC
        LIMIT $2
      `

      const result = await client.query(query, [userId, limit])
      
      return result.rows.map((internship: Internship) => ({
        internship,
        score: 0.5, // Neutral score for fallback recommendations
        explanation: [
          'Popular recent internship',
          'Complete your profile for better recommendations'
        ]
      }))
    } finally {
      client.release()
    }
  }

  /**
   * Get recommendations for multiple users (batch processing)
   */
  static async generateBatchRecommendations(
    userIds: number[],
    filters: RecommendationFilters = {}
  ): Promise<Map<number, RecommendationResult[]>> {
    const results = new Map<number, RecommendationResult[]>()
    
    for (const userId of userIds) {
      try {
        const recommendations = await this.generateRecommendations(userId, filters)
        results.set(userId, recommendations)
      } catch (error) {
        console.error(`Failed to generate recommendations for user ${userId}:`, error)
        results.set(userId, [])
      }
    }

    return results
  }

  /**
   * Update recommendation scores based on user feedback
   */
  static async recordFeedback(
    userId: number,
    internshipId: number,
    feedback: 'helpful' | 'not_helpful' | 'applied'
  ): Promise<void> {
    const client = await pool.connect()
    try {
      // Store feedback for future ML improvements
      const query = `
        INSERT INTO recommendation_feedback (user_id, internship_id, feedback_type, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, internship_id) 
        DO UPDATE SET feedback_type = EXCLUDED.feedback_type, updated_at = NOW()
      `
      
      await client.query(query, [userId, internshipId, feedback])
    } catch (error) {
      // If table doesn't exist yet, just log the error
      console.warn('Recommendation feedback table not available:', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      client.release()
    }
  }
}