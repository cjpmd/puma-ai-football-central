-- Add new privacy columns for Game Day, Team Selection (Setup), and Formation visibility
-- All default to true (hidden) as per requirement that buttons should be off by default

ALTER TABLE public.team_privacy_settings
ADD COLUMN IF NOT EXISTS hide_gameday_from_parents boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_gameday_from_players boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_setup_from_parents boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_setup_from_players boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_formation_from_parents boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_formation_from_players boolean NOT NULL DEFAULT true;