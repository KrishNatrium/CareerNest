import { Pool } from 'pg'

export const up = async (pool: Pool): Promise<void> => {
  const client = await pool.connect()
  
  try {
    console.log('Adding performance optimization indexes...')

    // Internships table indexes for common queries
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_active_created 
      ON internships (is_active, created_at DESC) 
      WHERE is_active = true;
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_active_location 
      ON internships (is_active, location) 
      WHERE is_active = true;
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_active_company 
      ON internships (is_active, company_name) 
      WHERE is_active = true;
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_active_stipend 
      ON internships (is_active, stipend DESC) 
      WHERE is_active = true AND stipend > 0;
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_deadline 
      ON internships (application_deadline) 
      WHERE is_active = true AND application_deadline IS NOT NULL;
    `)

    // GIN index for skills array search
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_skills_gin 
      ON internships USING GIN (required_skills) 
      WHERE is_active = true;
    `)

    // Full-text search indexes
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_title_text 
      ON internships USING GIN (to_tsvector('english', title)) 
      WHERE is_active = true;
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_description_text 
      ON internships USING GIN (to_tsvector('english', description)) 
      WHERE is_active = true;
    `)

    // User applications indexes
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_applications_user_status 
      ON user_applications (user_id, application_status);
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_applications_user_date 
      ON user_applications (user_id, applied_date DESC);
    `)

    // User skills index for recommendations
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_skills_user_skill 
      ON user_skills (user_id, skill_name);
    `)

    // User preferences index
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_user 
      ON user_preferences (user_id);
    `)

    // Update notifications indexes
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_update_notifications_user_unread 
      ON update_notifications (user_id, is_read, sent_at DESC) 
      WHERE is_read = false;
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_update_notifications_type_sent 
      ON update_notifications (notification_type, sent_at DESC);
    `)

    // Scraping jobs indexes
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scraping_jobs_source_next_run 
      ON scraping_jobs (source_name, next_run_at) 
      WHERE status IN ('pending', 'running');
    `)

    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scraping_jobs_status_started 
      ON scraping_jobs (status, started_at DESC);
    `)

    console.log('✅ Performance indexes created successfully')
  } catch (error) {
    console.error('❌ Error creating performance indexes:', error)
    throw error
  } finally {
    client.release()
  }
}

export const down = async (pool: Pool): Promise<void> => {
  const client = await pool.connect()
  
  try {
    console.log('Dropping performance optimization indexes...')

    // Drop all the indexes we created
    const indexes = [
      'idx_internships_active_created',
      'idx_internships_active_location',
      'idx_internships_active_company',
      'idx_internships_active_stipend',
      'idx_internships_deadline',
      'idx_internships_skills_gin',
      'idx_internships_title_text',
      'idx_internships_description_text',
      'idx_user_applications_user_status',
      'idx_user_applications_user_date',
      'idx_user_skills_user_skill',
      'idx_user_preferences_user',
      'idx_update_notifications_user_unread',
      'idx_update_notifications_type_sent',
      'idx_scraping_jobs_source_next_run',
      'idx_scraping_jobs_status_started'
    ]

    for (const index of indexes) {
      await client.query(`DROP INDEX CONCURRENTLY IF EXISTS ${index};`)
    }

    console.log('✅ Performance indexes dropped successfully')
  } catch (error) {
    console.error('❌ Error dropping performance indexes:', error)
    throw error
  } finally {
    client.release()
  }
}