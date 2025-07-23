-- Create function to get all roles a user has for an event
CREATE OR REPLACE FUNCTION public.get_user_event_roles(p_event_id uuid, p_user_id uuid)
RETURNS TABLE(
  role text,
  source_id uuid,
  source_type text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Get player roles (direct or parent-linked)
  RETURN QUERY
  SELECT 
    'player'::text as role,
    up.player_id as source_id,
    'player_link'::text as source_type
  FROM user_players up
  JOIN players p ON up.player_id = p.id
  JOIN events e ON e.id = p_event_id
  WHERE up.user_id = p_user_id
    AND p.team_id = e.team_id;

  -- Get staff roles
  RETURN QUERY
  SELECT 
    'staff'::text as role,
    us.staff_id as source_id,
    'staff_link'::text as source_type
  FROM user_staff us
  JOIN team_staff ts ON us.staff_id = ts.id
  JOIN events e ON e.id = p_event_id
  WHERE us.user_id = p_user_id
    AND ts.team_id = e.team_id;
END;
$$;