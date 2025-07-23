-- Fix the get_user_event_roles function to properly return both staff and player roles
CREATE OR REPLACE FUNCTION public.get_user_event_roles(p_user_id uuid, p_event_id uuid)
RETURNS TABLE(role text, source_id uuid, source_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Return staff role if user is linked to staff selected for this event
  RETURN QUERY
  SELECT 
    'staff'::TEXT as role,
    us.staff_id as source_id,
    'staff_link'::TEXT as source_type
  FROM user_staff us
  JOIN event_selections es ON es.event_id = p_event_id
  WHERE us.user_id = p_user_id
  AND us.staff_id::TEXT = ANY(
    SELECT jsonb_array_elements_text(
      jsonb_path_query_array(es.staff_selection, '$[*].staffId')
    )
  );
  
  -- Return player role for players linked to this user (parent relationship)
  RETURN QUERY
  SELECT 
    'player'::TEXT as role,
    up.player_id as source_id,
    'player_link'::TEXT as source_type
  FROM user_players up
  JOIN events e ON e.id = p_event_id
  JOIN players p ON p.id = up.player_id AND p.team_id = e.team_id
  WHERE up.user_id = p_user_id;
END;
$function$