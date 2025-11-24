-- Create policy to allow public access to play-style-icons bucket
CREATE POLICY "Public access to play style icons"
ON storage.objects
FOR SELECT
USING (bucket_id = 'play-style-icons');