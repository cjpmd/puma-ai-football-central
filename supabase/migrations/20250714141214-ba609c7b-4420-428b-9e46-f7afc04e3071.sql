-- Add push_token column to profiles table for push notifications
ALTER TABLE public.profiles 
ADD COLUMN push_token TEXT;

-- Add an index for faster lookups when sending push notifications
CREATE INDEX idx_profiles_push_token ON public.profiles(push_token) WHERE push_token IS NOT NULL;