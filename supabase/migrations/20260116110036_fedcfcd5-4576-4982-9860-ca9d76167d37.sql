-- Remove global_admin role from user cmcdonald002@dundee.ac.uk
-- Update profiles.roles array
UPDATE public.profiles 
SET roles = array_remove(roles, 'global_admin')
WHERE email = 'cmcdonald002@dundee.ac.uk';

-- Remove global_admin user_teams record
DELETE FROM public.user_teams 
WHERE user_id = '6582f490-1879-45a0-9778-85a9140ac5b0' 
AND role = 'global_admin';