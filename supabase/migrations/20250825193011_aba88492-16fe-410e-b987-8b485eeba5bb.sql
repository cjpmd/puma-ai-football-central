-- Add support for group training plans

-- Add is_group_plan column to individual_training_plans table
ALTER TABLE individual_training_plans 
ADD COLUMN is_group_plan BOOLEAN DEFAULT FALSE;

-- Create training_plan_players junction table for group plans
CREATE TABLE training_plan_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES individual_training_plans(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, player_id)
);

-- Enable RLS on the new table
ALTER TABLE training_plan_players ENABLE ROW LEVEL SECURITY;

-- Create policy for training_plan_players access
CREATE POLICY "Team members can manage training plan players" ON training_plan_players
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM individual_training_plans itp
    JOIN players p ON p.id = training_plan_players.player_id
    JOIN user_teams ut ON ut.team_id = p.team_id
    WHERE itp.id = training_plan_players.plan_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM individual_training_plans itp
    JOIN players p ON p.id = training_plan_players.player_id
    JOIN user_teams ut ON ut.team_id = p.team_id
    WHERE itp.id = training_plan_players.plan_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_training_plan_players_plan_id ON training_plan_players(plan_id);
CREATE INDEX idx_training_plan_players_player_id ON training_plan_players(player_id);

-- Update existing individual plans to populate the junction table
INSERT INTO training_plan_players (plan_id, player_id)
SELECT id, player_id 
FROM individual_training_plans 
WHERE player_id IS NOT NULL;