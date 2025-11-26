-- Fix get_consolidated_team_staff function by removing non-existent is_active column
CREATE OR REPLACE FUNCTION get_consolidated_team_staff(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  user_id uuid,
  is_linked boolean,
  source_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id,
    COALESCE(p.name, ts.name, 'Unknown User') as name,
    COALESCE(p.email, ts.email) as email,
    ts.role,
    us.user_id,
    (us.user_id IS NOT NULL) as is_linked,
    'team_staff'::text as source_type
  FROM team_staff ts
  LEFT JOIN user_staff us ON us.staff_id = ts.id
  LEFT JOIN profiles p ON p.id = us.user_id
  WHERE ts.team_id = p_team_id

  UNION

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
$$ LANGUAGE plpgsql SECURITY DEFINER;