import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { testConnection } from './config/database'
import { initializeRedis, closeRedis, isRedisAvailable } from './config/redis'
import { migrationManager } from './database/migrations'
import { SchedulerService } from './services/SchedulerService'
import { initializeWebSocketService, getWebSocketService } from './services/WebSocketService'
import { initializeRealTimeMonitorService, getRealTimeMonitorService } from './services/RealTimeMonitorService'
import { cacheWarmingService } from './services/CacheWarmingService'
import authRoutes from './routes/auth'
import scrapingRoutes from './routes/scraping'
import internshipRoutes from './routes/internships'
import recommendationRoutes from './routes/recommendations'
import applicationRoutes from './routes/applications'
import websocketRoutes from './routes/websocket'
import webhookRoutes from './routes/webhooks'
import cacheRoutes from './routes/cache'
import monitoringRoutes from './routes/monitoring'

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', async (_req, res) => {
  const redisStatus = isRedisAvailable()
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'connected',
      redis: redisStatus ? 'connected' : 'disconnected',
      websocket: 'active'
    }
  })
})

// API routes
app.get('/api', (_req, res) => {
  res.json({
    message: 'CareerNest API',
    version: '1.0.0',
    status: 'running'
  })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Scraping routes
app.use('/api/scraping', scrapingRoutes)

// Internship routes
app.use('/api/internships', internshipRoutes)

// Recommendation routes
app.use('/api/recommendations', recommendationRoutes)

// Application tracking routes
app.use('/api/applications', applicationRoutes)

// WebSocket and real-time routes
app.use('/api/websocket', websocketRoutes)

// Webhook routes
app.use('/api/webhooks', webhookRoutes)

// Cache management routes
app.use('/api/cache', cacheRoutes)

// Database monitoring routes
app.use('/api/monitoring', monitoringRoutes)

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  })
})

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Something went wrong'
    }
  })
})

// Initialize database and start server
async function startServer() {
  
  try {
    // Test database connection
    await testConnection()
    
    // Initialize Redis connection
    try {
      await initializeRedis()
      console.log('✅ Redis initialized successfully')
      
      // Start cache warming after a delay
      setTimeout(async () => {
        console.log('🔥 Starting initial cache warming...')
        await cacheWarmingService.warmAll()
        await cacheWarmingService.warmPopularSearches()
        
        // Schedule automatic cache warming every hour
        cacheWarmingService.scheduleWarming(60)
      }, 5000) // 5 second delay
      
    } catch (error) {
      console.warn('⚠️ Redis connection failed, running without cache:', (error as Error).message)
    }
    
    // Run pending migrations
    await migrationManager.runMigrations()
    
    // Initialize scheduler for reminders
    SchedulerService.initialize()
    
    // Initialize WebSocket service
    initializeWebSocketService(httpServer)
    console.log('🔌 WebSocket service initialized')
    
    // Initialize real-time monitoring service
    const monitorService = initializeRealTimeMonitorService()
    monitorService.startMonitoring()
    console.log('🔍 Real-time monitoring service started')
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`)
      
      try {
        // Stop all scheduled jobs
        SchedulerService.stopAll()
        
        // Shutdown WebSocket service
        const webSocketService = getWebSocketService()
        await webSocketService.shutdown()
        
        // Shutdown real-time monitoring service
        const monitorService = getRealTimeMonitorService()
        monitorService.shutdown()
        
        // Close Redis connection
        await closeRedis()
        
        console.log('✅ Server shut down successfully')
        process.exit(0)
      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    }
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api`)
      console.log(`🔌 WebSocket server: ws://localhost:${PORT}`)
      console.log(`📨 Webhook endpoints: http://localhost:${PORT}/api/webhooks`)
      console.log(`🔥 Cache service: ${isRedisAvailable() ? 'Active' : 'Disabled'}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()