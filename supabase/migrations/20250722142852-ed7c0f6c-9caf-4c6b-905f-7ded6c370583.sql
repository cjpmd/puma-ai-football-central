-- Clean up all team_staff RLS policies to fix infinite recursion
-- Drop all existing policies first
DROP POLICY IF EXISTS "Team staff access policy" ON team_staff;
DROP POLICY IF EXISTS "Team staff can view team staff" ON team_staff;
DROP POLICY IF EXISTS "Club members can view team staff" ON team_staff;
DROP POLICY IF EXISTS "Bootstrap team staff creation" ON team_staff;

-- Create a single, clean policy that doesn't cause recursion
CREATE POLICY "team_staff_access" ON team_staff
  FOR ALL
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
    OR
    -- Allow if user has any relationship with this team (for viewing)
    EXISTS (
      SELECT 1 FROM user_teams ut2
      WHERE ut2.team_id = team_staff.team_id 
      AND ut2.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- For inserts/updates, require management role
    EXISTS (
      SELECT 1 FROM user_teams ut 
      WHERE ut.team_id = team_staff.team_id 
      AND ut.user_id = auth.uid()
      AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
    )
    OR
    EXISTS (
      SELECT 1 FROM club_teams ct
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE ct.team_id = team_staff.team_id 
      AND uc.user_id = auth.uid()
      AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
    )
  );