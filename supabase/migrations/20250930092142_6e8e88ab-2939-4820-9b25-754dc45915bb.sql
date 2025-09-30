-- Fix the consolidated staff function with correct profile column name
CREATE OR REPLACE FUNCTION get_consolidated_team_staff(p_team_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  source_type TEXT,
  user_id UUID,
  is_linked BOOLEAN
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- First get team_staff records with user links
  SELECT 
    ts.id,
    ts.name,
    ts.email,
    ts.role,
    'team_staff'::TEXT as source_type,
    us.user_id,
    (us.user_id IS NOT NULL) as is_linked
  FROM team_staff ts
  LEFT JOIN user_staff us ON ts.id = us.staff_id
  WHERE ts.team_id = p_team_id
  
  UNION
  
  -- Then get user_teams records that are staff-related but not already in team_staff
  SELECT 
    ut.user_id as id,
    COALESCE(p.email, 'Unknown User') as name,
    p.email,
    ut.role,
    'user_teams'::TEXT as source_type,
    ut.user_id,
    true as is_linked
  FROM user_teams ut
  LEFT JOIN profiles p ON ut.user_id = p.id
  WHERE ut.team_id = p_team_id
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'staff', 'team_helper', 'manager')
    AND NOT EXISTS (
      SELECT 1 FROM team_staff ts 
      JOIN user_staff us ON ts.id = us.staff_id
      WHERE us.user_id = ut.user_id AND ts.team_id = p_team_id
    );
END;
$$;