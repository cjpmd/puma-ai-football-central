-- Fix RLS policies for team_staff to allow staff members to view other staff
-- First, let's add a policy that allows staff members to view other staff on their teams

-- Drop the existing overly restrictive policy if it exists
DROP POLICY IF EXISTS "Team members can manage their team staff" ON team_staff;

-- Create new policies that are more appropriate
CREATE POLICY "Team staff can view team staff"
  ON team_staff FOR SELECT
  USING (
    -- Allow if user is a team member
    EXISTS (
      SELECT 1 FROM user_teams ut 
      WHERE ut.team_id = team_staff.team_id 
      AND ut.user_id = auth.uid()
    )
    OR
    -- Allow if user is staff on this team (via user_staff link)
    EXISTS (
      SELECT 1 FROM user_staff us 
      JOIN team_staff ts ON us.staff_id = ts.id
      WHERE ts.team_id = team_staff.team_id 
      AND us.user_id = auth.uid()
    )
    OR
    -- Allow if user is linked to the club that owns this team
    EXISTS (
      SELECT 1 FROM club_teams ct
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE ct.team_id = team_staff.team_id 
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can manage team staff"
  ON team_staff FOR ALL
  USING (
    -- Allow if user is a team manager/admin
    EXISTS (
      SELECT 1 FROM user_teams ut 
      WHERE ut.team_id = team_staff.team_id 
      AND ut.user_id = auth.uid()
      AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager'])
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