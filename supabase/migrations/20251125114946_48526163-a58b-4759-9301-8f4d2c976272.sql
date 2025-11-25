-- Add player_attributes column to teams table to store team-specific attribute configurations
ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_attributes jsonb DEFAULT NULL;

COMMENT ON COLUMN teams.player_attributes IS 'Team-specific player attribute configuration including custom attributes and enabled/disabled states';