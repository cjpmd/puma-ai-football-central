
-- Check what already exists for this user
SELECT id, name, email FROM profiles WHERE email = 'm888kky@outlook.com';

-- Check if any teams exist
SELECT id, name, age_group FROM teams LIMIT 5;

-- If no teams exist, create one
INSERT INTO teams (name, age_group, game_format, season_start, season_end)
SELECT 'Sample Team', 'U18', '11-a-side', '2024-09-01', '2025-05-31'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Sample Team');

-- Get the team we want to use
SELECT id, name FROM teams WHERE name = 'Sample Team' LIMIT 1;
