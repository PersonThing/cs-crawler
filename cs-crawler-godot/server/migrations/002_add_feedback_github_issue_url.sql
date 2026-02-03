-- Migration: Add github_issue_url column to feedback table
-- This migration ensures the feedback table exists and has the github_issue_url column

-- Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    feedback_type VARCHAR(50) DEFAULT 'general',
    message TEXT NOT NULL,
    github_issue_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add github_issue_url column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feedback' AND column_name = 'github_issue_url'
    ) THEN
        ALTER TABLE feedback ADD COLUMN github_issue_url TEXT;
    END IF;
END $$;

COMMENT ON TABLE feedback IS 'User feedback submissions';
COMMENT ON COLUMN feedback.github_issue_url IS 'URL of GitHub issue created from this feedback';
