import { createClient, RedisClientType } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

export interface RedisConfig {
  host: string
  port: number
  password?: string | undefined
  db: number
  retryDelayOnFailover: number
  maxRetriesPerRequest: number
  lazyConnect: boolean
}

const config: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
}

// Create Redis client configuration
const clientConfig: any = {
  socket: {
    host: config.host,
    port: config.port,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('❌ Redis connection failed after 10 retries')
        return new Error('Redis connection failed')
      }
      return Math.min(retries * 50, 500)
    }
  },
  database: config.db
}

// Only add password if it exists
if (config.password) {
  clientConfig.password = config.password
}

export const redisClient: RedisClientType = createClient(clientConfig)

// Redis connection event handlers
redisClient.on('connect', () => {
  console.log('🔗 Redis client connecting...')
})

redisClient.on('ready', () => {
  console.log('✅ Redis client connected and ready')
})

redisClient.on('error', (error) => {
  console.error('❌ Redis client error:', error)
})

redisClient.on('end', () => {
  console.log('🔌 Redis client connection closed')
})

// Initialize Redis connection
export const initializeRedis = async (): Promise<void> => {
  try {
    await redisClient.connect()
    
    // Test connection
    await redisClient.ping()
    console.log('✅ Redis connection established successfully')
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    throw error
  }
}

// Close Redis connection
export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit()
      console.log('🔌 Redis connection closed')
    }
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error)
    throw error
  }
}

// Check if Redis is available
export const isRedisAvailable = (): boolean => {
  return redisClient.isOpen && redisClient.isReady
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeRedis()
})

process.on('SIGTERM', async () => {
  await closeRedis()
})