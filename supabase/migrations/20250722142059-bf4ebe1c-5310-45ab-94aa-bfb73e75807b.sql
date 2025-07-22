-- Fix infinite recursion in team_staff RLS policies
-- The issue is that the policy was referencing team_staff within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team managers and staff can manage team staff" ON team_staff;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Team staff access policy"
  ON team_staff FOR ALL
  USING (
    -- Allow if user is a team member with management role
    EXISTS (
      SELECT 1 FROM user_teams ut 
      WHERE ut.team_id = team_staff.team_id 
      AND ut.user_id = auth.uid()
      AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
    )
    OR
    -- Allow if user is a club admin for this team
    EXISTS (
      SELECT 1 FROM club_teams ct
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE ct.team_id = team_staff.team_id 
      AND uc.user_id = auth.uid()
      AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
    )
  )
  WITH CHECK (
    -- Allow if user is a team member with management role
    EXISTS (
      SELECT 1 FROM user_teams ut 
      WHERE ut.team_id = team_staff.team_id 
      AND ut.user_id = auth.uid()
      AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
    )
    OR
    -- Allow if user is a club admin for this team  
    EXISTS (
      SELECT 1 FROM club_teams ct
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE ct.team_id = team_staff.team_id 
      AND uc.user_id = auth.uid()
      AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
    )
  );