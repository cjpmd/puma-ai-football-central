-- Fix remaining security issues and create missing tables

-- 1. Create missing user relationship tables that are referenced in RLS policies
CREATE TABLE IF NOT EXISTS user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'player', 'parent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, team_id, role)
);

-- Enable RLS on user_teams
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_teams
CREATE POLICY "Users can view their own team memberships" ON user_teams
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team managers can manage team memberships" ON user_teams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = user_teams.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Create user_clubs table
CREATE TABLE IF NOT EXISTS user_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  club_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('club_admin', 'club_chair', 'club_secretary', 'club_member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, club_id)
);

-- Enable RLS on user_clubs
ALTER TABLE user_clubs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_clubs
CREATE POLICY "Users can view their own club memberships" ON user_clubs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Club admins can manage club memberships" ON user_clubs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_clubs uc
    WHERE uc.club_id = user_clubs.club_id 
    AND uc.user_id = auth.uid()
    AND uc.role IN ('club_admin', 'club_chair')
  )
);

-- Create user_staff table  
CREATE TABLE IF NOT EXISTS user_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, staff_id)
);

-- Enable RLS on user_staff
ALTER TABLE user_staff ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_staff
CREATE POLICY "Users can view their own staff links" ON user_staff
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team managers can manage staff links" ON user_staff
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM team_staff ts
    JOIN user_teams ut ON ts.team_id = ut.team_id
    WHERE ts.id = user_staff.staff_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Create user_players table to replace the player linking system
CREATE TABLE IF NOT EXISTS user_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('self', 'parent', 'guardian')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, player_id)
);

-- Enable RLS on user_players
ALTER TABLE user_players ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_players
CREATE POLICY "Users can view their own player links" ON user_players
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own player links" ON user_players
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Team managers can view player links for their teams" ON user_players
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM players p
    JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.id = user_players.player_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- 2. Create a teams table if it doesn't exist (referenced in many policies)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_group TEXT,
  game_format TEXT,
  logo_url TEXT,
  season_start DATE,
  season_end DATE,
  club_id UUID,
  manager_name TEXT,
  manager_email TEXT,
  manager_phone TEXT,
  team_join_code TEXT UNIQUE,
  kit_icons JSONB DEFAULT '{}',
  performance_categories TEXT[],
  subscription_type TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for teams
CREATE POLICY "Team members can view their teams" ON teams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = teams.id AND ut.user_id = auth.uid()
  )
);

CREATE POLICY "Team managers can manage their teams" ON teams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = teams.id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- 3. Create team_staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('coach', 'assistant_coach', 'manager', 'assistant_manager', 'physiotherapist', 'kit_manager')),
  coaching_badges JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on team_staff
ALTER TABLE team_staff ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for team_staff
CREATE POLICY "Team members can view team staff" ON team_staff
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_staff.team_id AND ut.user_id = auth.uid()
  )
);

CREATE POLICY "Team managers can manage team staff" ON team_staff
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_staff.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- 4. Drop and recreate problematic security definer views as regular views
-- First, let's identify what views exist that might be causing issues
-- (We'll need to check what views are actually causing the security definer warnings)

-- 5. Add foreign key constraints for data integrity
ALTER TABLE user_teams ADD CONSTRAINT fk_user_teams_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_clubs ADD CONSTRAINT fk_user_clubs_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_staff ADD CONSTRAINT fk_user_staff_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_players ADD CONSTRAINT fk_user_players_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Add indexes for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_user_clubs_user_id ON user_clubs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clubs_club_id ON user_clubs(club_id);
CREATE INDEX IF NOT EXISTS idx_user_staff_user_id ON user_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_user_players_user_id ON user_players(user_id);
CREATE INDEX IF NOT EXISTS idx_user_players_player_id ON user_players(player_id);

-- 7. Update existing foreign key relationships
-- Update players table to reference teams properly
ALTER TABLE players ADD CONSTRAINT fk_players_team_id 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Update events table to reference teams properly  
ALTER TABLE events ADD CONSTRAINT fk_events_team_id 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Update club_teams to reference both clubs and teams
ALTER TABLE club_teams ADD CONSTRAINT fk_club_teams_club_id 
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE club_teams ADD CONSTRAINT fk_club_teams_team_id 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Update team_staff to reference teams
ALTER TABLE team_staff ADD CONSTRAINT fk_team_staff_team_id 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Update user_staff to reference team_staff
ALTER TABLE user_staff ADD CONSTRAINT fk_user_staff_staff_id 
  FOREIGN KEY (staff_id) REFERENCES team_staff(id) ON DELETE CASCADE;

-- Update user_players to reference players
ALTER TABLE user_players ADD CONSTRAINT fk_user_players_player_id 
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- 8. Create an audit log table for tracking sensitive changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit_logs (only admins should see audit logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only global admins can view audit logs" ON audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND 'global_admin' = ANY(p.roles)
  )
);

-- 9. Add data validation constraints
ALTER TABLE teams ADD CONSTRAINT teams_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE clubs ADD CONSTRAINT clubs_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE players ADD CONSTRAINT players_name_not_empty CHECK (length(trim(name)) > 0);

-- 10. Update the audit function to actually log to the audit table
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive changes to audit table
  INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME, 
    TG_OP, 
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Add audit triggers to sensitive tables
CREATE TRIGGER audit_clubs_changes 
  AFTER INSERT OR UPDATE OR DELETE ON clubs
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

CREATE TRIGGER audit_teams_changes 
  AFTER INSERT OR UPDATE OR DELETE ON teams
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

CREATE TRIGGER audit_profiles_changes 
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

CREATE TRIGGER audit_user_teams_changes 
  AFTER INSERT OR UPDATE OR DELETE ON user_teams
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

CREATE TRIGGER audit_user_clubs_changes 
  AFTER INSERT OR UPDATE OR DELETE ON user_clubs
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();