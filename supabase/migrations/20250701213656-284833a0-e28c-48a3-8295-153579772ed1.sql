-- Fix RLS policies to allow users to see their teams and data

-- Update teams RLS policy to allow users to see teams they're linked to
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
CREATE POLICY "Users can view teams they are members of" 
ON teams FOR SELECT 
USING (
  id IN (
    SELECT team_id 
    FROM user_teams 
    WHERE user_id = auth.uid()
  )
);

-- Ensure user_teams has proper RLS policies
DROP POLICY IF EXISTS "Users can view their team memberships" ON user_teams;
CREATE POLICY "Users can view their team memberships" 
ON user_teams FOR SELECT 
USING (user_id = auth.uid());

-- Ensure clubs RLS policy allows viewing clubs where user is an official
DROP POLICY IF EXISTS "Users can view clubs where they are officials" ON clubs;
CREATE POLICY "Users can view clubs where they are officials" 
ON clubs FOR SELECT 
USING (
  id IN (
    SELECT club_id 
    FROM club_officials 
    WHERE user_id = auth.uid()
  )
);

-- Ensure club_officials has proper RLS policies  
DROP POLICY IF EXISTS "Users can view their club official roles" ON club_officials;
CREATE POLICY "Users can view their club official roles" 
ON club_officials FOR SELECT 
USING (user_id = auth.uid());

-- Ensure players can be viewed by team members
DROP POLICY IF EXISTS "Users can view players in their teams" ON players;
CREATE POLICY "Users can view players in their teams" 
ON players FOR SELECT 
USING (
  team_id IN (
    SELECT team_id 
    FROM user_teams 
    WHERE user_id = auth.uid()
  )
);

-- Ensure events can be viewed by team members
DROP POLICY IF EXISTS "Users can view events for their teams" ON events;
CREATE POLICY "Users can view events for their teams" 
ON events FOR SELECT 
USING (
  team_id IN (
    SELECT team_id 
    FROM user_teams 
    WHERE user_id = auth.uid()
  )
);