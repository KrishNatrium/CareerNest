import { Pool, PoolConfig } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'internship_aggregator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  
  // Connection pool optimization
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of connections
  min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum number of connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'), // 5 seconds
  
  // Query optimization
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds
  
  // Performance settings
  application_name: 'internship_aggregator',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 seconds
}

// Create connection pool
export const pool = new Pool(config)

// Add monitoring to pool events
pool.on('connect', () => {
  console.log('🔗 New database client connected')
})

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err)
})

pool.on('remove', () => {
  console.log('🔌 Database client removed from pool')
})



// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('✅ Database connection established successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    await pool.end()
    console.log('🔌 Database connection pool closed')
  } catch (error) {
    console.error('❌ Error closing database connection:', error)
    throw error
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeConnection()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeConnection()
  process.exit(0)
})