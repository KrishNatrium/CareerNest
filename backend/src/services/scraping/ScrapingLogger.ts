import { pool } from '../../config/database';

export interface ScrapingLogEntry {
  id?: number;
  source: string;
  job_id?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface LogQuery {
  source?: string;
  level?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ScrapingLogger {
  private static instance: ScrapingLogger;
  private logBuffer: ScrapingLogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicFlush();
  }

  static getInstance(): ScrapingLogger {
    if (!ScrapingLogger.instance) {
      ScrapingLogger.instance = new ScrapingLogger();
    }
    return ScrapingLogger.instance;
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.flushInterval);
  }

  async log(entry: Omit<ScrapingLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: ScrapingLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Also log to console for immediate visibility
    const logMessage = `[${entry.level.toUpperCase()}] ${entry.source}: ${entry.message}`;
    switch (entry.level) {
      case 'error':
        console.error(logMessage, entry.metadata);
        break;
      case 'warn':
        console.warn(logMessage, entry.metadata);
        break;
      case 'debug':
        console.debug(logMessage, entry.metadata);
        break;
      default:
        console.log(logMessage, entry.metadata);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async info(source: string, message: string, metadata?: Record<string, any>, jobId?: string): Promise<void> {
    const entry: any = { source, level: 'info', message };
    if (metadata) entry.metadata = metadata;
    if (jobId) entry.job_id = jobId;
    await this.log(entry);
  }

  async warn(source: string, message: string, metadata?: Record<string, any>, jobId?: string): Promise<void> {
    const entry: any = { source, level: 'warn', message };
    if (metadata) entry.metadata = metadata;
    if (jobId) entry.job_id = jobId;
    await this.log(entry);
  }

  async error(source: string, message: string, metadata?: Record<string, any>, jobId?: string): Promise<void> {
    const entry: any = { source, level: 'error', message };
    if (metadata) entry.metadata = metadata;
    if (jobId) entry.job_id = jobId;
    await this.log(entry);
  }

  async debug(source: string, message: string, metadata?: Record<string, any>, jobId?: string): Promise<void> {
    const entry: any = { source, level: 'debug', message };
    if (metadata) entry.metadata = metadata;
    if (jobId) entry.job_id = jobId;
    await this.log(entry);
  }

  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.batchInsertLogs(logsToFlush);
    } catch (error) {
      console.error('Failed to flush scraping logs:', error);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private async batchInsertLogs(logs: ScrapingLogEntry[]): Promise<void> {
    if (logs.length === 0) return;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO scraping_logs (source, job_id, level, message, metadata, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const log of logs) {
        await client.query(query, [
          log.source,
          log.job_id || null,
          log.level,
          log.message,
          log.metadata ? JSON.stringify(log.metadata) : null,
          log.timestamp
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLogs(query: LogQuery = {}): Promise<{
    logs: ScrapingLogEntry[];
    total: number;
  }> {
    const client = await pool.connect();
    
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (query.source) {
        conditions.push(`source = $${paramCount}`);
        params.push(query.source);
        paramCount++;
      }

      if (query.level) {
        conditions.push(`level = $${paramCount}`);
        params.push(query.level);
        paramCount++;
      }

      if (query.startDate) {
        conditions.push(`timestamp >= $${paramCount}`);
        params.push(query.startDate);
        paramCount++;
      }

      if (query.endDate) {
        conditions.push(`timestamp <= $${paramCount}`);
        params.push(query.endDate);
        paramCount++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM scraping_logs ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get logs with pagination
      const limit = query.limit || 100;
      const offset = query.offset || 0;
      
      const logsQuery = `
        SELECT id, source, job_id, level, message, metadata, timestamp
        FROM scraping_logs 
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const logsResult = await client.query(logsQuery, [...params, limit, offset]);
      
      const logs = logsResult.rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }));

      return { logs, total };
    } finally {
      client.release();
    }
  }

  async getLogStats(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsBySource: Record<string, number>;
    recentErrors: number;
  }> {
    const client = await pool.connect();
    
    try {
      // Total logs
      const totalQuery = 'SELECT COUNT(*) as total FROM scraping_logs';
      const totalResult = await client.query(totalQuery);
      
      // Logs by level
      const levelQuery = `
        SELECT level, COUNT(*) as count 
        FROM scraping_logs 
        GROUP BY level
      `;
      const levelResult = await client.query(levelQuery);
      
      // Logs by source
      const sourceQuery = `
        SELECT source, COUNT(*) as count 
        FROM scraping_logs 
        GROUP BY source
      `;
      const sourceResult = await client.query(sourceQuery);
      
      // Recent errors (last 24 hours)
      const errorsQuery = `
        SELECT COUNT(*) as count 
        FROM scraping_logs 
        WHERE level = 'error' AND timestamp >= NOW() - INTERVAL '24 hours'
      `;
      const errorsResult = await client.query(errorsQuery);

      const logsByLevel: Record<string, number> = {};
      levelResult.rows.forEach(row => {
        logsByLevel[row.level] = parseInt(row.count);
      });

      const logsBySource: Record<string, number> = {};
      sourceResult.rows.forEach(row => {
        logsBySource[row.source] = parseInt(row.count);
      });

      return {
        totalLogs: parseInt(totalResult.rows[0].total),
        logsByLevel,
        logsBySource,
        recentErrors: parseInt(errorsResult.rows[0].count)
      };
    } finally {
      client.release();
    }
  }

  async cleanupOldLogs(daysOld: number = 30): Promise<number> {
    const client = await pool.connect();
    
    try {
      const query = `
        DELETE FROM scraping_logs 
        WHERE timestamp < NOW() - INTERVAL '${daysOld} days'
      `;
      
      const result = await client.query(query);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining logs
    await this.flush();
  }
}