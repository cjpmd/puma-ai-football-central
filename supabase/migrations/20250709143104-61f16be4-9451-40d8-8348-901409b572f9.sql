
-- Add home location fields to teams table
ALTER TABLE teams 
ADD COLUMN home_location TEXT,
ADD COLUMN home_latitude NUMERIC,
ADD COLUMN home_longitude NUMERIC;
