-- Add team_number column to team_squads table to support multiple teams per event
ALTER TABLE team_squads ADD COLUMN team_number INTEGER NOT NULL DEFAULT 1;

-- Update existing records to have team_number = 1 (default for existing data)
UPDATE team_squads SET team_number = 1 WHERE team_number IS NULL;

-- Create index for better performance
CREATE INDEX idx_team_squads_event_team ON team_squads(event_id, team_id, team_number);