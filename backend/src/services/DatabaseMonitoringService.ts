import { Pool, PoolClient } from 'pg'
import { pool } from '../config/database'

export interface QueryMetrics {
  query: string
  duration: number
  timestamp: Date
  success: boolean
  error?: string | undefined
  rowCount?: number | undefined
}

export interface DatabaseHealth {
  isConnected: boolean
  activeConnections: number
  idleConnections: number
  totalConnections: number
  waitingCount: number
  maxConnections: number
  averageQueryTime: number
  slowQueries: QueryMetrics[]
  errorRate: number
}

export class DatabaseMonitoringService {
  private static instance: DatabaseMonitoringService
  private queryMetrics: QueryMetrics[] = []
  private maxMetricsHistory = 1000
  private slowQueryThreshold = 1000 // 1 second
  private monitoringEnabled = true

  private constructor() {}

  public static getInstance(): DatabaseMonitoringService {
    if (!DatabaseMonitoringService.instance) {
      DatabaseMonitoringService.instance = new DatabaseMonitoringService()
    }
    return DatabaseMonitoringService.instance
  }

  /**
   * Enable or disable monitoring
   */
  setMonitoring(enabled: boolean): void {
    this.monitoringEnabled = enabled
    console.log(`Database monitoring ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Set slow query threshold in milliseconds
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold
    console.log(`Slow query threshold set to ${threshold}ms`)
  }

  /**
   * Record query metrics
   */
  recordQuery(metrics: QueryMetrics): void {
    if (!this.monitoringEnabled) return

    this.queryMetrics.push(metrics)

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory)
    }

    // Log slow queries
    if (metrics.duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${metrics.duration}ms):`, {
        query: metrics.query.substring(0, 100) + '...',
        duration: metrics.duration,
        rowCount: metrics.rowCount
      })
    }

