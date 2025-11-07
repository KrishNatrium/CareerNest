import { pool } from '../config/database'
import {
  ScrapingJob,
  ScrapingJobCreateInput,
  ScrapingJobUpdateInput,
  JobStatus
} from '../types/internship.types'

export class ScrapingJobModel {
  /**
   * Create a new scraping job
   */
  static async create(jobData: ScrapingJobCreateInput): Promise<ScrapingJob> {
    const client = await pool.connect()
    try {
      const query = `
        INSERT INTO scraping_jobs (source_name, job_type, next_run_at)
        VALUES ($1, $2, $3)
        RETURNING *
      `
      
      const values = [
        jobData.source_name,
        jobData.job_type,
        jobData.next_run_at || null
      ]

      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Find job by ID
   */
  static async findById(id: number): Promise<ScrapingJob | null> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM scraping_jobs WHERE id = $1'
      const result = await client.query(query, [id])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Update scraping job
   */
  static async update(id: number, jobData: ScrapingJobUpdateInput): Promise<ScrapingJob | null> {
    const client = await pool.connect()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(jobData).forEach(([key, value]) => {
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
        UPDATE scraping_jobs
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
   * Get jobs by status
   */
  static async findByStatus(status: JobStatus, limit: number = 50): Promise<ScrapingJob[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM scraping_jobs 
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2
      `
      const result = await client.query(query, [status, limit])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get jobs by source
   */
  static async findBySource(sourceName: string, limit: number = 50): Promise<ScrapingJob[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM scraping_jobs 
        WHERE source_name = $1
        ORDER BY created_at DESC
        LIMIT $2
      `
      const result = await client.query(query, [sourceName, limit])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get pending jobs that are ready to run
   */
  static async findReadyToRun(): Promise<ScrapingJob[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM scraping_jobs 
        WHERE status = 'pending'
        AND (next_run_at IS NULL OR next_run_at <= NOW())
        ORDER BY created_at ASC
      `
      const result = await client.query(query)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get recent jobs for a source
   */
  static async findRecentBySource(sourceName: string, hours: number = 24): Promise<ScrapingJob[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM scraping_jobs 
        WHERE source_name = $1
        AND created_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at DESC
      `
      const result = await client.query(query, [sourceName])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get job statistics
   */
  static async getStats(): Promise<{
    total_jobs: number
    by_status: Record<JobStatus, number>
    by_source: Record<string, number>
    success_rate: number
  }> {
    const client = await pool.connect()
    try {
      // Total jobs
      const totalQuery = 'SELECT COUNT(*) as total FROM scraping_jobs'
      const totalResult = await client.query(totalQuery)
      
      // By status
      const statusQuery = `
        SELECT status, COUNT(*) as count 
        FROM scraping_jobs 
        GROUP BY status
      `
      const statusResult = await client.query(statusQuery)
      
      // By source
      const sourceQuery = `
        SELECT source_name, COUNT(*) as count 
        FROM scraping_jobs 
        GROUP BY source_name
      `
      const sourceResult = await client.query(sourceQuery)
      
      // Success rate (completed vs failed)
      const successQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM scraping_jobs
        WHERE status IN ('completed', 'failed')
      `
      const successResult = await client.query(successQuery)

      const byStatus: Record<JobStatus, number> = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      }

      statusResult.rows.forEach(row => {
        byStatus[row.status as JobStatus] = parseInt(row.count)
      })

      const bySource: Record<string, number> = {}
      sourceResult.rows.forEach(row => {
        bySource[row.source_name] = parseInt(row.count)
      })

      const completed = parseInt(successResult.rows[0].completed || '0')
      const failed = parseInt(successResult.rows[0].failed || '0')
      const successRate = completed + failed > 0 ? (completed / (completed + failed)) * 100 : 0

      return {
        total_jobs: parseInt(totalResult.rows[0].total),
        by_status: byStatus,
        by_source: bySource,
        success_rate: Math.round(successRate * 100) / 100
      }
    } finally {
      client.release()
    }
  }

  /**
   * Delete old completed jobs
   */
  static async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const client = await pool.connect()
    try {
      const query = `
        DELETE FROM scraping_jobs 
        WHERE status IN ('completed', 'failed', 'cancelled')
        AND completed_at < NOW() - INTERVAL '${daysOld} days'
      `
      const result = await client.query(query)
      return result.rowCount || 0
    } finally {
      client.release()
    }
  }

  /**
   * Mark job as started
   */
  static async markAsStarted(id: number): Promise<ScrapingJob | null> {
    return this.update(id, {
      status: 'running',
      started_at: new Date()
    })
  }

  /**
   * Mark job as completed
   */
  static async markAsCompleted(
    id: number, 
    recordsProcessed: number, 
    recordsAdded: number, 
    recordsUpdated: number,
    recordsFailed: number = 0
  ): Promise<ScrapingJob | null> {
    return this.update(id, {
      status: 'completed',
      completed_at: new Date(),
      records_processed: recordsProcessed,
      records_added: recordsAdded,
      records_updated: recordsUpdated,
      records_failed: recordsFailed
    })
  }

  /**
   * Mark job as failed
   */
  static async markAsFailed(id: number, errorMessage: string): Promise<ScrapingJob | null> {
    return this.update(id, {
      status: 'failed',
      completed_at: new Date(),
      error_message: errorMessage
    })
  }

  /**
   * Schedule next run for a job
   */
  static async scheduleNextRun(id: number, nextRunAt: Date): Promise<ScrapingJob | null> {
    return this.update(id, {
      status: 'pending',
      next_run_at: nextRunAt
    })
  }

  /**
   * Create a job with simplified input (for ScrapingManager compatibility)
   */
  static async createJob(jobData: {
    source_name: string;
    job_type: string;
    status?: string;
  }): Promise<ScrapingJob> {
    return this.create({
      source_name: jobData.source_name,
      job_type: jobData.job_type as any,
    });
  }

  /**
   * Update job status with additional fields (for ScrapingManager compatibility)
   */
  static async updateJobStatus(
    jobId: string,
    status: string,
    updates: Partial<{
      started_at: Date;
      completed_at: Date;
      records_processed: number;
      records_added: number;
      records_updated: number;
      error_message: string;
    }>
  ): Promise<void> {
    const id = parseInt(jobId);
    if (isNaN(id)) {
      throw new Error(`Invalid job ID: ${jobId}`);
    }

    await this.update(id, {
      status: status as any,
      ...updates
    });
  }
}

// Export as ScrapingJob for compatibility
export { ScrapingJobModel as ScrapingJob };