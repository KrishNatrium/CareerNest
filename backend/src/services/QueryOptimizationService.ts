
import { pool } from '../config/database'
import { dbMonitoringService } from './DatabaseMonitoringService'

export interface IndexRecommendation {
  tableName: string
  columnName: string
  indexType: 'btree' | 'gin' | 'gist' | 'hash'
  reason: string
  estimatedImpact: 'high' | 'medium' | 'low'
  createStatement: string
}

export interface QueryOptimization {
  originalQuery: string
  optimizedQuery: string
  explanation: string
  estimatedImprovement: string
}

export class QueryOptimizationService {
  private static instance: QueryOptimizationService

  private constructor() {}

  public static getInstance(): QueryOptimizationService {
    if (!QueryOptimizationService.instance) {
      QueryOptimizationService.instance = new QueryOptimizationService()
    }
    return QueryOptimizationService.instance
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQuery(query: string, params?: any[]): Promise<{
    executionPlan: any[]
    recommendations: string[]
    estimatedCost: number
    actualTime?: number
  }> {
    try {
      const client = await pool.connect()

      // Get query execution plan
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
      const planResult = await dbMonitoringService.monitoredQuery(client, explainQuery, params)
      const executionPlan = planResult.rows[0]['QUERY PLAN']

      // Extract cost and time information
      const planNode = executionPlan[0]?.Plan
      const estimatedCost = planNode?.['Total Cost'] || 0
      const actualTime = planNode?.['Actual Total Time'] || undefined

      // Generate recommendations based on execution plan
      const recommendations = this.generateRecommendations(executionPlan[0])

      client.release()

      return {
        executionPlan,
        recommendations,
        estimatedCost,
        actualTime
      }
    } catch (error) {
      console.error('Query analysis error:', error)
      throw error
    }
  }

  /**
   * Generate optimization recommendations from execution plan
   */
  private generateRecommendations(plan: any): string[] {
    const recommendations: string[] = []
    
    if (!plan?.Plan) return recommendations

    const planNode = plan.Plan

    // Check for sequential scans
    if (planNode['Node Type'] === 'Seq Scan') {
      recommendations.push(
        `Consider adding an index on table "${planNode['Relation Name']}" for the filtered columns`
      )
    }

    // Check for high cost operations
    if (planNode['Total Cost'] > 1000) {
      recommendations.push(
        'Query has high estimated cost. Consider optimizing WHERE clauses or adding indexes'
      )
    }

    // Check for nested loops with high row counts
    if (planNode['Node Type'] === 'Nested Loop' && planNode['Actual Rows'] > 1000) {
      recommendations.push(
        'Nested loop with high row count detected. Consider using hash join or merge join instead'
      )
    }

    // Check for sorts without indexes
    if (planNode['Node Type'] === 'Sort' && planNode['Sort Method']?.includes('external')) {
      recommendations.push(
        'External sort detected. Consider adding an index on the ORDER BY columns'
      )
    }

    // Recursively check child plans
    if (planNode.Plans) {
      for (const childPlan of planNode.Plans) {
        const childRecommendations = this.generateRecommendations({ Plan: childPlan })
        recommendations.push(...childRecommendations)
      }
    }

    return recommendations
  }

  /**
   * Get index recommendations based on query patterns
   */
  async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    try {
      const client = await pool.connect()
      const recommendations: IndexRecommendation[] = []

      // Check for missing indexes on foreign keys
      const foreignKeyResult = await dbMonitoringService.monitoredQuery(
        client,
        `
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        `
      )

      for (const fk of foreignKeyResult.rows) {
        // Check if index exists on foreign key column
        const indexExistsResult = await dbMonitoringService.monitoredQuery(
          client,
          `
          SELECT COUNT(*) as count
          FROM pg_indexes 
          WHERE tablename = $1 
            AND indexdef LIKE '%' || $2 || '%'
          `,
          [fk.table_name, fk.column_name]
        )

        if (parseInt(indexExistsResult.rows[0].count) === 0) {
          recommendations.push({
            tableName: fk.table_name,
            columnName: fk.column_name,
            indexType: 'btree',
            reason: 'Foreign key column without index',
            estimatedImpact: 'high',
            createStatement: `CREATE INDEX idx_${fk.table_name}_${fk.column_name} ON ${fk.table_name} (${fk.column_name});`
          })
        }
      }

      // Check for columns frequently used in WHERE clauses (based on common patterns)
      const commonWhereColumns = [
        { table: 'internships', column: 'is_active', type: 'btree' as const },
        { table: 'internships', column: 'location', type: 'btree' as const },
        { table: 'internships', column: 'company_name', type: 'btree' as const },
        { table: 'internships', column: 'created_at', type: 'btree' as const },
        { table: 'internships', column: 'application_deadline', type: 'btree' as const },
        { table: 'internships', column: 'required_skills', type: 'gin' as const },
        { table: 'user_applications', column: 'application_status', type: 'btree' as const },
        { table: 'users', column: 'email', type: 'btree' as const }
      ]

      for (const col of commonWhereColumns) {
        const indexExistsResult = await dbMonitoringService.monitoredQuery(
          client,
          `
          SELECT COUNT(*) as count
          FROM pg_indexes 
          WHERE tablename = $1 
            AND indexdef LIKE '%' || $2 || '%'
          `,
          [col.table, col.column]
        )

        if (parseInt(indexExistsResult.rows[0].count) === 0) {
          const createStatement = col.type === 'gin'
            ? `CREATE INDEX idx_${col.table}_${col.column} ON ${col.table} USING GIN (${col.column});`
            : `CREATE INDEX idx_${col.table}_${col.column} ON ${col.table} (${col.column});`

          recommendations.push({
            tableName: col.table,
            columnName: col.column,
            indexType: col.type,
            reason: 'Frequently filtered column',
            estimatedImpact: 'medium',
            createStatement
          })
        }
      }

      // Check for composite index opportunities
      const compositeIndexes = [
        {
          table: 'internships',
          columns: ['is_active', 'created_at'],
          reason: 'Common filter combination for recent active internships'
        },
        {
          table: 'internships',
          columns: ['is_active', 'location'],
          reason: 'Common filter combination for location-based searches'
        },
        {
          table: 'user_applications',
          columns: ['user_id', 'application_status'],
          reason: 'User application status queries'
        }
      ]

      for (const idx of compositeIndexes) {
        const indexExistsResult = await dbMonitoringService.monitoredQuery(
          client,
          `
          SELECT COUNT(*) as count
          FROM pg_indexes 
          WHERE tablename = $1 
            AND indexdef LIKE '%' || $2 || '%'
            AND indexdef LIKE '%' || $3 || '%'
          `,
          [idx.table, idx.columns[0], idx.columns[1]]
        )

        if (parseInt(indexExistsResult.rows[0].count) === 0) {
          recommendations.push({
            tableName: idx.table,
            columnName: idx.columns.join(', '),
            indexType: 'btree',
            reason: idx.reason,
            estimatedImpact: 'high',
            createStatement: `CREATE INDEX idx_${idx.table}_${idx.columns.join('_')} ON ${idx.table} (${idx.columns.join(', ')});`
          })
        }
      }

      client.release()
      return recommendations
    } catch (error) {
      console.error('Index recommendation error:', error)
      return []
    }
  }

