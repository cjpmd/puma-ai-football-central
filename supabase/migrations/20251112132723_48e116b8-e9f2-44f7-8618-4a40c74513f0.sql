-- Add new fields to training_sessions table for Training Pack feature
ALTER TABLE training_sessions 
  ADD COLUMN IF NOT EXISTS session_objectives text,
  ADD COLUMN IF NOT EXISTS session_intensity text CHECK (session_intensity IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS coach_reflection text,
  ADD COLUMN IF NOT EXISTS session_rating integer CHECK (session_rating >= 1 AND session_rating <= 5);

-- Add new fields to training_session_drills for post-session notes
ALTER TABLE training_session_drills
  ADD COLUMN IF NOT EXISTS observed_notes text,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;