-- Add header display configuration to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS header_display_type TEXT DEFAULT 'logo_and_name';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS header_image_url TEXT;

-- Update existing teams to have default header display
UPDATE teams SET header_display_type = 'logo_and_name' WHERE header_display_type IS NULL;