-- Create storage bucket for drill media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('drill-media', 'drill-media', false);

-- Create storage policies for drill media
CREATE POLICY "Users can view drill media they have access to" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'drill-media' AND 
  (
    -- Public drills
    EXISTS (
      SELECT 1 FROM drills d 
      WHERE d.id::text = (storage.foldername(name))[1] 
      AND d.is_public = true
    ) OR
    -- User's own drills
    EXISTS (
      SELECT 1 FROM drills d 
      WHERE d.id::text = (storage.foldername(name))[1] 
      AND d.created_by = auth.uid()
    ) OR
    -- Team member access
    EXISTS (
      SELECT 1 FROM drills d
      JOIN user_teams ut ON true
      WHERE d.id::text = (storage.foldername(name))[1] 
      AND ut.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Drill creators can upload media" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'drill-media' AND 
  EXISTS (
    SELECT 1 FROM drills d 
    WHERE d.id::text = (storage.foldername(name))[1] 
    AND d.created_by = auth.uid()
  )
);

CREATE POLICY "Drill creators can update their media" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'drill-media' AND 
  EXISTS (
    SELECT 1 FROM drills d 
    WHERE d.id::text = (storage.foldername(name))[1] 
    AND d.created_by = auth.uid()
  )
);

CREATE POLICY "Drill creators can delete their media" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'drill-media' AND 
  EXISTS (
    SELECT 1 FROM drills d 
    WHERE d.id::text = (storage.foldername(name))[1] 
    AND d.created_by = auth.uid()
  )
);

-- Create team_equipment table if it doesn't exist (for equipment management)
CREATE TABLE IF NOT EXISTS team_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'general',
  quantity_available integer DEFAULT 1,
  condition text DEFAULT 'good',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for team_equipment
ALTER TABLE team_equipment ENABLE ROW LEVEL SECURITY;

-- Team equipment policies
CREATE POLICY "Team members can manage equipment" 
ON team_equipment FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut 
    WHERE ut.team_id = team_equipment.team_id AND ut.user_id = auth.uid()
  )
);