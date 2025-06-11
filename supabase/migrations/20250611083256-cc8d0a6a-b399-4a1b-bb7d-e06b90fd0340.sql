
-- Add missing fields to players table for FIFA-style card functionality
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS card_design_id TEXT DEFAULT 'goldRare',
ADD COLUMN IF NOT EXISTS fun_stats JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS play_style TEXT;
