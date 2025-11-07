import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { testConnection } from './config/database'
import { migrationManager } from './database/migrations'
import authRoutes from './routes/auth'

// Load environment variables
dotenv.config()

const app = express()
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
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API routes
app.get('/api', (_req, res) => {
  res.json({
    message: 'Internship Aggregator API',
    version: '1.0.0',
    status: 'running'
  })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Temporary internships endpoint with sample data
app.get('/api/internships', (_req, res) => {
  res.json({
    success: true,
    data: {
      internships: [
        {
          id: 1,
          title: "Software Development Intern",
          company_name: "Tech Corp",
          description: "Join our team as a software development intern and work on exciting projects using modern technologies.",
          location: "Bangalore, India",
          stipend: 25000,
          duration_months: 6,
          work_type: "hybrid",
          required_skills: ["JavaScript", "React", "Node.js"],
          application_url: "https://example.com/apply/1",
          source_website: "internshala",
          posted_date: "2024-10-20T00:00:00Z",
          application_deadline: "2024-11-20T00:00:00Z",
          created_at: "2024-10-20T00:00:00Z",
          updated_at: "2024-10-20T00:00:00Z"
        },
        {
          id: 2,
          title: "Data Science Intern",
          company_name: "Analytics Inc",
          description: "Work with our data science team to analyze large datasets and build machine learning models.",
          location: "Mumbai, India",
          stipend: 30000,
          duration_months: 4,
          work_type: "remote",
          required_skills: ["Python", "Machine Learning", "SQL"],
          application_url: "https://example.com/apply/2",
          source_website: "linkedin",
          posted_date: "2024-10-19T00:00:00Z",
          application_deadline: "2024-11-15T00:00:00Z",
          created_at: "2024-10-19T00:00:00Z",
          updated_at: "2024-10-19T00:00:00Z"
        },
        {
          id: 3,
          title: "UI/UX Design Intern",
          company_name: "Design Studio",
          description: "Create beautiful and user-friendly interfaces for web and mobile applications.",
          location: "Delhi, India",
          stipend: 20000,
          duration_months: 3,
          work_type: "office",
          required_skills: ["Figma", "Adobe XD", "User Research"],
          application_url: "https://example.com/apply/3",
          source_website: "internshala",
          posted_date: "2024-10-18T00:00:00Z",
          application_deadline: "2024-11-10T00:00:00Z",
          created_at: "2024-10-18T00:00:00Z",
          updated_at: "2024-10-18T00:00:00Z"
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1
      }
    }
  })
})

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
    
    // Run pending migrations
    await migrationManager.runMigrations()
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api`)
      console.log(`🔧 Minimal server with sample data`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()