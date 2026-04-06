-- Performance: statement timeouts and additional indexes
-- Prevents runaway queries from blocking the connection pool

-- Set default statement timeout for authenticated users (10 seconds)
-- and anon users (5 seconds). Applied at the database-role level so every
-- connection inherits the limit without changes to application code.
ALTER ROLE authenticated SET statement_timeout = '10s';
ALTER ROLE anon SET statement_timeout = '5s';

-- ─── Additional composite indexes ────────────────────────────────────────────
-- These complement the indexes added in the previous performance migration.
-- All created CONCURRENTLY to avoid locking production tables.

-- event_invitations: filter by event + type, then player_id lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_invitations_event_type
  ON event_invitations (event_id, invitee_type)
  WHERE player_id IS NOT NULL;

-- training_sessions: team lookup ordered by created_at (for recent sessions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_team_created
  ON training_sessions (team_id, created_at DESC);

-- training_session_drills: join on session → drill
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_session_drills_session
  ON training_session_drills (training_session_id, drill_id);

-- drills: public + owner filter used by training recommendation service
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drills_public_owner
  ON drills (is_public, created_by, created_at DESC);

-- team_squads: the four-column filter used by squad management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_squads_event_team_number
  ON team_squads (event_id, team_id, team_number);

-- user_players: player-side lookup (already have user-side from earlier migration)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_players_player_id
  ON user_players (player_id, user_id);
