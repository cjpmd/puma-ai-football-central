-- Add planned_time column to individual_training_sessions table
ALTER TABLE individual_training_sessions 
ADD COLUMN planned_time TIME;