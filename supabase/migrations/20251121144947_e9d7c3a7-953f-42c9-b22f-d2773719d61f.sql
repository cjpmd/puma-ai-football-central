-- Fix event_selections RLS policy to allow player-linked users and staff
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Team members can manage event selections" ON event_selections;

-- Create new comprehensive SELECT policy
CREATE POLICY "Users can view event selections for their teams"
ON event_selections FOR SELECT
USING (
  -- Direct team members
  EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_teams.user_id = auth.uid()
    AND user_teams.team_id = event_selections.team_id
  )
  OR
  -- Users linked to players on this team
  EXISTS (
    SELECT 1 FROM user_players up
    JOIN players p ON up.player_id = p.id
    WHERE up.user_id = auth.uid()
    AND p.team_id = event_selections.team_id
  )
  OR
  -- Staff members assigned to this team
  EXISTS (
    SELECT 1 FROM user_staff us
    JOIN team_staff ts ON us.staff_id = ts.id
    WHERE us.user_id = auth.uid()
    AND ts.team_id = event_selections.team_id
  )
);

-- Recreate management policy for team managers/coaches only
CREATE POLICY "Team managers can manage event selections"
ON event_selections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_teams.user_id = auth.uid()
    AND user_teams.team_id = event_selections.team_id
    AND user_teams.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_teams.user_id = auth.uid()
    AND user_teams.team_id = event_selections.team_id
    AND user_teams.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);