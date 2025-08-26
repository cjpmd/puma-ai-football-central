-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "availability_requests": true,
  "team_updates": true,
  "match_reminders": true,
  "training_updates": true
}'::jsonb;

-- Add push_token column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;