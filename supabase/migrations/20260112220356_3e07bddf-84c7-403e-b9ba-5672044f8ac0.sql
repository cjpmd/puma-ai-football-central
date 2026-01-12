-- Add kit_type column to team_kit_items table
-- Separates playing kit from coaching/staff kit
ALTER TABLE team_kit_items 
ADD COLUMN IF NOT EXISTS kit_type TEXT NOT NULL DEFAULT 'playing' 
CHECK (kit_type IN ('playing', 'coaching', 'both'));

-- Add kit_type column to team_kit_issues table
-- Tracks which type of kit was issued
ALTER TABLE team_kit_issues 
ADD COLUMN IF NOT EXISTS kit_type TEXT NOT NULL DEFAULT 'playing' 
CHECK (kit_type IN ('playing', 'coaching'));

-- Add kit_sizes column to team_staff table for coach kit sizes
ALTER TABLE team_staff 
ADD COLUMN IF NOT EXISTS kit_sizes JSONB DEFAULT '{}';

-- Create index for kit_type queries on team_kit_items
CREATE INDEX IF NOT EXISTS idx_team_kit_items_kit_type ON team_kit_items(kit_type);

-- Create index for kit_type queries on team_kit_issues
CREATE INDEX IF NOT EXISTS idx_team_kit_issues_kit_type ON team_kit_issues(kit_type);

-- Add comment for documentation
COMMENT ON COLUMN team_kit_items.kit_type IS 'Type of kit: playing (for players), coaching (for coaches/staff), or both';
COMMENT ON COLUMN team_kit_issues.kit_type IS 'Type of kit issued: playing (to players) or coaching (to staff)';
COMMENT ON COLUMN team_staff.kit_sizes IS 'JSON object storing kit sizes for coaching/staff kit items';