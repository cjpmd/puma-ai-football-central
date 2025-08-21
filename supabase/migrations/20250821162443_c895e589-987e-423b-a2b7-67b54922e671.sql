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