-- Update RLS policies for team_squads to include team_coach role

-- Drop existing policies
DROP POLICY IF EXISTS "Team managers can insert squad members" ON public.team_squads;
DROP POLICY IF EXISTS "Team managers can update squad members" ON public.team_squads;
DROP POLICY IF EXISTS "Team managers can delete squad members" ON public.team_squads;

-- Create updated policies with team_coach role included
CREATE POLICY "Team managers can insert squad members" 
  ON public.team_squads 
  FOR INSERT 
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin', 'team_manager', 'team_coach')
    )
  );

CREATE POLICY "Team managers can update squad members" 
  ON public.team_squads 
  FOR UPDATE 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin', 'team_manager', 'team_coach')
    )
  );

CREATE POLICY "Team managers can delete squad members" 
  ON public.team_squads 
  FOR DELETE 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin', 'team_manager', 'team_coach')
    )
  );