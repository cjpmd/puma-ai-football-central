ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS match_timer_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_timer_paused_elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_timer_is_running boolean NOT NULL DEFAULT false;