  /**
   * Apply recommended indexes
   */
  async applyIndexRecommendation(recommendation: IndexRecommendation): Promise<boolean> {
    try {
      const client = await pool.connect()
      
      console.log(`Creating index: ${recommendation.createStatement}`)
      await dbMonitoringService.monitoredQuery(client, recommendation.createStatement)
      
      client.release()
      console.log(`✅ Index created successfully: idx_${recommendation.tableName}_${recommendation.columnName}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to create index: ${error}`)
      return false
    }
  }

  /**
   * Get unused indexes that can be dropped
   */
  async getUnusedIndexes(): Promise<Array<{
    indexName: string
    tableName: string
    indexSize: string
    lastUsed: string | null
    dropStatement: string
  }>> {
    try {
      const client = await pool.connect()

      const unusedIndexesResult = await dbMonitoringService.monitoredQuery(
        client,
        `
        SELECT 
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND schemaname = 'public'
          AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
        ORDER BY pg_relation_size(indexrelid) DESC
        `
      )

      const unusedIndexes = unusedIndexesResult.rows.map((row: any) => ({
        indexName: row.indexname,
        tableName: row.tablename,
        indexSize: row.index_size,
        lastUsed: null, // PostgreSQL doesn't track last usage time
        dropStatement: `DROP INDEX IF EXISTS ${row.indexname};`
      }))

      client.release()
      return unusedIndexes
    } catch (error) {
      console.error('Unused indexes query error:', error)
      return []
    }
  }

