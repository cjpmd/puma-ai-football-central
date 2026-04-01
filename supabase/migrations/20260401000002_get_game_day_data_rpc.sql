-- ============================================================
-- RPC: get_game_day_data
-- Eliminates the 4-query waterfall in GameDayView by returning
-- event + team + players + selections in a single round-trip.
-- ============================================================

CREATE OR REPLACE FUNCTION get_game_day_data(p_event_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    -- The event itself
    'event', (
      SELECT row_to_json(e)
      FROM events e
      WHERE e.id = p_event_id
        AND e.deleted_at IS NULL
    ),

    -- The owning team (logo + kit designs for rendering)
    'team', (
      SELECT json_build_object(
        'id',          t.id,
        'name',        t.name,
        'logo_url',    t.logo_url,
        'kit_designs', t.kit_designs
      )
      FROM teams t
      WHERE t.id = (SELECT team_id FROM events WHERE id = p_event_id)
    ),

    -- Active players for the team (name + squad_number for display)
    'players', (
      SELECT json_agg(
        json_build_object(
          'id',           p.id,
          'name',         p.name,
          'squad_number', p.squad_number
        )
        ORDER BY p.squad_number
      )
      FROM players p
      WHERE p.team_id = (SELECT team_id FROM events WHERE id = p_event_id)
        AND p.status = 'active'
        AND p.deleted_at IS NULL
    ),

    -- All team selections with performance category name
    'selections', (
      SELECT json_agg(row_to_json(es) ORDER BY es.team_number, es.period_number)
      FROM (
        SELECT
          s.*,
          pc.name AS performance_category_name
        FROM event_selections s
        LEFT JOIN performance_categories pc ON pc.id = s.performance_category_id
        WHERE s.event_id = p_event_id
      ) es
    )
  );
$$;

-- Grant execute to authenticated users (RLS on underlying tables
-- still applies to direct table access; this function uses
-- SECURITY DEFINER so callers only need execute permission)
GRANT EXECUTE ON FUNCTION get_game_day_data(UUID) TO authenticated;
