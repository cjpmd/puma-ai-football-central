
-- Check if the user exists in the auth system but not in profiles
SELECT id, email FROM auth.users WHERE email = 'm888kky@outlook.com';

-- Check all existing profiles
SELECT id, email, name FROM profiles LIMIT 10;

-- Check all existing teams
SELECT id, name, age_group, created_at FROM teams LIMIT 10;

-- If the user exists in auth.users but not in profiles, we need to create a profile
-- (This will be needed if the trigger didn't run when the user was created)
