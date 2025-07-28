-- Fix infinite recursion in club_officials RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Club admins can manage officials" ON club_officials;
DROP POLICY IF EXISTS "Users can view their club official roles" ON club_officials;

-- Create new policies that don't cause infinite recursion
-- Use a different approach to check club admin privileges

-- First, create a helper function to check if user is club admin through user_clubs table
CREATE OR REPLACE FUNCTION public.is_user_club_admin(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_clubs uc 
    WHERE uc.club_id = p_club_id 
      AND uc.user_id = p_user_id 
      AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
  );
$$;

-- Create safe RLS policies for club_officials
CREATE POLICY "Club admins can manage officials safely" 
ON club_officials 
FOR ALL 
TO authenticated
USING (is_user_club_admin(club_id, auth.uid()))
WITH CHECK (is_user_club_admin(club_id, auth.uid()));

CREATE POLICY "Users can view their own club official roles" 
ON club_officials 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Also fix any other problematic policies that might reference club_officials

-- Remove the view policies that reference club_officials and cause recursion
DROP POLICY IF EXISTS "Users can view club_teams for their clubs" ON club_teams;
DROP POLICY IF EXISTS "Club officials can manage club_teams" ON club_teams;

-- Create safer policies for club_teams
CREATE POLICY "Club members can view club teams safely" 
ON club_teams 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_clubs uc 
    WHERE uc.club_id = club_teams.club_id 
      AND uc.user_id = auth.uid()
  )
  OR 
  is_user_club_admin(club_id, auth.uid())
);

CREATE POLICY "Club admins can manage club teams safely" 
ON club_teams 
FOR ALL 
TO authenticated
USING (is_user_club_admin(club_id, auth.uid()))
WITH CHECK (is_user_club_admin(club_id, auth.uid()));