-- UP
CREATE TABLE IF NOT EXISTS scraping_logs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  job_id VARCHAR(255),
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scraping_logs_source ON scraping_logs(source);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_level ON scraping_logs(level);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_timestamp ON scraping_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_job_id ON scraping_logs(job_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_scraping_logs_source_level_timestamp 
ON scraping_logs(source, level, timestamp);

-- DOWN
DROP TABLE IF EXISTS scraping_logs CASCADE;