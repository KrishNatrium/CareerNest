import { pool } from '../config/database'
import {
  UserApplication,
  UserApplicationCreateInput,
  UserApplicationUpdateInput,
  UserApplicationWithInternship,
  ApplicationStats,
  ApplicationStatus
} from '../types/internship.types'

export class UserApplicationModel {
  /**
   * Create a new application
   */
  static async create(userId: number, applicationData: UserApplicationCreateInput): Promise<UserApplication> {
    const client = await pool.connect()
    try {
      const query = `
        INSERT INTO user_applications (user_id, internship_id, application_status, notes, reminder_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, internship_id)
        DO UPDATE SET
          application_status = EXCLUDED.application_status,
          notes = EXCLUDED.notes,
          reminder_date = EXCLUDED.reminder_date,
          last_updated = CURRENT_TIMESTAMP
        RETURNING *
      `
      
      const values = [
        userId,
        applicationData.internship_id,
        applicationData.application_status || 'applied',
        applicationData.notes || null,
        applicationData.reminder_date || null
      ]

      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Find application by ID
   */
  static async findById(id: number): Promise<UserApplication | null> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM user_applications WHERE id = $1'
      const result = await client.query(query, [id])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Find application by user and internship
   */
  static async findByUserAndInternship(userId: number, internshipId: number): Promise<UserApplication | null> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM user_applications WHERE user_id = $1 AND internship_id = $2'
      const result = await client.query(query, [userId, internshipId])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Get user applications with internship details
   */
  static async findByUserIdWithInternships(
    userId: number, 
    status?: ApplicationStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ applications: UserApplicationWithInternship[]; total_count: number }> {
    const client = await pool.connect()
    try {
      const conditions = ['ua.user_id = $1']
      const values: any[] = [userId]
      let paramCount = 2

      if (status) {
        conditions.push(`ua.application_status = $${paramCount}`)
        values.push(status)
        paramCount++
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM user_applications ua
        JOIN internships i ON ua.internship_id = i.id
        WHERE ${conditions.join(' AND ')}
      `
      const countResult = await client.query(countQuery, values)
      const totalCount = parseInt(countResult.rows[0].count)

      // Get applications with internship details
      values.push(limit, offset)
      const query = `
        SELECT 
          ua.*,
          i.title, i.company_name, i.description, i.location, i.stipend,
          i.duration_months, i.work_type, i.required_skills, i.application_url,
          i.source_website, i.external_id, i.posted_date, i.application_deadline,
          i.is_active, i.created_at as internship_created_at, i.updated_at as internship_updated_at
        FROM user_applications ua
        JOIN internships i ON ua.internship_id = i.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ua.applied_date DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `

      const result = await client.query(query, values)
      
      const applications = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        internship_id: row.internship_id,
        application_status: row.application_status,
        applied_date: row.applied_date,
        last_updated: row.last_updated,
        notes: row.notes,
        reminder_date: row.reminder_date,
        internship: {
          id: row.internship_id,
          title: row.title,
          company_name: row.company_name,
          description: row.description,
          location: row.location,
          stipend: row.stipend,
          duration_months: row.duration_months,
          work_type: row.work_type,
          required_skills: row.required_skills,
          application_url: row.application_url,
          source_website: row.source_website,
          external_id: row.external_id,
          posted_date: row.posted_date,
          application_deadline: row.application_deadline,
          is_active: row.is_active,
          created_at: row.internship_created_at,
          updated_at: row.internship_updated_at
        }
      }))

      return { applications, total_count: totalCount }
    } finally {
      client.release()
    }
  }

  /**
   * Update application
   */
  static async update(id: number, applicationData: UserApplicationUpdateInput): Promise<UserApplication | null> {
    const client = await pool.connect()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(applicationData).forEach(([key, value]) => {
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
        UPDATE user_applications
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await client.query(query, values)
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Delete application
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'DELETE FROM user_applications WHERE id = $1'
      const result = await client.query(query, [id])
      return (result.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Get applications with upcoming reminders
   */
  static async findUpcomingReminders(days: number = 7): Promise<UserApplicationWithInternship[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT 
          ua.*,
          i.title, i.company_name, i.description, i.location, i.stipend,
          i.duration_months, i.work_type, i.required_skills, i.application_url,
          i.source_website, i.external_id, i.posted_date, i.application_deadline,
          i.is_active, i.created_at as internship_created_at, i.updated_at as internship_updated_at
        FROM user_applications ua
        JOIN internships i ON ua.internship_id = i.id
        WHERE ua.reminder_date IS NOT NULL
        AND ua.reminder_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
        ORDER BY ua.reminder_date ASC
      `

      const result = await client.query(query)
      
      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        internship_id: row.internship_id,
        application_status: row.application_status,
        applied_date: row.applied_date,
        last_updated: row.last_updated,
        notes: row.notes,
        reminder_date: row.reminder_date,
        internship: {
          id: row.internship_id,
          title: row.title,
          company_name: row.company_name,
          description: row.description,
          location: row.location,
          stipend: row.stipend,
          duration_months: row.duration_months,
          work_type: row.work_type,
          required_skills: row.required_skills,
          application_url: row.application_url,
          source_website: row.source_website,
          external_id: row.external_id,
          posted_date: row.posted_date,
          application_deadline: row.application_deadline,
          is_active: row.is_active,
          created_at: row.internship_created_at,
          updated_at: row.internship_updated_at
        }
      }))
    } finally {
      client.release()
    }
  }

