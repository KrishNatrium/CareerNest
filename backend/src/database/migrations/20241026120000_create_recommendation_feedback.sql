-- UP
-- Create recommendation_feedback table for tracking user feedback on recommendations
CREATE TABLE recommendation_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'applied')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, internship_id)
);

-- Create indexes for performance
CREATE INDEX idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX idx_recommendation_feedback_internship_id ON recommendation_feedback(internship_id);
CREATE INDEX idx_recommendation_feedback_type ON recommendation_feedback(feedback_type);

-- Create trigger for updated_at
CREATE TRIGGER update_recommendation_feedback_updated_at BEFORE UPDATE ON recommendation_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN
-- Drop trigger
DROP TRIGGER IF EXISTS update_recommendation_feedback_updated_at ON recommendation_feedback;

-- Drop indexes
DROP INDEX IF EXISTS idx_recommendation_feedback_user_id;
DROP INDEX IF EXISTS idx_recommendation_feedback_internship_id;
DROP INDEX IF EXISTS idx_recommendation_feedback_type;

-- Drop table
DROP TABLE IF EXISTS recommendation_feedback;