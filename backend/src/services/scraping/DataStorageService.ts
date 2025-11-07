import { pool } from '../../config/database';
import { NormalizedInternship } from './DataNormalizer';

export interface StorageResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class DataStorageService {
  static async storeInternships(internships: NormalizedInternship[]): Promise<StorageResult> {
    const client = await pool.connect();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      await client.query('BEGIN');

      for (const internship of internships) {
        try {
          const result = await this.upsertInternship(client, internship);
          
          if (result === 'inserted') {
            inserted++;
          } else if (result === 'updated') {
            updated++;
          } else {
            skipped++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to store internship ${internship.external_id}: ${errorMessage}`);
          skipped++;
        }
      }

      await client.query('COMMIT');

      return {
        success: errors.length === 0,
        inserted,
        updated,
        skipped,
        errors
      };

    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        inserted: 0,
        updated: 0,
        skipped: internships.length,
        errors: [`Transaction failed: ${errorMessage}`]
      };
    } finally {
      client.release();
    }
  }

  private static async upsertInternship(client: any, internship: NormalizedInternship): Promise<'inserted' | 'updated' | 'skipped'> {
    // First, check if the internship already exists
    const existingQuery = `
      SELECT id, updated_at, title, company_name, description, location, stipend, duration_months, 
             work_type, required_skills, application_url, posted_date, application_deadline
      FROM internships 
      WHERE source_website = $1 AND external_id = $2
    `;
    
    const existingResult = await client.query(existingQuery, [
      internship.source_website,
      internship.external_id
    ]);

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      
      // Check if the internship data has changed
      if (this.hasInternshipChanged(existing, internship)) {
        // Update existing internship
        const updateQuery = `
          UPDATE internships SET
            title = $3,
            company_name = $4,
            description = $5,
            location = $6,
            stipend = $7,
            duration_months = $8,
            work_type = $9,
            required_skills = $10,
            application_url = $11,
            posted_date = $12,
            application_deadline = $13,
            is_active = $14,
            updated_at = CURRENT_TIMESTAMP
          WHERE source_website = $1 AND external_id = $2
        `;
        
        await client.query(updateQuery, [
          internship.source_website,
          internship.external_id,
          internship.title,
          internship.company_name,
          internship.description,
          internship.location,
          internship.stipend,
          internship.duration_months,
          internship.work_type,
          internship.required_skills,
          internship.application_url,
          internship.posted_date,
          internship.application_deadline,
          internship.is_active
        ]);
        
        return 'updated';
      } else {
        return 'skipped';
      }
    } else {
      // Insert new internship
      const insertQuery = `
        INSERT INTO internships (
          title, company_name, description, location, stipend, duration_months,
          work_type, required_skills, application_url, source_website, external_id,
          posted_date, application_deadline, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      await client.query(insertQuery, [
        internship.title,
        internship.company_name,
        internship.description,
        internship.location,
        internship.stipend,
        internship.duration_months,
        internship.work_type,
        internship.required_skills,
        internship.application_url,
        internship.source_website,
        internship.external_id,
        internship.posted_date,
        internship.application_deadline,
        internship.is_active
      ]);
      
      return 'inserted';
    }
  }

  private static hasInternshipChanged(existing: any, updated: NormalizedInternship): boolean {
    // Compare key fields to determine if update is needed
    const fieldsToCompare = [
      'title',
      'company_name',
      'description',
      'location',
      'stipend',
      'duration_months',
      'work_type',
      'application_url'
    ];

    for (const field of fieldsToCompare) {
      const existingValue = existing[field];
      const updatedValue = (updated as any)[field];
      
      if (existingValue !== updatedValue) {
        return true;
      }
    }

    // Compare skills array
    const existingSkills = existing.required_skills || [];
    const updatedSkills = updated.required_skills || [];
    
    if (existingSkills.length !== updatedSkills.length) {
      return true;
    }
    
    for (let i = 0; i < existingSkills.length; i++) {
      if (existingSkills[i] !== updatedSkills[i]) {
        return true;
      }
    }

    // Compare dates
    const existingPostedDate = existing.posted_date ? new Date(existing.posted_date).getTime() : null;
    const updatedPostedDate = updated.posted_date ? updated.posted_date.getTime() : null;
    
    if (existingPostedDate !== updatedPostedDate) {
      return true;
    }

    const existingDeadline = existing.application_deadline ? new Date(existing.application_deadline).getTime() : null;
    const updatedDeadline = updated.application_deadline ? updated.application_deadline.getTime() : null;
    
    if (existingDeadline !== updatedDeadline) {
      return true;
    }

    return false;
  }

  // Method to mark inactive internships (for cleanup)
  static async markInactiveInternships(sourceWebsite: string, activeExternalIds: string[]): Promise<number> {
    const client = await pool.connect();
    
    try {
      let query = `
        UPDATE internships 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE source_website = $1 AND is_active = true
      `;
      
      const params: any[] = [sourceWebsite];
      
      if (activeExternalIds.length > 0) {
        query += ` AND external_id NOT IN (${activeExternalIds.map((_, i) => `$${i + 2}`).join(', ')})`;
        params.push(...activeExternalIds);
      }
      
      const result = await client.query(query, params);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Method to get duplicate internships for analysis
  static async findDuplicateInternships(limit: number = 100): Promise<Array<{
    title: string;
    company_name: string;
    location: string;
    count: number;
    internship_ids: number[];
  }>> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          title,
          company_name,
          location,
          COUNT(*) as count,
          ARRAY_AGG(id) as internship_ids
        FROM internships
        WHERE is_active = true
        GROUP BY title, company_name, location
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Method to clean up old inactive internships
  static async cleanupOldInternships(daysOld: number = 30): Promise<number> {
    const client = await pool.connect();
    
    try {
      const query = `
        DELETE FROM internships 
        WHERE is_active = false 
        AND updated_at < NOW() - INTERVAL '${daysOld} days'
      `;
      
      const result = await client.query(query);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Method to get storage statistics
  static async getStorageStats(): Promise<{
    total_internships: number;
    active_internships: number;
    inactive_internships: number;
    by_source: Array<{ source: string; count: number }>;
    recent_additions: number;
  }> {
    const client = await pool.connect();
    
    try {
      // Total and active/inactive counts
      const totalQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM internships
      `;
      const totalResult = await client.query(totalQuery);
      
      // By source
      const sourceQuery = `
        SELECT source_website as source, COUNT(*) as count
        FROM internships
        WHERE is_active = true
        GROUP BY source_website
        ORDER BY count DESC
      `;
      const sourceResult = await client.query(sourceQuery);
      
      // Recent additions (last 24 hours)
      const recentQuery = `
        SELECT COUNT(*) as recent
        FROM internships
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;
      const recentResult = await client.query(recentQuery);
      
      return {
        total_internships: parseInt(totalResult.rows[0].total),
        active_internships: parseInt(totalResult.rows[0].active),
        inactive_internships: parseInt(totalResult.rows[0].inactive),
        by_source: sourceResult.rows,
        recent_additions: parseInt(recentResult.rows[0].recent)
      };
    } finally {
      client.release();
    }
  }
}