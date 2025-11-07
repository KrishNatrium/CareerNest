import { Router } from 'express'
import { dbMonitoringService } from '../services/DatabaseMonitoringService'
import { queryOptimizationService } from '../services/QueryOptimizationService'

const router = Router()

// Get database health metrics
router.get('/database/health', async (_req, res) => {
  try {
    const health = await dbMonitoringService.getDatabaseHealth()
    
    res.json({
      success: true,
      data: health
    })
  } catch (error) {
    console.error('Database health check error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get database health'
    })
  }
})

// Get query performance statistics
router.get('/database/query-stats', async (_req, res) => {
  try {
    const stats = dbMonitoringService.getQueryStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Query stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get query statistics'
    })
  }
})

// Get slow queries report
router.get('/database/slow-queries', async (_req, res) => {
  try {
    const report = dbMonitoringService.getSlowQueriesReport()
    
    res.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Slow queries report error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get slow queries report'
    })
  }
})

// Get database size and table statistics
router.get('/database/stats', async (_req, res) => {
  try {
    const stats = await dbMonitoringService.getDatabaseStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Database stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get database statistics'
    })
  }
})

// Analyze specific query performance
router.post('/database/analyze-query', async (req, res) => {
  try {
    const { query, params } = req.body
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }

    const analysis = await queryOptimizationService.analyzeQuery(query, params)
    
    return res.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    console.error('Query analysis error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze query'
    })
  }
})

// Get index recommendations
router.get('/database/index-recommendations', async (_req, res) => {
  try {
    const recommendations = await queryOptimizationService.getIndexRecommendations()
    
    res.json({
      success: true,
      data: recommendations
    })
  } catch (error) {
    console.error('Index recommendations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get index recommendations'
    })
  }
})

// Apply index recommendation
router.post('/database/apply-index', async (req, res) => {
  try {
    const recommendation = req.body
    
    if (!recommendation || !recommendation.createStatement) {
      return res.status(400).json({
        success: false,
        error: 'Valid index recommendation is required'
      })
    }

    const success = await queryOptimizationService.applyIndexRecommendation(recommendation)
    
    return res.json({
      success,
      data: {
        message: success ? 'Index created successfully' : 'Failed to create index',
        recommendation
      }
    })
  } catch (error) {
    console.error('Apply index error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to apply index recommendation'
    })
  }
})

// Get unused indexes
router.get('/database/unused-indexes', async (_req, res) => {
  try {
    const unusedIndexes = await queryOptimizationService.getUnusedIndexes()
    
    res.json({
      success: true,
      data: unusedIndexes
    })
  } catch (error) {
    console.error('Unused indexes error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get unused indexes'
    })
  }
})

// Get query optimizations
router.get('/database/query-optimizations', async (_req, res) => {
  try {
    const optimizations = queryOptimizationService.getQueryOptimizations()
    
    res.json({
      success: true,
      data: optimizations
    })
  } catch (error) {
    console.error('Query optimizations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get query optimizations'
    })
  }
})

// Get performance recommendations
router.get('/database/performance-recommendations', async (_req, res) => {
  try {
    const recommendations = await queryOptimizationService.getPerformanceRecommendations()
    
    res.json({
      success: true,
      data: recommendations
    })
  } catch (error) {
    console.error('Performance recommendations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get performance recommendations'
    })
  }
})

// Configure monitoring settings
router.put('/database/monitoring/config', async (req, res) => {
  try {
    const { enabled, slowQueryThreshold } = req.body
    
    if (typeof enabled === 'boolean') {
      dbMonitoringService.setMonitoring(enabled)
    }
    
    if (typeof slowQueryThreshold === 'number') {
      dbMonitoringService.setSlowQueryThreshold(slowQueryThreshold)
    }
    
    res.json({
      success: true,
      data: {
        message: 'Monitoring configuration updated',
        enabled,
        slowQueryThreshold
      }
    })
  } catch (error) {
    console.error('Monitoring config error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update monitoring configuration'
    })
  }
})

// Clear monitoring metrics
router.delete('/database/monitoring/metrics', async (_req, res) => {
  try {
    dbMonitoringService.clearMetrics()
    
    res.json({
      success: true,
      data: {
        message: 'Monitoring metrics cleared'
      }
    })
  } catch (error) {
    console.error('Clear metrics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear monitoring metrics'
    })
  }
})

// Export monitoring metrics
router.get('/database/monitoring/export', async (_req, res) => {
  try {
    const metrics = dbMonitoringService.exportMetrics()
    
    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Export metrics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export monitoring metrics'
    })
  }
})

export default router