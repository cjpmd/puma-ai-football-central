
-- Ensure team_squads table has proper structure and constraints for team isolation
CREATE TABLE IF NOT EXISTS public.team_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  player_id UUID NOT NULL,
  event_id UUID NOT NULL,
  squad_role TEXT NOT NULL DEFAULT 'player',
  availability_status TEXT DEFAULT 'available',
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure a player can only be assigned once per team per event
  UNIQUE(team_id, player_id, event_id)
);

-- Enable RLS on team_squads if not already enabled
ALTER TABLE public.team_squads ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to ensure proper team isolation
DROP POLICY IF EXISTS "Users can view squads for their teams" ON public.team_squads;
DROP POLICY IF EXISTS "Team managers can insert squad members" ON public.team_squads;
DROP POLICY IF EXISTS "Team managers can update squad members" ON public.team_squads;
DROP POLICY IF EXISTS "Team managers can delete squad members" ON public.team_squads;

-- Create comprehensive RLS policies for team_squads
CREATE POLICY "Users can view squads for their teams" 
  ON public.team_squads 
  FOR SELECT 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can insert squad members" 
  ON public.team_squads 
  FOR INSERT 
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin', 'team_manager', 'team_coach', 'team_assistant_manager')
    )
  );

CREATE POLICY "Team managers can update squad members" 
  ON public.team_squads 
  FOR UPDATE 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin', 'team_manager', 'team_coach', 'team_assistant_manager')
    )
  );

CREATE POLICY "Team managers can delete squad members" 
  ON public.team_squads 
  FOR DELETE 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'coach', 'admin', 'team_manager', 'team_coach', 'team_assistant_manager')
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_squads_team_event ON public.team_squads (team_id, event_id);
CREATE INDEX IF NOT EXISTS idx_team_squads_player_event ON public.team_squads (player_id, event_id);
