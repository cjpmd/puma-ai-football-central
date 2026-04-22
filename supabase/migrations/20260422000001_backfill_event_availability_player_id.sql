-- Backfill player_id into event_availability rows where role='player' and player_id is NULL.
-- These rows were created without player_id due to a mapping bug in eventsService.ts
-- (the player_id field from invitation records was not propagated to availability records).
-- All lookup code queries by player_id, so missing it prevented acceptance from persisting.
UPDATE public.event_availability ea
SET player_id = up.player_id
FROM public.user_players up
WHERE ea.role = 'player'
  AND ea.player_id IS NULL
  AND ea.user_id = up.user_id;

-- Partial index to speed up the player_id-based lookups used on every availability load.
CREATE INDEX IF NOT EXISTS idx_event_availability_player_id_role
  ON public.event_availability (player_id, event_id)
  WHERE player_id IS NOT NULL;
