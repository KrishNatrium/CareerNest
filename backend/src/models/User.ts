import { pool } from '../config/database'
import bcrypt from 'bcryptjs'
import {
  User,
  UserCreateInput,
  UserUpdateInput,
  UserPublic,
  UserSkill,
  UserSkillCreateInput,
  UserSkillUpdateInput,
  UserPreferences,
  UserPreferencesCreateInput,
  UserWithDetails
} from '../types/user.types'

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: UserCreateInput): Promise<UserPublic> {
    const client = await pool.connect()
    try {
      // Hash password
      const saltRounds = 12
      const password_hash = await bcrypt.hash(userData.password, saltRounds)

      const query = `
        INSERT INTO users (email, password_hash, first_name, last_name, phone, location)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, phone, location, is_active, email_verified, created_at, updated_at
      `
      
      const values = [
        userData.email,
        password_hash,
        userData.first_name,
        userData.last_name,
        userData.phone || null,
        userData.location || null
      ]

      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<UserPublic | null> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT id, email, first_name, last_name, phone, location, is_active, email_verified, created_at, updated_at
        FROM users
        WHERE id = $1 AND is_active = true
      `
      
      const result = await client.query(query, [id])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Find user by email (for authentication)
   */
  static async findByEmail(email: string): Promise<User | null> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, phone, location, is_active, email_verified, created_at, updated_at
        FROM users
        WHERE email = $1 AND is_active = true
      `
      
      const result = await client.query(query, [email])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Update user
   */
  static async update(id: number, userData: UserUpdateInput): Promise<UserPublic | null> {
    const client = await pool.connect()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`)
          values.push(value)
          paramCount++
        }
      })

      if (fields.length === 0) {
        return await this.findById(id)
      }

      values.push(id)
      const query = `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING id, email, first_name, last_name, phone, location, is_active, email_verified, created_at, updated_at
      `

      const result = await client.query(query, values)
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Verify password
   */
  static async verifyPassword(email: string, password: string): Promise<UserPublic | null> {
    const user = await this.findByEmail(email)
    if (!user) return null

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) return null

    // Return user without password hash
    const { password_hash, ...userPublic } = user
    return userPublic as UserPublic
  }

  /**
   * Delete user (soft delete)
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'UPDATE users SET is_active = false WHERE id = $1'
      const result = await client.query(query, [id])
      return (result.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Get user with skills and preferences
   */
  static async findByIdWithDetails(id: number): Promise<UserWithDetails | null> {
    const client = await pool.connect()
    try {
      // Get user
      const user = await this.findById(id)
      if (!user) return null

      // Get skills
      const skillsQuery = `
        SELECT id, user_id, skill_name, proficiency_level, created_at
        FROM user_skills
        WHERE user_id = $1
        ORDER BY skill_name
      `
      const skillsResult = await client.query(skillsQuery, [id])

      // Get preferences
      const preferencesQuery = `
        SELECT id, user_id, preferred_locations, min_stipend, max_duration_months, 
               work_type, notification_enabled, email_notifications, created_at, updated_at
        FROM user_preferences
        WHERE user_id = $1
      `
      const preferencesResult = await client.query(preferencesQuery, [id])

      return {
        ...user,
        skills: skillsResult.rows,
        preferences: preferencesResult.rows[0] || undefined
      }
    } finally {
      client.release()
    }
  }
}

export class UserSkillModel {
  /**
   * Add skill to user
   */
  static async create(userId: number, skillData: UserSkillCreateInput): Promise<UserSkill> {
    const client = await pool.connect()
    try {
      const query = `
        INSERT INTO user_skills (user_id, skill_name, proficiency_level)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, skill_name) 
        DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level
        RETURNING id, user_id, skill_name, proficiency_level, created_at
      `
      
      const values = [userId, skillData.skill_name, skillData.proficiency_level]
      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Get user skills
   */
  static async findByUserId(userId: number): Promise<UserSkill[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT id, user_id, skill_name, proficiency_level, created_at
        FROM user_skills
        WHERE user_id = $1
        ORDER BY skill_name
      `
      
      const result = await client.query(query, [userId])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Update user skill
   */
  static async update(userId: number, skillName: string, skillData: UserSkillUpdateInput): Promise<UserSkill | null> {
    const client = await pool.connect()
    try {
      const query = `
        UPDATE user_skills
        SET proficiency_level = $1
        WHERE user_id = $2 AND skill_name = $3
        RETURNING id, user_id, skill_name, proficiency_level, created_at
      `
      
      const result = await client.query(query, [skillData.proficiency_level, userId, skillName])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Delete user skill
   */
  static async delete(userId: number, skillName: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'DELETE FROM user_skills WHERE user_id = $1 AND skill_name = $2'
      const result = await client.query(query, [userId, skillName])
      return (result.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Bulk update user skills
   */
  static async bulkUpdate(userId: number, skills: UserSkillCreateInput[]): Promise<UserSkill[]> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Delete existing skills
      await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId])

      // Insert new skills
      const results: UserSkill[] = []
      for (const skill of skills) {
        const query = `
          INSERT INTO user_skills (user_id, skill_name, proficiency_level)
          VALUES ($1, $2, $3)
          RETURNING id, user_id, skill_name, proficiency_level, created_at
        `
        const result = await client.query(query, [userId, skill.skill_name, skill.proficiency_level])
        results.push(result.rows[0])
      }

      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

export class UserPreferencesModel {
  /**
   * Create or update user preferences
   */
  static async upsert(userId: number, preferencesData: UserPreferencesCreateInput): Promise<UserPreferences> {
    const client = await pool.connect()
    try {
      const query = `
        INSERT INTO user_preferences (
          user_id, preferred_locations, min_stipend, max_duration_months, 
          work_type, notification_enabled, email_notifications
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id)
        DO UPDATE SET
          preferred_locations = EXCLUDED.preferred_locations,
          min_stipend = EXCLUDED.min_stipend,
          max_duration_months = EXCLUDED.max_duration_months,
          work_type = EXCLUDED.work_type,
          notification_enabled = EXCLUDED.notification_enabled,
          email_notifications = EXCLUDED.email_notifications,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, user_id, preferred_locations, min_stipend, max_duration_months,
                  work_type, notification_enabled, email_notifications, created_at, updated_at
      `
      
      const values = [
        userId,
        preferencesData.preferred_locations || [],
        preferencesData.min_stipend || 0,
        preferencesData.max_duration_months || null,
        preferencesData.work_type || 'any',
        preferencesData.notification_enabled !== undefined ? preferencesData.notification_enabled : true,
        preferencesData.email_notifications !== undefined ? preferencesData.email_notifications : true
      ]

      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Get user preferences
   */
  static async findByUserId(userId: number): Promise<UserPreferences | null> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT id, user_id, preferred_locations, min_stipend, max_duration_months,
               work_type, notification_enabled, email_notifications, created_at, updated_at
        FROM user_preferences
        WHERE user_id = $1
      `
      
      const result = await client.query(query, [userId])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Delete user preferences
   */
  static async delete(userId: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'DELETE FROM user_preferences WHERE user_id = $1'
      const result = await client.query(query, [userId])
      return (result.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }
}