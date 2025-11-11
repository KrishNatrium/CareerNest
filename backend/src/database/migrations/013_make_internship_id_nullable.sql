-- Migration to make internship_id nullable and add manual entry fields
-- This allows users to track applications from external sources

-- Make internship_id nullable
ALTER TABLE user_applications 
ALTER COLUMN internship_id DROP NOT NULL;

-- Add fields for manual application entries
ALTER TABLE user_applications
ADD COLUMN IF NOT EXISTS manual_company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS manual_position_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS manual_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS manual_application_url TEXT,
ADD COLUMN IF NOT EXISTS manual_deadline DATE,
ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE;

-- Update the unique constraint to handle manual entries
ALTER TABLE user_applications 
DROP CONSTRAINT IF EXISTS user_applications_user_id_internship_id_key;

-- Create a partial unique index for non-manual entries only
CREATE UNIQUE INDEX IF NOT EXISTS user_applications_user_internship_unique 
ON user_applications (user_id, internship_id) 
WHERE internship_id IS NOT NULL;

-- Add check constraint to ensure either internship_id or manual fields are provided
ALTER TABLE user_applications
ADD CONSTRAINT check_application_source CHECK (
  (internship_id IS NOT NULL) OR 
  (is_manual_entry = TRUE AND manual_company_name IS NOT NULL AND manual_position_title IS NOT NULL)
);

COMMENT ON COLUMN user_applications.manual_company_name IS 'Company name for manually entered applications';
COMMENT ON COLUMN user_applications.manual_position_title IS 'Position title for manually entered applications';
COMMENT ON COLUMN user_applications.manual_location IS 'Location for manually entered applications';
COMMENT ON COLUMN user_applications.manual_application_url IS 'Application URL for manually entered applications';
COMMENT ON COLUMN user_applications.manual_deadline IS 'Application deadline for manually entered applications';
COMMENT ON COLUMN user_applications.is_manual_entry IS 'Flag to indicate if this is a manually entered application';
