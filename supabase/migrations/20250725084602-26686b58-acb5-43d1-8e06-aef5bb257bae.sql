-- Fix remaining security issues - handle existing tables properly

-- 1. Create missing user relationship tables only if they don't exist
DO $$
BEGIN
  -- Create user_teams table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_teams') THEN
    CREATE TABLE user_teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      team_id UUID NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'player', 'parent')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, team_id, role)
    );
    
    ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
    
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
  END IF;

  -- Create user_clubs table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_clubs') THEN
    CREATE TABLE user_clubs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      club_id UUID NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('club_admin', 'club_chair', 'club_secretary', 'club_member')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, club_id)
    );
    
    ALTER TABLE user_clubs ENABLE ROW LEVEL SECURITY;
    
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
  END IF;

  -- Handle user_staff table - drop existing policies first if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_staff') THEN
    DROP POLICY IF EXISTS "Users can view their own staff links" ON user_staff;
    DROP POLICY IF EXISTS "Team managers can manage staff links" ON user_staff;
  ELSE
    CREATE TABLE user_staff (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      staff_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, staff_id)
    );
    ALTER TABLE user_staff ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Create user_staff policies
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

  -- Create user_players table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_players') THEN
    CREATE TABLE user_players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      player_id UUID NOT NULL,
      relationship TEXT NOT NULL CHECK (relationship IN ('self', 'parent', 'guardian')),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, player_id)
    );
    
    ALTER TABLE user_players ENABLE ROW LEVEL SECURITY;
    
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
  END IF;

  -- Create teams table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
    CREATE TABLE teams (
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
    
    ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    
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
  END IF;

  -- Create team_staff table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_staff') THEN
    CREATE TABLE team_staff (
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
    
    ALTER TABLE team_staff ENABLE ROW LEVEL SECURITY;
    
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
  END IF;

  -- Create audit_logs table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE TABLE audit_logs (
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
    
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Only global admins can view audit logs" ON audit_logs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND 'global_admin' = ANY(p.roles)
      )
    );
  END IF;
END $$;

-- 2. Add foreign key constraints safely (only if they don't exist)
DO $$
BEGIN
  -- Add foreign keys only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_user_teams_user_id') THEN
    ALTER TABLE user_teams ADD CONSTRAINT fk_user_teams_user_id 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_user_clubs_user_id') THEN
    ALTER TABLE user_clubs ADD CONSTRAINT fk_user_clubs_user_id 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_user_staff_user_id') THEN
    ALTER TABLE user_staff ADD CONSTRAINT fk_user_staff_user_id 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_user_players_user_id') THEN
    ALTER TABLE user_players ADD CONSTRAINT fk_user_players_user_id 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_user_clubs_user_id ON user_clubs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clubs_club_id ON user_clubs(club_id);
CREATE INDEX IF NOT EXISTS idx_user_staff_user_id ON user_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_user_players_user_id ON user_players(user_id);
CREATE INDEX IF NOT EXISTS idx_user_players_player_id ON user_players(player_id);

-- 4. Add data validation constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'teams_name_not_empty') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_name_not_empty CHECK (length(trim(name)) > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'clubs_name_not_empty') THEN
    ALTER TABLE clubs ADD CONSTRAINT clubs_name_not_empty CHECK (length(trim(name)) > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'players_name_not_empty') THEN
    ALTER TABLE players ADD CONSTRAINT players_name_not_empty CHECK (length(trim(name)) > 0);
  END IF;
END $$;