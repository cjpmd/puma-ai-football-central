-- Clean up staff data inconsistencies

-- 1. First, let's create a user_staff link for Micky McPherson
-- Find his email in auth/profiles to get his user_id
DO $$
DECLARE
    micky_user_id UUID;
    micky_staff_id UUID;
BEGIN
    -- Try to find Micky's user account by email
    SELECT id INTO micky_user_id 
    FROM auth.users 
    WHERE email = 'm888kky@outlook.com'
    LIMIT 1;
    
    -- Get Micky's staff record
    SELECT id INTO micky_staff_id
    FROM team_staff
    WHERE email = 'm888kky@outlook.com' AND name = 'Micky McPherson'
    LIMIT 1;
    
    -- If both exist, create the user_staff link
    IF micky_user_id IS NOT NULL AND micky_staff_id IS NOT NULL THEN
        INSERT INTO user_staff (user_id, staff_id, created_at)
        VALUES (micky_user_id, micky_staff_id, NOW())
        ON CONFLICT (user_id, staff_id) DO NOTHING;
        
        RAISE NOTICE 'Created user_staff link for Micky McPherson: user_id=%, staff_id=%', micky_user_id, micky_staff_id;
    ELSE
        RAISE NOTICE 'Could not create link - user_id: %, staff_id: %', micky_user_id, micky_staff_id;
    END IF;
END $$;

-- 2. Standardize role names in user_teams (remove spaces, fix inconsistencies)
UPDATE user_teams SET role = 'team_manager' WHERE role = 'team manager';
UPDATE user_teams SET role = 'team_assistant_manager' WHERE role = 'assistant manager';
UPDATE user_teams SET role = 'team_coach' WHERE role = 'coach';

-- 3. Remove duplicate user_teams entries (keep the most appropriate role per user per team)
-- First, let's see what we're dealing with for the problematic team
WITH role_priority AS (
  SELECT 
    user_id, 
    team_id,
    role,
    CASE role
      WHEN 'global_admin' THEN 1
      WHEN 'admin' THEN 2  
      WHEN 'team_manager' THEN 3
      WHEN 'manager' THEN 4
      WHEN 'team_assistant_manager' THEN 5
      WHEN 'team_coach' THEN 6
      WHEN 'staff' THEN 7
      WHEN 'team_helper' THEN 8
      WHEN 'parent' THEN 9
      ELSE 10
    END as priority,
    ROW_NUMBER() OVER (PARTITION BY user_id, team_id ORDER BY 
      CASE role
        WHEN 'global_admin' THEN 1
        WHEN 'admin' THEN 2  
        WHEN 'team_manager' THEN 3
        WHEN 'manager' THEN 4
        WHEN 'team_assistant_manager' THEN 5
        WHEN 'team_coach' THEN 6
        WHEN 'staff' THEN 7
        WHEN 'team_helper' THEN 8
        WHEN 'parent' THEN 9
        ELSE 10
      END
    ) as rn
  FROM user_teams
  WHERE team_id = '1ef246f0-fa94-4767-b5c4-0d3f4e90eb45'
),
duplicates_to_remove AS (
  SELECT user_id, team_id, role
  FROM role_priority 
  WHERE rn > 1
)
DELETE FROM user_teams ut
WHERE EXISTS (
  SELECT 1 FROM duplicates_to_remove d
  WHERE d.user_id = ut.user_id 
    AND d.team_id = ut.team_id 
    AND d.role = ut.role
);

-- 4. Create a function to get consolidated staff for a team
CREATE OR REPLACE FUNCTION get_consolidated_team_staff(p_team_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  source_type TEXT,
  user_id UUID,
  is_linked BOOLEAN
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- First get team_staff records with user links
  SELECT 
    ts.id,
    ts.name,
    ts.email,
    ts.role,
    'team_staff'::TEXT as source_type,
    us.user_id,
    (us.user_id IS NOT NULL) as is_linked
  FROM team_staff ts
  LEFT JOIN user_staff us ON ts.id = us.staff_id
  WHERE ts.team_id = p_team_id
  
  UNION
  
  -- Then get user_teams records that are staff-related but not already in team_staff
  SELECT 
    ut.user_id as id,
    COALESCE(p.full_name, p.email, 'Unknown') as name,
    p.email,
    ut.role,
    'user_teams'::TEXT as source_type,
    ut.user_id,
    true as is_linked
  FROM user_teams ut
  LEFT JOIN profiles p ON ut.user_id = p.id
  WHERE ut.team_id = p_team_id
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'staff', 'team_helper', 'manager')
    AND NOT EXISTS (
      SELECT 1 FROM team_staff ts 
      JOIN user_staff us ON ts.id = us.staff_id
      WHERE us.user_id = ut.user_id AND ts.team_id = p_team_id
    );
END;
$$;