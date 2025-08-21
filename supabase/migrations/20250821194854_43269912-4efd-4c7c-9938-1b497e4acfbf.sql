-- Fix RLS policies for parent access to training plans
-- Allow parents to view their linked player's training plans

-- Update individual_training_plans policies
DROP POLICY IF EXISTS "ITP: view plans" ON individual_training_plans;

CREATE POLICY "ITP: view plans"
ON individual_training_plans
FOR SELECT
USING (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  created_by = auth.uid() OR
  -- Allow players to see their own plans
  (EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.player_id = individual_training_plans.player_id
    AND up.user_id = auth.uid()
  )) OR
  -- Allow team staff to see plans for their team players
  ((visibility IN ('coach', 'teamStaff')) AND (EXISTS (
    SELECT 1 FROM players p
    JOIN user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_training_plans.player_id
    AND ut.user_id = auth.uid()
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )))
);

-- Create training plan templates table
CREATE TABLE IF NOT EXISTS training_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  weekly_sessions INTEGER NOT NULL DEFAULT 3,
  intensity_level INTEGER NOT NULL DEFAULT 3 CHECK (intensity_level >= 1 AND intensity_level <= 5),
  duration_weeks INTEGER NOT NULL DEFAULT 4,
  location_preference TEXT NOT NULL DEFAULT 'pitch' CHECK (location_preference IN ('home', 'pitch', 'gym')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'team', 'private')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  is_public BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE training_plan_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Templates: view public and own"
ON training_plan_templates
FOR SELECT
USING (
  is_public = true OR
  created_by = auth.uid() OR
  (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = training_plan_templates.team_id
    AND ut.user_id = auth.uid()
  ))
);

CREATE POLICY "Templates: manage own"
ON training_plan_templates
FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Insert default templates
INSERT INTO training_plan_templates (name, description, focus_areas, weekly_sessions, intensity_level, duration_weeks, location_preference, tags, is_public) VALUES
('Ball Control Fundamentals', 'Master basic ball control and first touch techniques', '{"Ball Control", "Dribbling"}', 3, 2, 4, 'pitch', '{"beginner", "fundamentals"}', true),
('Shooting Accuracy Training', 'Improve shooting technique and goal-scoring ability', '{"Shooting", "Ball Control", "Finishing"}', 4, 3, 3, 'pitch', '{"intermediate", "attacking"}', true),
('Defensive Skills Development', 'Build strong defensive fundamentals and positioning', '{"Defending", "Positioning", "Fitness"}', 3, 3, 5, 'pitch', '{"intermediate", "defending"}', true),
('Speed & Agility Conditioning', 'Enhance speed, agility and overall fitness levels', '{"Speed", "Agility", "Fitness"}', 4, 4, 6, 'pitch', '{"advanced", "fitness"}', true),
('Passing & Vision Mastery', 'Develop passing accuracy and field vision', '{"Passing", "Vision", "Ball Control"}', 3, 2, 4, 'pitch', '{"intermediate", "playmaking"}', true),
('Goalkeeper Fundamentals', 'Essential goalkeeper training for shot-stopping and distribution', '{"Goalkeeping", "Handling", "Distribution"}', 4, 3, 5, 'pitch', '{"beginner", "goalkeeper"}', true),
('Crossing & Wing Play', 'Perfect crossing technique and wing attacking play', '{"Crossing", "Dribbling", "Speed"}', 3, 3, 4, 'pitch', '{"intermediate", "wings"}', true),
('Heading & Aerial Duels', 'Master heading technique for both attack and defense', '{"Heading", "Positioning", "Jumping"}', 2, 3, 3, 'pitch', '{"intermediate", "aerial"}', true);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_training_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_training_plan_templates_updated_at
  BEFORE UPDATE ON training_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_training_template_updated_at();