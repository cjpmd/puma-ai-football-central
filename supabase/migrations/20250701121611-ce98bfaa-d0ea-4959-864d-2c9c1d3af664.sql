
-- Add the user to the team with a manager role
INSERT INTO user_teams (user_id, team_id, role)
SELECT 
    p.id as user_id,
    t.id as team_id,
    'team_manager' as role
FROM profiles p
CROSS JOIN teams t
WHERE p.email = 'm888kky@outlook.com'
  AND t.name = 'Sample Team'
  AND NOT EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.user_id = p.id AND ut.team_id = t.id
  );

-- Verify the relationship was created
SELECT 
    p.name as user_name,
    p.email,
    t.name as team_name,
    ut.role,
    ut.created_at
FROM user_teams ut
JOIN profiles p ON ut.user_id = p.id
JOIN teams t ON ut.team_id = t.id
WHERE p.email = 'm888kky@outlook.com';
