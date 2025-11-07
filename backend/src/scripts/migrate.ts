#!/usr/bin/env ts-node

import { migrationManager } from '../database/migrations'
import { testConnection, closeConnection } from '../config/database'

const command = process.argv[2]
const migrationName = process.argv[3]

async function main() {
  try {
    // Test database connection first
    await testConnection()

    switch (command) {
      case 'up':
        await migrationManager.runMigrations()
        break
      
      case 'down':
        await migrationManager.rollbackLastMigration()
        break
      
      case 'create':
        if (!migrationName) {
          console.error('❌ Migration name is required')
          console.log('Usage: npm run migrate create <migration_name>')
          process.exit(1)
        }
        migrationManager.createMigration(migrationName)
        break
      
      case 'status':
        const executed = await migrationManager.getExecutedMigrations()
        const available = migrationManager.getMigrationFiles()
        const pending = available.filter(m => !executed.includes(m.id))
        
        console.log('\n📊 Migration Status:')
        console.log(`✅ Executed: ${executed.length}`)
        console.log(`⏳ Pending: ${pending.length}`)
        
        if (pending.length > 0) {
          console.log('\nPending migrations:')
          pending.forEach(m => console.log(`  - ${m.id}`))
        }
        break
      
      default:
        console.log('Usage:')
        console.log('  npm run migrate up     - Run pending migrations')
        console.log('  npm run migrate down   - Rollback last migration')
        console.log('  npm run migrate create <name> - Create new migration')
        console.log('  npm run migrate status - Show migration status')
        break
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await closeConnection()
  }
}

main()