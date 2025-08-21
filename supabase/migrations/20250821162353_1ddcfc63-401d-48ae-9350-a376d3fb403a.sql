-- Create storage bucket for drill media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('drill-media', 'drill-media', false);

-- Create RLS policies for drill media bucket
CREATE POLICY "Authenticated users can view drill media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'drill-media' AND auth.role() = 'authenticated');

CREATE POLICY "Drill creators can upload media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'drill-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Drill creators can update their media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'drill-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Drill creators can delete their media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'drill-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add helpful function to get file size in readable format
CREATE OR REPLACE FUNCTION public.format_file_size(size_bytes bigint)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF size_bytes < 1024 THEN
    RETURN size_bytes || ' B';
  ELSIF size_bytes < 1024 * 1024 THEN
    RETURN ROUND(size_bytes / 1024.0, 1) || ' KB';
  ELSIF size_bytes < 1024 * 1024 * 1024 THEN
    RETURN ROUND(size_bytes / (1024.0 * 1024.0), 1) || ' MB';
  ELSE
    RETURN ROUND(size_bytes / (1024.0 * 1024.0 * 1024.0), 1) || ' GB';
  END IF;
END;
$$;