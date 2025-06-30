
-- Create team_squads table for managing squad membership
CREATE TABLE public.team_squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE CASCADE,
  squad_role TEXT NOT NULL DEFAULT 'player' CHECK (squad_role IN ('player', 'captain', 'vice_captain')),
  availability_status TEXT NOT NULL DEFAULT 'pending' CHECK (availability_status IN ('available', 'unavailable', 'pending', 'maybe')),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique player per event per team
  UNIQUE(team_id, player_id, event_id)
);

-- Enable RLS
ALTER TABLE public.team_squads ENABLE ROW LEVEL SECURITY;

-- Create policies for team_squads
CREATE POLICY "Users can view squads for their teams" 
  ON public.team_squads 
  FOR SELECT 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage squads for their teams" 
  ON public.team_squads 
  FOR ALL 
  USING (
    team_id IN (
      SELECT team_id FROM user_teams WHERE user_id = auth.uid() AND role IN ('manager', 'coach', 'admin')
    )
  );

-- Add indexes for performance
CREATE INDEX idx_team_squads_team_event ON team_squads(team_id, event_id);
CREATE INDEX idx_team_squads_player ON team_squads(player_id);
CREATE INDEX idx_team_squads_availability ON team_squads(availability_status);

-- Create backup function for existing selections
CREATE OR REPLACE FUNCTION backup_event_selections()
RETURNS TABLE(
  backup_id UUID,
  event_id UUID,
  team_id UUID,
  team_number INTEGER,
  period_number INTEGER,
  formation TEXT,
  player_positions JSONB,
  substitute_players JSONB,
  captain_id UUID,
  staff_selection JSONB,
  duration_minutes INTEGER,
  performance_category_id UUID,
  backup_created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    gen_random_uuid() as backup_id,
    es.event_id,
    es.team_id,
    es.team_number,
    es.period_number,
    es.formation,
    es.player_positions,
    es.substitute_players,
    es.captain_id,
    es.staff_selection,
    es.duration_minutes,
    es.performance_category_id,
    now() as backup_created_at
  FROM event_selections es;
$$;

-- Add position abbreviations lookup
CREATE TABLE public.position_abbreviations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_format TEXT NOT NULL,
  position_name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  position_group TEXT NOT NULL CHECK (position_group IN ('goalkeeper', 'defender', 'midfielder', 'forward')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(game_format, position_name),
  UNIQUE(game_format, abbreviation)
);

-- Insert standard position abbreviations
INSERT INTO position_abbreviations (game_format, position_name, abbreviation, position_group, display_order) VALUES
-- 11-a-side positions
('11-a-side', 'Goalkeeper', 'GK', 'goalkeeper', 1),
('11-a-side', 'Right Back', 'RB', 'defender', 2),
('11-a-side', 'Centre Back', 'CB', 'defender', 3),
('11-a-side', 'Left Back', 'LB', 'defender', 4),
('11-a-side', 'Right Wing Back', 'RWB', 'defender', 5),
('11-a-side', 'Left Wing Back', 'LWB', 'defender', 6),
('11-a-side', 'Defensive Midfielder', 'CDM', 'midfielder', 7),
('11-a-side', 'Central Midfielder', 'CM', 'midfielder', 8),
('11-a-side', 'Right Midfielder', 'RM', 'midfielder', 9),
('11-a-side', 'Left Midfielder', 'LM', 'midfielder', 10),
('11-a-side', 'Attacking Midfielder', 'CAM', 'midfielder', 11),
('11-a-side', 'Right Winger', 'RW', 'forward', 12),
('11-a-side', 'Left Winger', 'LW', 'forward', 13),
('11-a-side', 'Striker', 'ST', 'forward', 14),
('11-a-side', 'Centre Forward', 'CF', 'forward', 15),

-- 9-a-side positions
('9-a-side', 'Goalkeeper', 'GK', 'goalkeeper', 1),
('9-a-side', 'Right Back', 'RB', 'defender', 2),
('9-a-side', 'Centre Back', 'CB', 'defender', 3),
('9-a-side', 'Left Back', 'LB', 'defender', 4),
('9-a-side', 'Right Midfielder', 'RM', 'midfielder', 5),
('9-a-side', 'Central Midfielder', 'CM', 'midfielder', 6),
('9-a-side', 'Left Midfielder', 'LM', 'midfielder', 7),
('9-a-side', 'Right Forward', 'RF', 'forward', 8),
('9-a-side', 'Left Forward', 'LF', 'forward', 9),

-- 7-a-side positions
('7-a-side', 'Goalkeeper', 'GK', 'goalkeeper', 1),
('7-a-side', 'Right Back', 'RB', 'defender', 2),
('7-a-side', 'Centre Back', 'CB', 'defender', 3),
('7-a-side', 'Left Back', 'LB', 'defender', 4),
('7-a-side', 'Central Midfielder', 'CM', 'midfielder', 5),
('7-a-side', 'Right Forward', 'RF', 'forward', 6),
('7-a-side', 'Left Forward', 'LF', 'forward', 7);

-- Enable RLS for position_abbreviations
ALTER TABLE public.position_abbreviations ENABLE ROW LEVEL SECURITY;

-- Create policy for position abbreviations (read-only for all authenticated users)
CREATE POLICY "Anyone can view position abbreviations" 
  ON public.position_abbreviations 
  FOR SELECT 
  TO authenticated 
  USING (true);
