-- Fix unique constraint to allow same player in multiple teams for same event
-- Drop the old constraint that prevents players from being in multiple teams
ALTER TABLE team_squads DROP CONSTRAINT IF EXISTS team_squads_team_id_player_id_event_id_key;

-- Add correct constraint that includes team_number to allow same player in different teams
ALTER TABLE team_squads ADD CONSTRAINT team_squads_unique_assignment 
UNIQUE(team_id, player_id, event_id, team_number);