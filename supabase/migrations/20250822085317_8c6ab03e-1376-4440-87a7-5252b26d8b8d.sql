-- Create RLS policies for training-related tables

-- Enable RLS on training tables
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_subgroup_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_sessions
CREATE POLICY "Team members can manage training sessions" ON training_sessions
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut 
    WHERE ut.team_id = training_sessions.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_teams ut 
    WHERE ut.team_id = training_sessions.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- RLS policies for training_session_drills  
CREATE POLICY "Team members can manage training session drills" ON training_session_drills
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ut.team_id = ts.team_id
    WHERE ts.id = training_session_drills.training_session_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ut.team_id = ts.team_id
    WHERE ts.id = training_session_drills.training_session_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- RLS policies for training_session_equipment
CREATE POLICY "Team members can manage training session equipment" ON training_session_equipment
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ut.team_id = ts.team_id
    WHERE ts.id = training_session_equipment.training_session_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ut.team_id = ts.team_id
    WHERE ts.id = training_session_equipment.training_session_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);