-- Create play_styles table for centralized management
CREATE TABLE play_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('attacker', 'midfielder', 'defender', 'goalkeeper')),
  icon_type text DEFAULT 'emoji' CHECK (icon_type IN ('emoji', 'image')),
  icon_emoji text,
  icon_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE play_styles ENABLE ROW LEVEL SECURITY;

-- Everyone can view active play styles
CREATE POLICY "Anyone can view active play styles"
  ON play_styles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only global admins can manage play styles
CREATE POLICY "Only global admins can manage play styles"
  ON play_styles FOR ALL
  TO authenticated
  USING (is_global_admin_secure())
  WITH CHECK (is_global_admin_secure());

-- Insert default play styles
INSERT INTO play_styles (value, label, icon_emoji, category, icon_type) VALUES
  ('finisher', 'Finisher', '🎯', 'attacker', 'emoji'),
  ('clinical', 'Clinical', '✅', 'attacker', 'emoji'),
  ('speedster', 'Speedster', '⚡', 'attacker', 'emoji'),
  ('trickster', 'Trickster', '🔮', 'attacker', 'emoji'),
  ('playmaker', 'Playmaker', '🎭', 'midfielder', 'emoji'),
  ('engine', 'Engine', '⚙️', 'midfielder', 'emoji'),
  ('maestro', 'Maestro', '🎩', 'midfielder', 'emoji'),
  ('workhorse', 'Workhorse', '💪', 'midfielder', 'emoji'),
  ('guardian', 'Guardian', '🛡️', 'defender', 'emoji'),
  ('interceptor', 'Interceptor', '⚔️', 'defender', 'emoji'),
  ('rock', 'Rock', '🗿', 'defender', 'emoji'),
  ('sweeper', 'Sweeper', '🧹', 'defender', 'emoji'),
  ('reflexes', 'Reflexes', '🥅', 'goalkeeper', 'emoji'),
  ('commander', 'Commander', '👑', 'goalkeeper', 'emoji'),
  ('wall', 'Wall', '🧱', 'goalkeeper', 'emoji');

-- Create storage bucket for play style icons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('play-style-icons', 'play-style-icons', true);

-- Allow authenticated users to view play style icons
CREATE POLICY "Anyone can view play style icons"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'play-style-icons');

-- Only global admins can upload/update/delete play style icons
CREATE POLICY "Only global admins can manage play style icons"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'play-style-icons' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'global_admin' = ANY(profiles.roles)
    )
  )
  WITH CHECK (
    bucket_id = 'play-style-icons' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'global_admin' = ANY(profiles.roles)
    )
  );