  /**
   * Get application statistics for a user
   */
  static async getStatsByUserId(userId: number): Promise<ApplicationStats> {
    const client = await pool.connect()
    try {
      // Total applications
      const totalQuery = 'SELECT COUNT(*) as total FROM user_applications WHERE user_id = $1'
      const totalResult = await client.query(totalQuery, [userId])
      
      // By status
      const statusQuery = `
        SELECT application_status, COUNT(*) as count 
        FROM user_applications 
        WHERE user_id = $1 
        GROUP BY application_status
      `
      const statusResult = await client.query(statusQuery, [userId])
      
      // Recent applications (last 30 days)
      const recentQuery = `
        SELECT COUNT(*) as count 
        FROM user_applications 
        WHERE user_id = $1 
        AND applied_date >= NOW() - INTERVAL '30 days'
      `
      const recentResult = await client.query(recentQuery, [userId])
      
      // Upcoming deadlines
      const deadlineQuery = `
        SELECT COUNT(*) as count 
        FROM user_applications ua
        JOIN internships i ON ua.internship_id = i.id
        WHERE ua.user_id = $1 
        AND i.application_deadline IS NOT NULL
        AND i.application_deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        AND ua.application_status IN ('applied', 'under_review', 'interview_scheduled')
      `
      const deadlineResult = await client.query(deadlineQuery, [userId])

      const byStatus: Record<ApplicationStatus, number> = {
        applied: 0,
        under_review: 0,
        interview_scheduled: 0,
        interviewed: 0,
        offered: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0
      }

      statusResult.rows.forEach(row => {
        byStatus[row.application_status as ApplicationStatus] = parseInt(row.count)
      })

      return {
        total_applications: parseInt(totalResult.rows[0].total),
        by_status: byStatus,
        recent_applications: parseInt(recentResult.rows[0].count),
        upcoming_deadlines: parseInt(deadlineResult.rows[0].count)
      }
    } finally {
      client.release()
    }
  }

  /**
   * Check if user has applied to internship
   */
  static async hasUserApplied(userId: number, internshipId: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'SELECT 1 FROM user_applications WHERE user_id = $1 AND internship_id = $2'
      const result = await client.query(query, [userId, internshipId])
      return result.rows.length > 0
    } finally {
      client.release()
    }
  }

  /**
   * Get applications by status for a user
   */
  static async findByUserIdAndStatus(userId: number, status: ApplicationStatus): Promise<UserApplication[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM user_applications 
        WHERE user_id = $1 AND application_status = $2
        ORDER BY last_updated DESC
      `
      const result = await client.query(query, [userId, status])
      return result.rows
    } finally {
      client.release()
    }
  }
}