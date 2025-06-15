
-- Add game_duration column to teams table
ALTER TABLE teams ADD COLUMN game_duration integer DEFAULT 90;

-- Add game_duration column to events table if it doesn't exist
ALTER TABLE events ADD COLUMN game_duration integer;
