-- Safe dedup and role normalization (no policy changes)

-- A. Remove team_manager rows when a manager row already exists for same (user, team)
DELETE FROM user_teams ut1
WHERE ut1.role = 'team_manager'
  AND EXISTS (
    SELECT 1 FROM user_teams ut2
    WHERE ut2.user_id = ut1.user_id
      AND ut2.team_id = ut1.team_id
      AND ut2.role = 'manager'
  );

-- B. Convert remaining team_manager to manager
UPDATE user_teams
SET role = 'manager'
WHERE role = 'team_manager';

-- C. Delete exact duplicate rows using ctid winner technique
DELETE FROM user_teams a
USING user_teams b
WHERE a.user_id = b.user_id
  AND a.team_id = b.team_id
  AND a.role = b.role
  AND a.ctid > b.ctid;

-- D. Ensure role not null (fill nulls first)
UPDATE user_teams
SET role = 'manager'
WHERE role IS NULL;
ALTER TABLE user_teams
ALTER COLUMN role SET NOT NULL;

-- E. Clean profiles.roles array to remove legacy team_manager
UPDATE profiles
SET roles = (
  SELECT ARRAY(SELECT DISTINCT x FROM UNNEST(roles) AS x WHERE x <> 'team_manager')
)
WHERE 'team_manager' = ANY(roles);

-- F. Create/refresh a view for clean staff role lookups
CREATE OR REPLACE VIEW team_staff_roles AS
SELECT
  t.id as team_id,
  t.name AS team_name,
  p.id as user_id,
  p.name AS staff_name,
  p.email AS staff_email,
  ut.role AS role,
  ut.created_at
FROM user_teams ut
JOIN profiles p ON p.id = ut.user_id
JOIN teams t ON t.id = ut.team_id
WHERE ut.role IN ('manager', 'team_assistant_manager', 'team_coach', 'team_helper', 'staff')
ORDER BY t.name, p.name;