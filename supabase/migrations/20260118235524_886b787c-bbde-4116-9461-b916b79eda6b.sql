-- Allow club admins to view profiles of users linked to players in their clubs
CREATE POLICY "Club admins can view profiles of linked parents"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_players up
      JOIN players p ON p.id = up.player_id
      JOIN club_teams ct ON ct.team_id = p.team_id
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE up.user_id = profiles.id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('club_admin', 'club_chair', 'club_secretary')
    )
  );

-- Allow team managers to view profiles of linked parents in their teams
CREATE POLICY "Team managers can view profiles of linked parents"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_players up
      JOIN players p ON p.id = up.player_id
      JOIN user_teams ut ON ut.team_id = p.team_id
      WHERE up.user_id = profiles.id
        AND ut.user_id = auth.uid()
        AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
    )
  );