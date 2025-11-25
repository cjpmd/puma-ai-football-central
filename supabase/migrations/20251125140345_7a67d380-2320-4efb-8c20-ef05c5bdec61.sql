-- Drop and recreate get_consolidated_team_staff to display names correctly and include user_teams staff
DROP FUNCTION IF EXISTS get_consolidated_team_staff(uuid);

CREATE FUNCTION get_consolidated_team_staff(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  user_id uuid,
  is_linked boolean,
  source_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- From team_staff table
  SELECT 
    ts.id,
    COALESCE(p.name, p.email, 'Unknown User') as name,
    ts.email,
    ts.role,
    us.user_id,
    (us.user_id IS NOT NULL) as is_linked,
    'team_staff'::text as source_type
  FROM team_staff ts
  LEFT JOIN user_staff us ON us.staff_id = ts.id
  LEFT JOIN profiles p ON p.id = us.user_id
  WHERE ts.team_id = p_team_id
    AND ts.is_active = true

  UNION

  -- From user_teams table (users with staff-like roles)
  SELECT
    ut.id,
    COALESCE(p.name, p.email, 'Unknown User') as name,
    p.email,
    ut.role,
    ut.user_id,
    true as is_linked,
    'user_teams'::text as source_type
  FROM user_teams ut
  JOIN profiles p ON p.id = ut.user_id
  WHERE ut.team_id = p_team_id
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'manager', 'coach', 'staff', 'helper', 'team_helper')
  
  ORDER BY name;
END;
$$;