-- Create training system database schema

-- Core drill library
CREATE TABLE drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  created_by uuid REFERENCES auth.users(id),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for drills
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- Drill categorization tags
CREATE TABLE drill_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for drill_tags
ALTER TABLE drill_tags ENABLE ROW LEVEL SECURITY;

-- Many-to-many relationship for drill tags
CREATE TABLE drill_tag_assignments (
  drill_id uuid REFERENCES drills(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES drill_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (drill_id, tag_id)
);

-- Enable RLS for drill_tag_assignments
ALTER TABLE drill_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Media files for drills (PowerPoint, videos)
CREATE TABLE drill_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid REFERENCES drills(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for drill_media
ALTER TABLE drill_media ENABLE ROW LEVEL SECURITY;

-- Training sessions linked to events
CREATE TABLE training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id),
  total_duration_minutes integer DEFAULT 90,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for training_sessions
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Training session groups (instead of teams)
CREATE TABLE training_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  group_number integer NOT NULL,
  group_name text,
  performance_category_id uuid REFERENCES performance_categories(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for training_groups
ALTER TABLE training_groups ENABLE ROW LEVEL SECURITY;

-- Drill sequences within training sessions
CREATE TABLE training_session_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  drill_id uuid REFERENCES drills(id),
  custom_drill_name text,
  custom_drill_description text,
  sequence_order integer NOT NULL,
  duration_minutes integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for training_session_drills
ALTER TABLE training_session_drills ENABLE ROW LEVEL SECURITY;

-- Sub-groups for specific drills
CREATE TABLE drill_subgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_drill_id uuid REFERENCES training_session_drills(id) ON DELETE CASCADE,
  subgroup_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for drill_subgroups
ALTER TABLE drill_subgroups ENABLE ROW LEVEL SECURITY;

-- Player assignments to drill sub-groups
CREATE TABLE drill_subgroup_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_subgroup_id uuid REFERENCES drill_subgroups(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for drill_subgroup_players
ALTER TABLE drill_subgroup_players ENABLE ROW LEVEL SECURITY;

-- Equipment requirements for training sessions
CREATE TABLE training_session_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES team_equipment(id),
  custom_equipment_name text,
  quantity_needed integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for training_session_equipment
ALTER TABLE training_session_equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team members

-- Drills policies
CREATE POLICY "Team members can view public drills and their team drills" 
ON drills FOR SELECT 
USING (
  is_public = true OR 
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_teams ut 
    WHERE ut.user_id = auth.uid()
  )
);

CREATE POLICY "Team staff can create drills" 
ON drills FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Drill creators can update their drills" 
ON drills FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Drill creators can delete their drills" 
ON drills FOR DELETE 
USING (created_by = auth.uid());

-- Drill tags policies
CREATE POLICY "Anyone can view drill tags" 
ON drill_tags FOR SELECT 
USING (true);

CREATE POLICY "Team staff can create drill tags" 
ON drill_tags FOR INSERT 
WITH CHECK (true);

-- Drill tag assignments policies
CREATE POLICY "Users can view drill tag assignments" 
ON drill_tag_assignments FOR SELECT 
USING (true);

CREATE POLICY "Drill creators can manage tag assignments" 
ON drill_tag_assignments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM drills d 
    WHERE d.id = drill_id AND d.created_by = auth.uid()
  )
);

-- Drill media policies
CREATE POLICY "Users can view drill media" 
ON drill_media FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM drills d 
    WHERE d.id = drill_id AND (
      d.is_public = true OR 
      d.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM user_teams ut WHERE ut.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Drill creators can manage drill media" 
ON drill_media FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM drills d 
    WHERE d.id = drill_id AND d.created_by = auth.uid()
  )
);

-- Training sessions policies
CREATE POLICY "Team members can manage training sessions" 
ON training_sessions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut 
    WHERE ut.team_id = training_sessions.team_id AND ut.user_id = auth.uid()
  )
);

-- Training groups policies
CREATE POLICY "Team members can manage training groups" 
ON training_groups FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ts.team_id = ut.team_id
    WHERE ts.id = training_groups.training_session_id AND ut.user_id = auth.uid()
  )
);

-- Training session drills policies
CREATE POLICY "Team members can manage training session drills" 
ON training_session_drills FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ts.team_id = ut.team_id
    WHERE ts.id = training_session_drills.training_session_id AND ut.user_id = auth.uid()
  )
);

-- Drill subgroups policies
CREATE POLICY "Team members can manage drill subgroups" 
ON drill_subgroups FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM training_session_drills tsd
    JOIN training_sessions ts ON tsd.training_session_id = ts.id
    JOIN user_teams ut ON ts.team_id = ut.team_id
    WHERE tsd.id = drill_subgroups.training_session_drill_id AND ut.user_id = auth.uid()
  )
);

-- Drill subgroup players policies
CREATE POLICY "Team members can manage drill subgroup players" 
ON drill_subgroup_players FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM drill_subgroups ds
    JOIN training_session_drills tsd ON ds.training_session_drill_id = tsd.id
    JOIN training_sessions ts ON tsd.training_session_id = ts.id
    JOIN user_teams ut ON ts.team_id = ut.team_id
    WHERE ds.id = drill_subgroup_players.drill_subgroup_id AND ut.user_id = auth.uid()
  )
);

-- Training session equipment policies
CREATE POLICY "Team members can manage training session equipment" 
ON training_session_equipment FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN user_teams ut ON ts.team_id = ut.team_id
    WHERE ts.id = training_session_equipment.training_session_id AND ut.user_id = auth.uid()
  )
);

-- Insert some default drill tags
INSERT INTO drill_tags (name, color) VALUES
('Passing', '#10b981'),
('Pressing', '#ef4444'),
('Defending', '#3b82f6'),
('Finishing', '#f59e0b'),
('Dribbling', '#8b5cf6'),
('Crossing', '#06b6d4'),
('Set Pieces', '#84cc16'),
('Fitness', '#f97316'),
('Goalkeeping', '#ec4899'),
('Teamwork', '#6366f1');