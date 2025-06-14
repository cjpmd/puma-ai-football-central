
-- Create a public storage bucket for player photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('player_photos', 'player_photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Add RLS policies for the player_photos bucket to allow public read access
-- and authenticated users to upload/update/delete their own photos (or staff to manage all)

-- Policy: Allow public read access to all files in player_photos
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player_photos');

-- Policy: Allow authenticated users to upload files to player_photos
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
CREATE POLICY "Allow authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'player_photos');

-- Policy: Allow users to update their own photo or staff to update any
-- Note: This requires a way to link storage objects to player IDs,
-- which is typically done via file path naming conventions (e.g., `user_id/file_name` or `player_id/file_name`)
-- For simplicity, we'll allow authenticated users to update any photo they uploaded (owner matches auth.uid())
-- A more robust solution might involve a separate table or custom claims.
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
CREATE POLICY "Allow authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'player_photos' AND auth.uid() = owner);


-- Policy: Allow users to delete their own photo or staff to delete any
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
CREATE POLICY "Allow authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'player_photos' AND auth.uid() = owner);

-- Ensure the 'players' table has a 'photo_url' column if it doesn't exist.
-- This migration assumes it might not be there or needs to be text.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.players ADD COLUMN photo_url TEXT;
  ELSE
    -- If it exists, ensure it's TEXT type
    ALTER TABLE public.players ALTER COLUMN photo_url TYPE TEXT;
  END IF;
END $$;

