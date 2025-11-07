import { pool } from '../config/database'
import fs from 'fs'
import path from 'path'

export interface Migration {
  id: string
  name: string
  up: string
  down: string
  timestamp: Date
}

export class MigrationManager {
  private migrationsPath: string

  constructor(migrationsPath: string = path.join(__dirname, 'migrations')) {
    this.migrationsPath = migrationsPath
  }

  /**
   * Initialize migrations table
   */
  async initializeMigrationsTable(): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Migrations table initialized')
    } catch (error) {
      console.error('❌ Failed to initialize migrations table:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations(): Promise<string[]> {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT id FROM migrations ORDER BY executed_at')
      return result.rows.map(row => row.id)
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get available migration files
   */
  getMigrationFiles(): Migration[] {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true })
      return []
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort()

    return files.map(file => {
      const filePath = path.join(this.migrationsPath, file)
      const content = fs.readFileSync(filePath, 'utf8')
      const [up, down] = content.split('-- DOWN')
      
      const id = file.replace('.sql', '')
      const name = id.replace(/^\d{14}_/, '') // Remove timestamp prefix
      
      return {
        id,
        name,
        up: up.replace('-- UP', '').trim(),
        down: down ? down.trim() : '',
        timestamp: new Date()
      }
    })
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    await this.initializeMigrationsTable()
    
    const executedMigrations = await this.getExecutedMigrations()
    const availableMigrations = this.getMigrationFiles()
    
    const pendingMigrations = availableMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    )

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`)

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration)
    }

    console.log('✅ All migrations completed successfully')
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      // Execute migration SQL
      await client.query(migration.up)
      
      // Record migration as executed
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      )
      
      await client.query('COMMIT')
      console.log(`✅ Migration ${migration.id} executed successfully`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`❌ Migration ${migration.id} failed:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Rollback last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const client = await pool.connect()
    try {
      // Get last executed migration
      const result = await client.query(
        'SELECT id FROM migrations ORDER BY executed_at DESC LIMIT 1'
      )
      
      if (result.rows.length === 0) {
        console.log('ℹ️ No migrations to rollback')
        return
      }

      const lastMigrationId = result.rows[0].id
      const migration = this.getMigrationFiles().find(m => m.id === lastMigrationId)
      
      if (!migration || !migration.down) {
        throw new Error(`Migration ${lastMigrationId} has no rollback script`)
      }

      await client.query('BEGIN')
      
      // Execute rollback SQL
      await client.query(migration.down)
      
      // Remove migration record
      await client.query('DELETE FROM migrations WHERE id = $1', [lastMigrationId])
      
      await client.query('COMMIT')
      console.log(`✅ Migration ${lastMigrationId} rolled back successfully`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('❌ Rollback failed:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Create a new migration file
   */
  createMigration(name: string): string {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`
    const filepath = path.join(this.migrationsPath, filename)
    
    const template = `-- UP
-- Add your migration SQL here

-- DOWN
-- Add your rollback SQL here
`
    
    fs.writeFileSync(filepath, template)
    console.log(`✅ Migration file created: ${filename}`)
    return filepath
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager()