
-- Add latitude and longitude columns to the events table
ALTER TABLE public.events 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add index for location-based queries (optional but recommended)
CREATE INDEX idx_events_location ON public.events (latitude, longitude);
