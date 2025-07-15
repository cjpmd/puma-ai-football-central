-- Add team join codes to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_join_code TEXT UNIQUE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_join_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient code lookups
CREATE INDEX IF NOT EXISTS idx_teams_join_code ON teams(team_join_code) WHERE team_join_code IS NOT NULL;

-- Add parent linking code to players (separate from player linking code)
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_linking_code TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_linking_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for parent linking codes
CREATE INDEX IF NOT EXISTS idx_players_parent_linking_code ON players(parent_linking_code) WHERE parent_linking_code IS NOT NULL;

-- Create team code usage tracking table
CREATE TABLE IF NOT EXISTS team_code_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    code_used TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id),
    role_joined TEXT NOT NULL, -- 'player', 'parent', 'staff'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

-- Create index for team code usage
CREATE INDEX IF NOT EXISTS idx_team_code_usage_team_id ON team_code_usage(team_id);
CREATE INDEX IF NOT EXISTS idx_team_code_usage_code ON team_code_usage(code_used);

-- Enable RLS on team_code_usage table
ALTER TABLE team_code_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_code_usage
CREATE POLICY "Users can view code usage for their teams" ON team_code_usage
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM user_teams 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team managers can insert code usage records" ON team_code_usage
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM user_teams 
            WHERE user_id = auth.uid() 
            AND role = ANY(ARRAY['team_manager', 'team_assistant_manager'])
        )
    );

-- Function to generate team join codes
CREATE OR REPLACE FUNCTION generate_team_join_code(team_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_code TEXT;
    counter INTEGER := 0;
    final_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Create base code from team name (first 6 chars, uppercase, alphanumeric only)
    base_code := UPPER(REGEXP_REPLACE(team_name, '[^A-Za-z0-9]', '', 'g'));
    base_code := LEFT(base_code, 6);
    
    -- Pad with random characters if too short
    WHILE LENGTH(base_code) < 6 LOOP
        base_code := base_code || CHR(65 + FLOOR(RANDOM() * 26)::INTEGER);
    END LOOP;
    
    -- Try to find a unique code
    LOOP
        IF counter = 0 THEN
            final_code := base_code;
        ELSE
            final_code := base_code || LPAD(counter::TEXT, 2, '0');
        END IF;
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM teams WHERE team_join_code = final_code) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN final_code;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 99 THEN
            RETURN base_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate player parent linking codes
CREATE OR REPLACE FUNCTION generate_parent_linking_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8 character code: 2 letters + 6 numbers
        code := CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) || 
                CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) || 
                LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM players WHERE parent_linking_code = code) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing teams to have join codes
UPDATE teams 
SET team_join_code = generate_team_join_code(name),
    team_join_code_expires_at = now() + INTERVAL '1 year'
WHERE team_join_code IS NULL;

-- Update existing players to have parent linking codes
UPDATE players 
SET parent_linking_code = generate_parent_linking_code(),
    parent_linking_code_expires_at = now() + INTERVAL '1 year'
WHERE parent_linking_code IS NULL;