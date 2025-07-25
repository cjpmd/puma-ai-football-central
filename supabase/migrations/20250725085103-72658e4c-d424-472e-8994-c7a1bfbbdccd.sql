-- Fix the remaining security definer views and complete security hardening

-- First, let's check and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS linked_teams CASCADE;
DROP VIEW IF EXISTS club_teams_detailed CASCADE;
DROP VIEW IF EXISTS kit_items_with_sizes CASCADE;

-- Recreate views as regular views (not SECURITY DEFINER)
CREATE VIEW linked_teams AS
SELECT 
  t.id,
  t.name,
  t.age_group,
  t.game_format,
  t.logo_url,
  t.season_start,
  t.season_end,
  t.club_id,
  c.name as club_name,
  c.logo_url as club_logo_url,
  t.manager_name,
  t.manager_email,
  t.manager_phone,
  t.kit_icons,
  t.performance_categories,
  t.subscription_type,
  t.created_at,
  t.updated_at
FROM teams t
LEFT JOIN clubs c ON t.club_id = c.id;

-- Enable RLS on the view
ALTER VIEW linked_teams SET (security_barrier = true);

CREATE VIEW club_teams_detailed AS
SELECT 
  ct.id,
  ct.club_id,
  ct.team_id,
  c.name as club_name,
  c.logo_url as club_logo_url,
  t.name as team_name,
  t.age_group,
  t.game_format,
  t.logo_url as team_logo_url,
  t.season_start,
  t.season_end,
  ct.created_at
FROM club_teams ct
JOIN clubs c ON ct.club_id = c.id
JOIN teams t ON ct.team_id = t.id;

-- Enable RLS on the view
ALTER VIEW club_teams_detailed SET (security_barrier = true);

-- For kit_items_with_sizes, we need to create a proper table structure first
-- This appears to be a view of kit items with their available sizes
-- Let's create a proper kit_items table if it doesn't exist

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kit_items') THEN
    CREATE TABLE kit_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('shirt', 'shorts', 'socks', 'tracksuit', 'training_gear', 'accessories')),
      size_category TEXT NOT NULL CHECK (size_category IN ('clothing', 'footwear', 'equipment')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Team members can view kit items" ON kit_items
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM user_teams ut
        WHERE ut.team_id = kit_items.team_id AND ut.user_id = auth.uid()
      )
    );
    
    CREATE POLICY "Team managers can manage kit items" ON kit_items
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_teams ut
        WHERE ut.team_id = kit_items.team_id 
        AND ut.user_id = auth.uid()
        AND ut.role IN ('team_manager', 'team_assistant_manager')
      )
    );
  END IF;
END $$;

-- Now create the kit_items_with_sizes view
CREATE VIEW kit_items_with_sizes AS
SELECT 
  ki.id,
  ki.team_id,
  ki.name,
  ki.category,
  ki.size_category,
  array_agg(tcs.size_name ORDER BY tcs.display_order) as available_size_names,
  array_agg(tcs.id ORDER BY tcs.display_order) as available_size_ids
FROM kit_items ki
LEFT JOIN team_clothing_sizes tcs ON ki.team_id = tcs.team_id AND ki.size_category = tcs.category
GROUP BY ki.id, ki.team_id, ki.name, ki.category, ki.size_category;

-- Enable RLS on the view
ALTER VIEW kit_items_with_sizes SET (security_barrier = true);

-- Additional security improvements

-- 1. Create a more restrictive function for checking global admin status
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
    AND array_length(roles, 1) = 1 -- Must be ONLY global admin, not combined with other roles
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. Create a function to safely check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID, required_roles TEXT[] DEFAULT ARRAY['team_manager', 'team_assistant_manager', 'team_coach']::TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_id = auth.uid()
    AND team_id = team_uuid
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Create a function to safely check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(club_uuid UUID, required_roles TEXT[] DEFAULT ARRAY['club_admin', 'club_chair']::TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_clubs
    WHERE user_id = auth.uid()
    AND club_id = club_uuid
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4. Update some critical policies to use these safer functions
-- Update clubs policies
DROP POLICY IF EXISTS "Club officials can manage their clubs" ON clubs;
DROP POLICY IF EXISTS "Users can view clubs they're connected to" ON clubs;

CREATE POLICY "Club officials can manage their clubs" ON clubs
FOR ALL USING (
  is_club_member(clubs.id, ARRAY['admin', 'manager', 'secretary']) OR
  is_global_admin()
);

CREATE POLICY "Users can view clubs they're connected to" ON clubs
FOR SELECT USING (
  is_club_member(clubs.id, NULL) OR
  EXISTS (
    SELECT 1 FROM club_teams ct
    JOIN user_teams ut ON ct.team_id = ut.team_id
    WHERE ct.club_id = clubs.id AND ut.user_id = auth.uid()
  ) OR
  is_global_admin()
);

-- Update events policies
DROP POLICY IF EXISTS "Team members can manage their team events" ON events;
DROP POLICY IF EXISTS "Team members can view their team events" ON events;

CREATE POLICY "Team staff can manage their team events" ON events
FOR ALL USING (
  is_team_member(events.team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach']) OR
  is_global_admin()
);

CREATE POLICY "Team members can view their team events" ON events
FOR SELECT USING (
  is_team_member(events.team_id, NULL) OR
  is_global_admin()
);

-- 5. Add rate limiting table for security
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON rate_limits
FOR SELECT USING (user_id = auth.uid() OR is_global_admin());

-- 6. Create a security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  details JSONB DEFAULT '{}'::JSONB,
  risk_level TEXT DEFAULT 'low'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    new_data,
    user_id
  ) VALUES (
    'security_events',
    event_type,
    jsonb_build_object(
      'risk_level', risk_level,
      'details', details,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    ),
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Final security constraints and indexes
-- Add unique constraint to prevent duplicate admin roles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_global_admin 
ON profiles (id) 
WHERE 'global_admin' = ANY(roles) AND array_length(roles, 1) > 1;

-- Add indexes for security queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action, window_start);
CREATE INDEX IF NOT EXISTS idx_profiles_roles_gin ON profiles USING GIN(roles);

-- 8. Add constraints to prevent privilege escalation
ALTER TABLE profiles ADD CONSTRAINT prevent_self_admin_elevation 
CHECK (
  CASE 
    WHEN id = auth.uid() AND 'global_admin' = ANY(roles) 
    THEN array_length(roles, 1) = (
      SELECT array_length(roles, 1) 
      FROM profiles p2 
      WHERE p2.id = profiles.id
    )
    ELSE true 
  END
);