-- ============================================================
-- ML / AI Readiness: Feature store + Video tracking tables
-- ============================================================

-- ----------------------------------------------------------
-- 1. Player feature snapshots (ML training pipeline)
--    Nightly-computed normalised feature vectors per player.
--    Feed directly into prediction models without re-querying
--    raw match data on every inference.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_feature_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id         UUID        NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  snapshot_date   DATE        NOT NULL,
  -- Normalised feature vector (0-1 scaled numeric features)
  feature_vector  JSONB       NOT NULL DEFAULT '{}',
  -- Raw aggregate stats used to compute the vector
  raw_stats       JSONB       NOT NULL DEFAULT '{}',
  -- Which model/version produced this snapshot
  model_version   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pfs_player_date
  ON player_feature_snapshots(player_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_pfs_team_date
  ON player_feature_snapshots(team_id, snapshot_date DESC);

-- Prevent duplicate snapshots for same player + date
CREATE UNIQUE INDEX IF NOT EXISTS uq_pfs_player_date
  ON player_feature_snapshots(player_id, snapshot_date);

-- Enable RLS
ALTER TABLE player_feature_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read feature snapshots"
  ON player_feature_snapshots
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM user_teams WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- 2. AI result cache
--    Caches AI team-builder responses to avoid duplicate
--    Gemini calls for the same event + squad combination.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_result_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   TEXT        NOT NULL UNIQUE,  -- hash of eventId + sorted squadPlayerIds
  result      JSONB       NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_result_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_result_cache(expires_at);

-- Clean up expired cache entries (run via pg_cron or manually)
CREATE OR REPLACE FUNCTION purge_expired_ai_cache()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  DELETE FROM ai_result_cache WHERE expires_at < NOW();
$$;

-- ----------------------------------------------------------
-- 3. Video sessions (future RunPod player tracking)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        REFERENCES events(id) ON DELETE SET NULL,
  team_id          UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  video_url        TEXT,
  storage_path     TEXT,         -- path in Supabase storage bucket
  processing_status TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (processing_status IN ('pending','processing','complete','failed')),
  fps              INTEGER,
  duration_seconds INTEGER,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_event
  ON video_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_team_status
  ON video_sessions(team_id, processing_status);

ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage video sessions"
  ON video_sessions
  USING (
    team_id IN (
      SELECT team_id FROM user_teams WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- 4. Player tracking data (output of YOLO + DeepSORT)
--    Partitioned by frame_number ranges for query efficiency.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_tracking_data (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_session_id UUID        NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
  player_id        UUID        REFERENCES players(id) ON DELETE SET NULL,
  frame_number     INTEGER     NOT NULL,
  -- Pitch coordinates, 0-100 scale (0,0 = top-left)
  x                NUMERIC(6,2) NOT NULL,
  y                NUMERIC(6,2) NOT NULL,
  -- YOLO detection confidence (0-1)
  confidence       NUMERIC(4,3),
  -- DeepSORT tracker ID (before player identity is resolved)
  tracker_id       INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptd_session_frame
  ON player_tracking_data(video_session_id, frame_number);

CREATE INDEX IF NOT EXISTS idx_ptd_player_session
  ON player_tracking_data(player_id, video_session_id)
  WHERE player_id IS NOT NULL;
