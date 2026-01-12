-- Add staff_ids column to team_kit_issues for tracking kit issued to staff
ALTER TABLE team_kit_issues 
ADD COLUMN IF NOT EXISTS staff_ids JSONB DEFAULT '[]'::jsonb;