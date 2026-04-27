CREATE OR REPLACE FUNCTION public.get_user_event_roles(p_event_id uuid, p_user_id uuid)
RETURNS TABLE(role text, source_id uuid, source_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 1) Player roles (direct or parent-linked via user_players)
  RETURN QUERY
  SELECT
    'player'::text AS role,
    up.player_id    AS source_id,
    'player_link'::text AS source_type
  FROM user_players up
  JOIN players p ON up.player_id = p.id
  JOIN events  e ON e.id = p_event_id
  WHERE up.user_id = p_user_id
    AND p.team_id = e.team_id;

  -- 2) Staff roles via explicit user_staff -> team_staff link
  RETURN QUERY
  SELECT
    'staff'::text AS role,
    us.staff_id   AS source_id,
    'staff_link'::text AS source_type
  FROM user_staff us
  JOIN team_staff ts ON us.staff_id = ts.id
  JOIN events     e  ON e.id = p_event_id
  WHERE us.user_id = p_user_id
    AND ts.team_id = e.team_id;

  -- 3) Staff roles via user_teams (team_manager / coach / assistant_manager / etc).
  --    These users may not have a team_staff row but they still act as staff for
  --    availability purposes. Use the user's id as source_id since there is no
  --    team_staff row to reference. De-dupe against (2) by excluding users that
  --    already have a user_staff link for this team.
  RETURN QUERY
  SELECT
    'staff'::text AS role,
    p_user_id     AS source_id,
    'user_team'::text AS source_type
  FROM user_teams ut
  JOIN events e ON e.id = p_event_id
  WHERE ut.user_id = p_user_id
    AND ut.team_id = e.team_id
    AND ut.role = ANY (ARRAY[
      'team_manager',
      'team_assistant_manager',
      'team_coach',
      'manager',
      'assistant_manager',
      'coach',
      'assistant_coach',
      'staff',
      'admin'
    ])
    AND NOT EXISTS (
      SELECT 1
      FROM user_staff us2
      JOIN team_staff ts2 ON ts2.id = us2.staff_id
      WHERE us2.user_id = p_user_id
        AND ts2.team_id = e.team_id
    );
END;
$function$;