    // Log query errors
    if (!metrics.success && metrics.error) {
      console.error(`❌ Query error:`, {
        query: metrics.query.substring(0, 100) + '...',
        error: metrics.error
      })
    }
  }

  /**
   * Create monitored query wrapper
   */
  async monitoredQuery(
    client: PoolClient | Pool,
    query: string,
    params?: any[]
  ): Promise<any> {
    const startTime = Date.now()
    const timestamp = new Date()
    let success = true
    let error: string | undefined
    let rowCount: number | undefined

    try {
      const result = await client.query(query, params)
      rowCount = result.rowCount || 0
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      const duration = Date.now() - startTime

      this.recordQuery({
        query: query.trim(),
        duration,
        timestamp,
        success,
        error,
        rowCount
      })
    }
  }

  /**
   * Get database health metrics
   */
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      // Get connection pool stats
      const poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }

      // Calculate metrics from recent queries
      const recentMetrics = this.queryMetrics.slice(-100) // Last 100 queries
      const averageQueryTime = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
        : 0

      const errorCount = recentMetrics.filter(m => !m.success).length
      const errorRate = recentMetrics.length > 0 ? (errorCount / recentMetrics.length) * 100 : 0

      const slowQueries = this.queryMetrics
        .filter(m => m.duration > this.slowQueryThreshold)
        .slice(-10) // Last 10 slow queries

      // Test connection
      let isConnected = true
      try {
        const client = await pool.connect()
        await client.query('SELECT 1')
        client.release()
      } catch {
        isConnected = false
      }

      return {
        isConnected,
        activeConnections: poolStats.totalCount - poolStats.idleCount,
        idleConnections: poolStats.idleCount,
        totalConnections: poolStats.totalCount,
        waitingCount: poolStats.waitingCount,
        maxConnections: parseInt(process.env.DB_POOL_MAX || '20'),
        averageQueryTime: Math.round(averageQueryTime),
        slowQueries,
        errorRate: Math.round(errorRate * 100) / 100
      }
    } catch (error) {
      console.error('Error getting database health:', error)
      return {
        isConnected: false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        waitingCount: 0,
        maxConnections: 0,
        averageQueryTime: 0,
        slowQueries: [],
        errorRate: 100
      }
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    totalQueries: number
    successfulQueries: number
    failedQueries: number
    averageQueryTime: number
    slowestQuery: QueryMetrics | null
    fastestQuery: QueryMetrics | null
    queriesByHour: { [hour: string]: number }
  } {
    const totalQueries = this.queryMetrics.length
    const successfulQueries = this.queryMetrics.filter(m => m.success).length
    const failedQueries = totalQueries - successfulQueries

    const averageQueryTime = totalQueries > 0
      ? this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0

    const sortedByDuration = [...this.queryMetrics].sort((a, b) => a.duration - b.duration)
    const slowestQuery = sortedByDuration[sortedByDuration.length - 1] || null
    const fastestQuery = sortedByDuration[0] || null

    // Group queries by hour
    const queriesByHour: { [hour: string]: number } = {}
    this.queryMetrics.forEach(m => {
      const hour = m.timestamp.toISOString().substring(0, 13) // YYYY-MM-DDTHH
      queriesByHour[hour] = (queriesByHour[hour] || 0) + 1
    })

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      averageQueryTime: Math.round(averageQueryTime),
      slowestQuery,
      fastestQuery,
      queriesByHour
    }
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(): {
    threshold: number
    slowQueries: QueryMetrics[]
    topSlowQueries: { query: string; avgDuration: number; count: number }[]
  } {
    const slowQueries = this.queryMetrics.filter(m => m.duration > this.slowQueryThreshold)

    // Group by query pattern and calculate averages
    const queryGroups: { [key: string]: { durations: number[]; count: number } } = {}
    
    slowQueries.forEach(m => {
      // Normalize query by removing specific values
      const normalizedQuery = m.query
        .replace(/\$\d+/g, '$?') // Replace parameter placeholders
        .replace(/\d+/g, 'N') // Replace numbers
        .replace(/'[^']*'/g, "'?'") // Replace string literals
        .substring(0, 200) // Limit length

      if (!queryGroups[normalizedQuery]) {
        queryGroups[normalizedQuery] = { durations: [], count: 0 }
      }
      
      queryGroups[normalizedQuery].durations.push(m.duration)
      queryGroups[normalizedQuery].count++
    })

    const topSlowQueries = Object.entries(queryGroups)
      .map(([query, data]) => ({
        query,
        avgDuration: Math.round(data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length),
        count: data.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)

    return {
      threshold: this.slowQueryThreshold,
      slowQueries: slowQueries.slice(-20), // Last 20 slow queries
      topSlowQueries
    }
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.queryMetrics = []
    console.log('Database metrics history cleared')
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): QueryMetrics[] {
    return [...this.queryMetrics]
  }

  /**
   * Get database size and table statistics
   */
  async getDatabaseStats(): Promise<{
    databaseSize: string
    tableStats: Array<{
      tableName: string
      rowCount: number
      tableSize: string
      indexSize: string
    }>
  }> {
    try {
      const client = await pool.connect()

      // Get database size
      const dbSizeResult = await this.monitoredQuery(
        client,
        "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
      )
      const databaseSize = dbSizeResult.rows[0]?.size || '0 bytes'

      // Get table statistics
      const tableStatsResult = await this.monitoredQuery(
        client,
        `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
        FROM pg_stat_user_tables 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `
      )

      // Get row counts for each table
      const tableStats = []
      for (const table of tableStatsResult.rows) {
        try {
          const countResult = await this.monitoredQuery(
            client,
            `SELECT COUNT(*) as count FROM ${table.schemaname}.${table.tablename}`
          )
          
          tableStats.push({
            tableName: `${table.schemaname}.${table.tablename}`,
            rowCount: parseInt(countResult.rows[0]?.count || '0'),
            tableSize: table.table_size,
            indexSize: table.index_size
          })
        } catch (error) {
          console.warn(`Could not get row count for ${table.tablename}:`, error)
          tableStats.push({
            tableName: `${table.schemaname}.${table.tablename}`,
            rowCount: 0,
            tableSize: table.table_size,
            indexSize: table.index_size
          })
        }
      }

      client.release()

      return {
        databaseSize,
        tableStats
      }
    } catch (error) {
      console.error('Error getting database stats:', error)
      return {
        databaseSize: '0 bytes',
        tableStats: []
      }
    }
  }
}

// Export singleton instance
export const dbMonitoringService = DatabaseMonitoringService.getInstance()