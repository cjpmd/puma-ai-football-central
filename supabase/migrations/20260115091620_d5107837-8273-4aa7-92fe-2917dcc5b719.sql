-- Add player_id column to event_availability for player-based availability
ALTER TABLE public.event_availability 
ADD COLUMN player_id UUID REFERENCES public.players(id) ON DELETE CASCADE;

-- Add last_updated_by to track who made the change
ALTER TABLE public.event_availability 
ADD COLUMN last_updated_by UUID REFERENCES auth.users(id);

-- Create index for faster lookups by player_id
CREATE INDEX idx_event_availability_player_id ON public.event_availability(player_id);

-- First, update player_id for all player role records
UPDATE public.event_availability ea
SET player_id = up.player_id
FROM public.user_players up
WHERE ea.user_id = up.user_id
AND ea.role = 'player'
AND ea.player_id IS NULL;

-- Consolidate duplicate player records (keep the most recent non-pending response)
-- Delete duplicates, keeping the one with the best status (available > unavailable > pending)
DELETE FROM public.event_availability ea1
USING public.event_availability ea2
WHERE ea1.event_id = ea2.event_id
  AND ea1.player_id = ea2.player_id
  AND ea1.role = 'player'
  AND ea2.role = 'player'
  AND ea1.player_id IS NOT NULL
  AND ea2.player_id IS NOT NULL
  AND ea1.id != ea2.id
  AND (
    -- Keep the one with 'available' status if it exists
    (ea2.status = 'available' AND ea1.status != 'available')
    OR
    -- If no 'available', keep the one with 'unavailable' status
    (ea2.status = 'unavailable' AND ea1.status = 'pending')
    OR
    -- If same status, keep the more recently updated one
    (ea1.status = ea2.status AND ea1.updated_at < ea2.updated_at)
  );

-- Now create the unique index for player-based availability
CREATE UNIQUE INDEX event_availability_player_unique 
ON public.event_availability(event_id, player_id, role) 
WHERE player_id IS NOT NULL;

-- Update RLS policies to allow any linked user to see/update player-based availability
DROP POLICY IF EXISTS "Users can view their own availability" ON public.event_availability;
CREATE POLICY "Users can view their own availability"
ON public.event_availability FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    player_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.user_players up 
      WHERE up.player_id = event_availability.player_id 
      AND up.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own availability" ON public.event_availability;
CREATE POLICY "Users can update their own availability"
ON public.event_availability FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    player_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.user_players up 
      WHERE up.player_id = event_availability.player_id 
      AND up.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert their own availability" ON public.event_availability;
CREATE POLICY "Users can insert their own availability"
ON public.event_availability FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR (
    player_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.user_players up 
      WHERE up.player_id = event_availability.player_id 
      AND up.user_id = auth.uid()
    )
  )
);