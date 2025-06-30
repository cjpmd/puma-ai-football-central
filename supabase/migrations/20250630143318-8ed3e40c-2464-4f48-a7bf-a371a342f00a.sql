
-- Fix RLS policies for team_squads table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view squads for their teams" ON public.team_squads;
DROP POLICY IF EXISTS "Users can manage squads for their teams" ON public.team_squads;

-- Create more permissive policies for team_squads
CREATE POLICY "Users can view squads for their teams" 
  ON public.team_squads 
  FOR SELECT 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can insert squad members" 
  ON public.team_squads 
  FOR INSERT 
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin')
    )
  );

CREATE POLICY "Team managers can update squad members" 
  ON public.team_squads 
  FOR UPDATE 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin')
    )
  );

CREATE POLICY "Team managers can delete squad members" 
  ON public.team_squads 
  FOR DELETE 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin')
    )
  );

-- Drop and recreate position_abbreviations policy to ensure it's correct
DROP POLICY IF EXISTS "Anyone can view position abbreviations" ON public.position_abbreviations;
CREATE POLICY "Anyone can view position abbreviations" 
  ON public.position_abbreviations 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.position_abbreviations TO authenticated;
GRANT ALL ON public.team_squads TO authenticated;
