-- Further cleanup of duplicate roles - keep only the most essential ones
DELETE FROM user_teams 
WHERE user_id = 'bdc91e32-bf4c-4e86-bd99-252ba43e3cc2' 
AND role IN ('admin', 'coach', 'club_admin'); -- Keep team_coach and parent only

-- Clean up the roles array in profiles to remove duplicates
UPDATE profiles 
SET roles = ARRAY['global_admin', 'parent'] 
WHERE id = 'bdc91e32-bf4c-4e86-bd99-252ba43e3cc2';