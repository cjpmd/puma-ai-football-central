
-- First, let's find the user ID for the email address
SELECT id, email, name FROM profiles WHERE email = 'm888kky@outlook.com';

-- Second, find available teams (to see which team ID to use)
SELECT id, name, age_group FROM teams ORDER BY name;