  /**
   * Optimize common query patterns
   */
  getQueryOptimizations(): QueryOptimization[] {
    return [
      {
        originalQuery: "SELECT * FROM internships WHERE title LIKE '%developer%'",
        optimizedQuery: "SELECT * FROM internships WHERE title ILIKE $1 AND is_active = true",
        explanation: "Use parameterized queries and add active filter to reduce result set",
        estimatedImprovement: "30-50% faster execution"
      },
      {
        originalQuery: "SELECT COUNT(*) FROM internships WHERE location = 'Mumbai'",
        optimizedQuery: "SELECT COUNT(*) FROM internships WHERE location = $1 AND is_active = true",
        explanation: "Add active filter and use parameters to enable query plan caching",
        estimatedImprovement: "20-40% faster execution"
      },
      {
        originalQuery: "SELECT * FROM internships ORDER BY created_at DESC LIMIT 10",
        optimizedQuery: "SELECT * FROM internships WHERE is_active = true ORDER BY created_at DESC LIMIT 10",
        explanation: "Filter inactive records before sorting to reduce sort operation size",
        estimatedImprovement: "15-25% faster execution"
      },
      {
        originalQuery: "SELECT i.*, u.email FROM internships i JOIN user_applications ua ON i.id = ua.internship_id JOIN users u ON ua.user_id = u.id",
        optimizedQuery: "SELECT i.*, u.email FROM internships i JOIN user_applications ua ON i.id = ua.internship_id JOIN users u ON ua.user_id = u.id WHERE i.is_active = true",
        explanation: "Add filters early in the query to reduce join operation size",
        estimatedImprovement: "25-45% faster execution"
      }
    ]
  }

  /**
   * Get database performance recommendations
   */
  async getPerformanceRecommendations(): Promise<{
    connectionPool: string[]
    queryOptimization: string[]
    indexing: string[]
    maintenance: string[]
  }> {
    const health = await dbMonitoringService.getDatabaseHealth()
    const recommendations = {
      connectionPool: [] as string[],
      queryOptimization: [] as string[],
      indexing: [] as string[],
      maintenance: [] as string[]
    }

    // Connection pool recommendations
    if (health.activeConnections / health.maxConnections > 0.8) {
      recommendations.connectionPool.push('Consider increasing the connection pool size')
    }

    if (health.waitingCount > 0) {
      recommendations.connectionPool.push('Queries are waiting for connections. Optimize query performance or increase pool size')
    }

    // Query optimization recommendations
    if (health.averageQueryTime > 500) {
      recommendations.queryOptimization.push('Average query time is high. Review slow queries and add appropriate indexes')
    }

    if (health.errorRate > 5) {
      recommendations.queryOptimization.push('High query error rate detected. Review application error handling')
    }

    // Indexing recommendations
    const indexRecommendations = await this.getIndexRecommendations()
    if (indexRecommendations.length > 0) {
      recommendations.indexing.push(`${indexRecommendations.length} missing indexes detected. Consider adding them for better performance`)
    }

    // Maintenance recommendations
    recommendations.maintenance.push('Run VACUUM ANALYZE regularly to update table statistics')
    recommendations.maintenance.push('Monitor database size and plan for archiving old data')
    recommendations.maintenance.push('Set up automated backups and test recovery procedures')

    return recommendations
  }
}

// Export singleton instance
export const queryOptimizationService = QueryOptimizationService.getInstance()