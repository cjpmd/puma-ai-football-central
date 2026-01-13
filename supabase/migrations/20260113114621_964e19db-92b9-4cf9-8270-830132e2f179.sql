-- Add RLS policy for team coaches to view player links for players on their teams
-- This allows the invitation creation logic to find all players with linked accounts
CREATE POLICY "Team coaches can view player links for their teams"
ON public.user_players
FOR SELECT
USING (
  -- Users can see their own links
  user_id = auth.uid()
  OR
  -- Team coaches/managers can see links for players on their teams
  EXISTS (
    SELECT 1 FROM players p
    JOIN user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = user_players.player_id
      AND ut.user_id = auth.uid()
      AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- Add RLS policy for team coaches to view staff links for staff on their teams
-- This allows the invitation creation logic to find all staff with linked accounts
CREATE POLICY "Team coaches can view staff links for their teams"
ON public.user_staff
FOR SELECT
USING (
  -- Users can see their own links
  user_id = auth.uid()
  OR
  -- Team coaches/managers can see links for staff on their teams
  EXISTS (
    SELECT 1 FROM team_staff ts
    JOIN user_teams ut ON ut.team_id = ts.team_id
    WHERE ts.id = user_staff.staff_id
      AND ut.user_id = auth.uid()
      AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);