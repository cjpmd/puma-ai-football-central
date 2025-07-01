
-- First, let's see what teams exist and find the correct one
SELECT id, name, age_group FROM teams WHERE name ILIKE '%broughty%' OR name ILIKE '%puma%';

-- If the team doesn't exist, create it
INSERT INTO teams (name, age_group, game_format, season_start, season_end)
SELECT 'Broughty United Pumas 2015s', 'U9', '7-a-side', '2024-09-01', '2025-05-31'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Broughty United Pumas 2015s');

-- Now add the user to the correct team
INSERT INTO user_teams (user_id, team_id, role)
SELECT 
    p.id as user_id,
    t.id as team_id,
    'team_manager' as role
FROM profiles p
CROSS JOIN teams t
WHERE p.email = 'm888kky@outlook.com'
  AND t.name = 'Broughty United Pumas 2015s'
  AND NOT EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.user_id = p.id AND ut.team_id = t.id
  );

-- Also make sure you have global_admin role for platform management
UPDATE profiles 
SET roles = array_append(COALESCE(roles, ARRAY[]::text[]), 'global_admin')
WHERE email = 'chrisjpmcdonald@gmail.com'
  AND NOT ('global_admin' = ANY(COALESCE(roles, ARRAY[]::text[])));

-- Verify the setup
SELECT 
    p.name as user_name,
    p.email,
    p.roles,
    t.name as team_name,
    ut.role as team_role
FROM profiles p
LEFT JOIN user_teams ut ON p.id = ut.user_id
LEFT JOIN teams t ON ut.team_id = t.id
WHERE p.email IN ('m888kky@outlook.com', 'chrisjpmcdonald@gmail.com')
ORDER BY p.email;
