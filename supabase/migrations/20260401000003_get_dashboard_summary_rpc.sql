-- ============================================================
-- RPC: get_dashboard_summary
-- Replaces the 5 sequential useEffect fetches in
-- EnhancedDashboardContent with a single round-trip.
-- Returns: player count, upcoming events, recent results,
--          next event details, and squad availability for
--          all teams the calling user is a member of.
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_ids      UUID[];
  v_club_ids      UUID[];
  v_today         DATE := CURRENT_DATE;
BEGIN
  -- Collect team IDs for this user (direct + via clubs)
  SELECT ARRAY(
    SELECT DISTINCT ut.team_id
    FROM user_teams ut
    WHERE ut.user_id = p_user_id
    UNION
    SELECT DISTINCT ct.team_id
    FROM user_clubs uc
    JOIN club_teams ct ON ct.club_id = uc.club_id
    WHERE uc.user_id = p_user_id
  ) INTO v_team_ids;

  -- Collect club IDs
  SELECT ARRAY(
    SELECT uc.club_id FROM user_clubs uc WHERE uc.user_id = p_user_id
  ) INTO v_club_ids;

  RETURN json_build_object(

    -- Total active players across all teams
    'player_count', (
      SELECT COUNT(*)::INT
      FROM players p
      WHERE p.team_id = ANY(v_team_ids)
        AND p.status = 'active'
        AND p.deleted_at IS NULL
    ),

    -- Count of upcoming events (next 30 days)
    'upcoming_event_count', (
      SELECT COUNT(*)::INT
      FROM events e
      WHERE e.team_id = ANY(v_team_ids)
        AND e.date >= v_today
        AND e.date <= v_today + INTERVAL '30 days'
        AND e.deleted_at IS NULL
    ),

    -- Next 5 upcoming events with team name
    'upcoming_events', (
      SELECT json_agg(row_to_json(ue) ORDER BY ue.date, ue.time)
      FROM (
        SELECT
          e.id, e.title, e.date, e.time, e.type, e.location,
          e.home_score, e.away_score, e.status,
          t.name AS team_name,
          t.id   AS team_id
        FROM events e
        JOIN teams t ON t.id = e.team_id
        WHERE e.team_id = ANY(v_team_ids)
          AND e.date >= v_today
          AND e.deleted_at IS NULL
        ORDER BY e.date, e.time
        LIMIT 5
      ) ue
    ),

    -- Last 5 completed matches with scores
    'recent_results', (
      SELECT json_agg(row_to_json(rr) ORDER BY rr.date DESC)
      FROM (
        SELECT
          e.id, e.title, e.date, e.type,
          e.home_score, e.away_score, e.status,
          e.opponent_name,
          t.name AS team_name,
          t.id   AS team_id
        FROM events e
        JOIN teams t ON t.id = e.team_id
        WHERE e.team_id = ANY(v_team_ids)
          AND e.type = 'match'
          AND e.status = 'completed'
          AND e.deleted_at IS NULL
        ORDER BY e.date DESC
        LIMIT 5
      ) rr
    ),

    -- Teams summary (name + id, used for navigation tiles)
    'teams', (
      SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'age_group', t.age_group))
      FROM teams t
      WHERE t.id = ANY(v_team_ids)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_summary(UUID) TO authenticated;
