-- Add team-specific timing columns to event_teams table
ALTER TABLE event_teams 
ADD COLUMN start_time TIME,
ADD COLUMN meeting_time TIME;

-- Update existing records to inherit from their parent events
UPDATE event_teams 
SET start_time = events.start_time,
    meeting_time = events.meeting_time
FROM events 
WHERE event_teams.event_id = events.id;