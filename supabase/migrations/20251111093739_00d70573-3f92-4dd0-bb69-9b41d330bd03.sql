-- Fix the remove_unavailable_player_from_event function to properly handle JSONB arrays
CREATE OR REPLACE FUNCTION remove_unavailable_player_from_event(
  p_event_id UUID,
  p_user_id UUID,
  p_player_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_player_id UUID;
  v_removed_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get player_id if not provided
  IF p_player_id IS NULL THEN
    SELECT player_id INTO v_player_id
    FROM user_players
    WHERE user_id = p_user_id
    LIMIT 1;
  ELSE
    v_player_id := p_player_id;
  END IF;

  -- If no player found, return early
  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No player found for user',
      'removed_from_squad', 0,
      'removed_from_formations', 0
    );
  END IF;

  -- 1. Remove from team_squads
  DELETE FROM team_squads
  WHERE event_id = p_event_id
    AND player_id = v_player_id;
  
  GET DIAGNOSTICS v_removed_count = ROW_COUNT;

  -- 2. Remove from event_selections (all periods)
  UPDATE event_selections
  SET 
    -- Remove from player_positions JSONB
    player_positions = (
      SELECT COALESCE(jsonb_agg(pos), '[]'::jsonb)
      FROM jsonb_array_elements(player_positions) AS pos
      WHERE NOT (
        (pos->>'playerId' IS NOT NULL AND (pos->>'playerId')::uuid = v_player_id)
        OR (pos->>'player_id' IS NOT NULL AND (pos->>'player_id')::uuid = v_player_id)
      )
    ),
    -- Remove from substitute_players JSONB (handles string UUIDs in array)
    substitute_players = (
      SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb)
      FROM jsonb_array_elements_text(COALESCE(substitute_players, '[]'::jsonb)) AS sub
      WHERE sub::uuid != v_player_id
    ),
    -- Clear captain if this player was captain
    captain_id = CASE 
      WHEN captain_id = v_player_id THEN NULL 
      ELSE captain_id 
    END,
    updated_at = NOW()
  WHERE event_id = p_event_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'player_id', v_player_id,
    'removed_from_squad', v_removed_count,
    'message', 'Player removed from event due to unavailability'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;