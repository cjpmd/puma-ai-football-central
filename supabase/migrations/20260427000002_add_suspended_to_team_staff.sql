-- Add suspended status to team_staff for non-destructive access removal
ALTER TABLE team_staff ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Rebuild get_consolidated_team_staff to expose pvg_checked and exclude suspended staff
-- from event/selection screens (suspended staff remain visible in Club Management only)
CREATE OR REPLACE FUNCTION get_consolidated_team_staff(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  user_id uuid,
  is_linked boolean,
  source_type text,
  pvg_checked boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id,
    COALESCE(p.name, ts.name, 'Unknown User') AS name,
    COALESCE(p.email, ts.email) AS email,
    ts.role,
    us.user_id,
    (us.user_id IS NOT NULL) AS is_linked,
    'team_staff'::text AS source_type,
    COALESCE(ts.pvg_checked, false) AS pvg_checked
  FROM team_staff ts
  LEFT JOIN user_staff us ON us.staff_id = ts.id
  LEFT JOIN profiles p ON p.id = us.user_id
  WHERE ts.team_id = p_team_id
    AND NOT ts.suspended

  UNION

  SELECT
    ut.id,
    COALESCE(p.name, p.email, 'Unknown User') AS name,
    p.email,
    ut.role,
    ut.user_id,
    true AS is_linked,
    'user_teams'::text AS source_type,
    false AS pvg_checked
  FROM user_teams ut
  JOIN profiles p ON p.id = ut.user_id
  WHERE ut.team_id = p_team_id
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'manager', 'coach', 'staff', 'helper', 'team_helper')

  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
