import { pool } from '../config/database'
import {
  Internship,
  InternshipCreateInput,
  InternshipUpdateInput,
  InternshipSearchFilters,
  InternshipSearchResult,
  InternshipStats
} from '../types/internship.types'

export class InternshipModel {
  /**
   * Create a new internship
   */
  static async create(internshipData: InternshipCreateInput): Promise<Internship> {
    const client = await pool.connect()
    try {
      const query = `
        INSERT INTO internships (
          title, company_name, description, location, stipend, duration_months,
          work_type, required_skills, application_url, source_website, external_id,
          posted_date, application_deadline
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (source_website, external_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          company_name = EXCLUDED.company_name,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          stipend = EXCLUDED.stipend,
          duration_months = EXCLUDED.duration_months,
          work_type = EXCLUDED.work_type,
          required_skills = EXCLUDED.required_skills,
          application_url = EXCLUDED.application_url,
          posted_date = EXCLUDED.posted_date,
          application_deadline = EXCLUDED.application_deadline,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `
      
      const values = [
        internshipData.title,
        internshipData.company_name,
        internshipData.description || null,
        internshipData.location || null,
        internshipData.stipend || null,
        internshipData.duration_months || null,
        internshipData.work_type || 'office',
        internshipData.required_skills || [],
        internshipData.application_url || null,
        internshipData.source_website,
        internshipData.external_id || null,
        internshipData.posted_date || null,
        internshipData.application_deadline || null
      ]

      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Find internship by ID
   */
  static async findById(id: number): Promise<Internship | null> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM internships WHERE id = $1 AND is_active = true'
      const result = await client.query(query, [id])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Search internships with filters
   */
  static async search(filters: InternshipSearchFilters): Promise<InternshipSearchResult> {
    const client = await pool.connect()
    try {
      const conditions = ['is_active = true']
      const values: any[] = []
      let paramCount = 1

      // Build WHERE conditions
      if (filters.keywords) {
        conditions.push(`(
          to_tsvector('english', title) @@ plainto_tsquery('english', $${paramCount}) OR
          to_tsvector('english', description) @@ plainto_tsquery('english', $${paramCount}) OR
          to_tsvector('english', company_name) @@ plainto_tsquery('english', $${paramCount})
        )`)
        values.push(filters.keywords)
        paramCount++
      }

      if (filters.location) {
        conditions.push(`to_tsvector('english', location) @@ plainto_tsquery('english', $${paramCount})`)
        values.push(filters.location)
        paramCount++
      }

      if (filters.company) {
        conditions.push(`to_tsvector('english', company_name) @@ plainto_tsquery('english', $${paramCount})`)
        values.push(filters.company)
        paramCount++
      }

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

      if (filters.work_type) {
        conditions.push(`work_type = $${paramCount}`)
        values.push(filters.work_type)
        paramCount++
      }

      if (filters.skills && filters.skills.length > 0) {
        conditions.push(`required_skills && $${paramCount}`)
        values.push(filters.skills)
        paramCount++
      }

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

      if (filters.source_website) {
        conditions.push(`source_website = $${paramCount}`)
        values.push(filters.source_website)
        paramCount++
      }

      // Build ORDER BY clause
      let orderBy = 'posted_date DESC'
      if (filters.sort_by) {
        const sortOrder = filters.sort_order || 'desc'
        switch (filters.sort_by) {
          case 'posted_date':
            orderBy = `posted_date ${sortOrder.toUpperCase()}`
            break
          case 'deadline':
            orderBy = `application_deadline ${sortOrder.toUpperCase()} NULLS LAST`
            break
          case 'stipend':
            orderBy = `stipend ${sortOrder.toUpperCase()} NULLS LAST`
            break
          case 'relevance':
            if (filters.keywords) {
              orderBy = `ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || company_name), plainto_tsquery('english', $1)) DESC`
            }
            break
        }
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM internships WHERE ${conditions.join(' AND ')}`
      const countResult = await client.query(countQuery, values)
      const totalCount = parseInt(countResult.rows[0].count)

      // Get paginated results
      const limit = filters.limit || 20
      const offset = filters.offset || 0
      
      values.push(limit, offset)
      const dataQuery = `
        SELECT * FROM internships 
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `

      const dataResult = await client.query(dataQuery, values)

      return {
        internships: dataResult.rows,
        total_count: totalCount,
        has_more: offset + limit < totalCount
      }
    } finally {
      client.release()
    }
  }

  /**
   * Update internship
   */
  static async update(id: number, internshipData: InternshipUpdateInput): Promise<Internship | null> {
    const client = await pool.connect()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(internshipData).forEach(([key, value]) => {
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
        UPDATE internships
        SET ${fields.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `

      const result = await client.query(query, values)
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Delete internship (soft delete)
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'UPDATE internships SET is_active = false WHERE id = $1'
      const result = await client.query(query, [id])
      return (result.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Get internships by source
   */
  static async findBySource(source: string, limit: number = 100): Promise<Internship[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM internships 
        WHERE source_website = $1 AND is_active = true
        ORDER BY posted_date DESC
        LIMIT $2
      `
      const result = await client.query(query, [source, limit])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get recent internships
   */
  static async findRecent(days: number = 7, limit: number = 50): Promise<Internship[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM internships 
        WHERE is_active = true 
        AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
        LIMIT $1
      `
      const result = await client.query(query, [limit])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get internships with upcoming deadlines
   */
  static async findUpcomingDeadlines(days: number = 7): Promise<Internship[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM internships 
        WHERE is_active = true 
        AND application_deadline IS NOT NULL
        AND application_deadline BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
        ORDER BY application_deadline ASC
      `
      const result = await client.query(query)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get internship statistics
   */
  static async getStats(): Promise<InternshipStats> {
    const client = await pool.connect()
    try {
      // Total and active internships
      const totalQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM internships'
      const totalResult = await client.query(totalQuery)
      
      // By source
      const sourceQuery = `
        SELECT source_website, COUNT(*) as count 
        FROM internships 
        WHERE is_active = true 
        GROUP BY source_website
      `
      const sourceResult = await client.query(sourceQuery)
      
      // By work type
      const workTypeQuery = `
        SELECT work_type, COUNT(*) as count 
        FROM internships 
        WHERE is_active = true 
        GROUP BY work_type
      `
      const workTypeResult = await client.query(workTypeQuery)
      
      // Recent additions (last 7 days)
      const recentQuery = `
        SELECT COUNT(*) as count 
        FROM internships 
        WHERE is_active = true 
        AND created_at >= NOW() - INTERVAL '7 days'
      `
      const recentResult = await client.query(recentQuery)

      const bySource: Record<string, number> = {}
      sourceResult.rows.forEach(row => {
        bySource[row.source_website] = parseInt(row.count)
      })

      const byWorkType: Record<string, number> = {}
      workTypeResult.rows.forEach(row => {
        byWorkType[row.work_type] = parseInt(row.count)
      })

      return {
        total_internships: parseInt(totalResult.rows[0].total),
        active_internships: parseInt(totalResult.rows[0].active),
        by_source: bySource,
        by_work_type: byWorkType as any,
        recent_additions: parseInt(recentResult.rows[0].count)
      }
    } finally {
      client.release()
    }
  }

  /**
   * Bulk create internships
   */
  static async bulkCreate(internships: InternshipCreateInput[]): Promise<{ created: number; updated: number }> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      let created = 0
      let updated = 0

      for (const internship of internships) {
        const result = await this.create(internship)
        // Check if it was an insert or update based on created_at vs updated_at
        if (result.created_at.getTime() === result.updated_at.getTime()) {
          created++
        } else {
          updated++
        }
      }

      await client.query('COMMIT')
      return { created, updated }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}