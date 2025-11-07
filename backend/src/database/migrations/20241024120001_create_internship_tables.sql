-- UP
-- Create internships table
CREATE TABLE internships (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    stipend INTEGER,
    duration_months INTEGER,
    work_type VARCHAR(20) DEFAULT 'office' CHECK (work_type IN ('remote', 'office', 'hybrid')),
    required_skills TEXT[],
    application_url VARCHAR(500),
    source_website VARCHAR(100) NOT NULL,
    external_id VARCHAR(255),
    posted_date DATE,
    application_deadline DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_website, external_id)
);

-- Create user_applications table
CREATE TABLE user_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
    application_status VARCHAR(50) DEFAULT 'applied' CHECK (
        application_status IN ('applied', 'under_review', 'interview_scheduled', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn')
    ),
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    reminder_date DATE,
    UNIQUE(user_id, internship_id)
);

-- Create scraping_jobs table
CREATE TABLE scraping_jobs (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('full_scrape', 'incremental', 'webhook', 'monitoring')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create update_notifications table
CREATE TABLE update_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (
        notification_type IN ('new_match', 'deadline_reminder', 'status_change', 'new_internship', 'internship_updated')
    ),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_method VARCHAR(20) DEFAULT 'websocket' CHECK (delivery_method IN ('websocket', 'email', 'push')),
    metadata JSONB
);

-- Create performance indexes
CREATE INDEX idx_internships_active ON internships(is_active);
CREATE INDEX idx_internships_company ON internships(company_name);
CREATE INDEX idx_internships_location ON internships(location);
CREATE INDEX idx_internships_posted_date ON internships(posted_date DESC);
CREATE INDEX idx_internships_deadline ON internships(application_deadline);
CREATE INDEX idx_internships_source ON internships(source_website, external_id);

-- Create GIN indexes for skill arrays and location searches
CREATE INDEX idx_internships_skills_gin ON internships USING GIN(required_skills);
CREATE INDEX idx_internships_location_gin ON internships USING GIN(to_tsvector('english', location));
CREATE INDEX idx_internships_title_gin ON internships USING GIN(to_tsvector('english', title));
CREATE INDEX idx_internships_description_gin ON internships USING GIN(to_tsvector('english', description));
CREATE INDEX idx_internships_company_gin ON internships USING GIN(to_tsvector('english', company_name));

-- Create indexes for application tracking
CREATE INDEX idx_user_applications_user_id ON user_applications(user_id);
CREATE INDEX idx_user_applications_internship_id ON user_applications(internship_id);
CREATE INDEX idx_user_applications_status ON user_applications(application_status);
CREATE INDEX idx_user_applications_applied_date ON user_applications(applied_date DESC);
CREATE INDEX idx_user_applications_reminder ON user_applications(reminder_date) WHERE reminder_date IS NOT NULL;

-- Create indexes for scraping jobs
CREATE INDEX idx_scraping_jobs_source ON scraping_jobs(source_name);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_next_run ON scraping_jobs(next_run_at) WHERE next_run_at IS NOT NULL;
CREATE INDEX idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_unread ON update_notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_sent ON update_notifications(user_id, sent_at DESC);
CREATE INDEX idx_notifications_type ON update_notifications(notification_type);
CREATE INDEX idx_notifications_internship ON update_notifications(internship_id);

-- Create triggers for updated_at
CREATE TRIGGER update_internships_updated_at BEFORE UPDATE ON internships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_applications_updated_at BEFORE UPDATE ON user_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update last_updated on application status change
CREATE OR REPLACE FUNCTION update_application_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
        NEW.last_updated = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_application_status_timestamp BEFORE UPDATE ON user_applications
    FOR EACH ROW EXECUTE FUNCTION update_application_last_updated();

-- DOWN
-- Drop triggers
DROP TRIGGER IF EXISTS update_internships_updated_at ON internships;
DROP TRIGGER IF EXISTS update_user_applications_updated_at ON user_applications;
DROP TRIGGER IF EXISTS update_application_status_timestamp ON user_applications;

-- Drop functions
DROP FUNCTION IF EXISTS update_application_last_updated();

-- Drop indexes
DROP INDEX IF EXISTS idx_internships_active;
DROP INDEX IF EXISTS idx_internships_company;
DROP INDEX IF EXISTS idx_internships_location;
DROP INDEX IF EXISTS idx_internships_posted_date;
DROP INDEX IF EXISTS idx_internships_deadline;
DROP INDEX IF EXISTS idx_internships_source;
DROP INDEX IF EXISTS idx_internships_skills_gin;
DROP INDEX IF EXISTS idx_internships_location_gin;
DROP INDEX IF EXISTS idx_internships_title_gin;
DROP INDEX IF EXISTS idx_internships_description_gin;
DROP INDEX IF EXISTS idx_internships_company_gin;
DROP INDEX IF EXISTS idx_user_applications_user_id;
DROP INDEX IF EXISTS idx_user_applications_internship_id;
DROP INDEX IF EXISTS idx_user_applications_status;
DROP INDEX IF EXISTS idx_user_applications_applied_date;
DROP INDEX IF EXISTS idx_user_applications_reminder;
DROP INDEX IF EXISTS idx_scraping_jobs_source;
DROP INDEX IF EXISTS idx_scraping_jobs_status;
DROP INDEX IF EXISTS idx_scraping_jobs_next_run;
DROP INDEX IF EXISTS idx_scraping_jobs_created;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_user_sent;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_internship;

-- Drop tables (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS update_notifications;
DROP TABLE IF EXISTS scraping_jobs;
DROP TABLE IF EXISTS user_applications;
DROP TABLE IF EXISTS internships;