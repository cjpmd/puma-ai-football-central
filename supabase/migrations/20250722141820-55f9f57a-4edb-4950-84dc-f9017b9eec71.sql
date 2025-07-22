-- Fix team_staff RLS policies to allow proper staff management
-- The current policies may not allow staff creation by the right users

-- Update the management policy to include WITH CHECK for inserts
DROP POLICY IF EXISTS "Team managers can manage team staff" ON team_staff;

CREATE POLICY "Team managers and staff can manage team staff"
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
    -- Allow if user is staff on this team (via user_staff link) 
    EXISTS (
      SELECT 1 FROM user_staff us 
      JOIN team_staff ts ON us.staff_id = ts.id
      WHERE ts.team_id = team_staff.team_id 
      AND us.user_id = auth.uid()
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

-- Also create a temporary policy to allow authenticated users to create staff if they have any team relationship
-- This helps bootstrap the system
CREATE POLICY "Bootstrap team staff creation"
  ON team_staff FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow any authenticated user to create staff for teams they have some relationship with
    EXISTS (
      SELECT 1 FROM user_teams ut 
      WHERE ut.team_id = team_staff.team_id 
      AND ut.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM club_teams ct
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE ct.team_id = team_staff.team_id 
      AND uc.user_id = auth.uid()
    )
    OR
    -- If no specific team relationship exists, allow if user has global_admin role
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND 'global_admin' = ANY(p.roles)
    )
  );