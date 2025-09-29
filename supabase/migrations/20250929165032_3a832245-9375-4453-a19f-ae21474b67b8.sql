-- Step 1: Clean up role duplication for the main user
-- Remove redundant team roles, keeping only essential ones
DELETE FROM user_teams 
WHERE user_id = 'bdc91e32-bf4c-4e86-bd99-252ba43e3cc2' 
AND role IN ('player', 'global_admin'); -- Remove these as they're redundant

-- Step 2: Add user to club_teams if they should have club admin access
-- First check if Broughty United club exists and get its ID
DO $$
DECLARE
    club_uuid uuid;
    user_uuid uuid := 'bdc91e32-bf4c-4e86-bd99-252ba43e3cc2';
BEGIN
    -- Get the club ID for Broughty United
    SELECT id INTO club_uuid FROM clubs WHERE name ILIKE '%broughty%' LIMIT 1;
    
    IF club_uuid IS NOT NULL THEN
        -- Add user as club admin if not already exists
        INSERT INTO user_clubs (user_id, club_id, role)
        VALUES (user_uuid, club_uuid, 'club_admin')
        ON CONFLICT (user_id, club_id, role) DO NOTHING;
    END IF;
END $$;