-- Add club_id to drills table for club-scoped drill library
--
-- After this migration drills fall into three visibility buckets:
--   1. club_id IS NOT NULL → visible only to members of that club
--   2. club_id IS NULL AND is_public = true → globally visible shared drills
--   3. club_id IS NULL AND is_public = false → private to the creator only
--
-- Existing drills (club_id IS NULL) remain accessible as "public" drills;
-- no data is lost. New drills created through the UI should carry the club_id
-- of the creating coach's current club.

ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_drills_club_id ON public.drills (club_id);
