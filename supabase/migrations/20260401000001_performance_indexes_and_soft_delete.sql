-- ============================================================
-- Performance: Composite indexes for most common query patterns
-- ============================================================

-- Events by team and date (Dashboard upcoming/recent, Calendar)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_team_date
  ON events(team_id, date DESC);

-- Event selections by event (GameDay, team selection)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_selections_event_team
  ON event_selections(event_id, team_number);

-- Player stats by player (profile page, analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eps_player_event
  ON event_player_stats(player_id, event_id);

-- Player stats by event (GameDay summary, post-match analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eps_event_created
  ON event_player_stats(event_id, created_at DESC);

-- Availability by event (squad selection, availability view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_event_user
  ON player_availability(event_id, user_id);

-- Players by team filtered to active (the single most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_team_status
  ON players(team_id, status)
  WHERE status = 'active';

-- user_teams for auth context loading (fires on every login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_teams_user_id
  ON user_teams(user_id);

-- user_clubs for auth context loading
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_clubs_user_id
  ON user_clubs(user_id);

-- ============================================================
-- Soft delete: add deleted_at columns to players and events
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes that exclude soft-deleted rows so existing
-- queries automatically skip them without filter changes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_active_not_deleted
  ON players(team_id, squad_number)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_not_deleted
  ON events(team_id, date DESC)
  WHERE deleted_at IS NULL;

-- Helper RLS-safe function for coaches/admins to restore a player
CREATE OR REPLACE FUNCTION restore_player(p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE players SET deleted_at = NULL WHERE id = p_player_id;
END;
$$;
