-- Allow club admins to view player links for their club's teams
CREATE POLICY "Club admins can view player links for their clubs"
  ON public.user_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM players p
      JOIN club_teams ct ON ct.team_id = p.team_id
      JOIN user_clubs uc ON uc.club_id = ct.club_id
      WHERE p.id = user_players.player_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('club_admin', 'club_chair', 'club_secretary')
    )
  );