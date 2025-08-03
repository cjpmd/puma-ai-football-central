-- Fix Security Definer Views by recreating them as regular views
-- This addresses the critical security linter errors

-- Drop existing Security Definer views
DROP VIEW IF EXISTS club_teams_detailed CASCADE;
DROP VIEW IF EXISTS kit_items_with_sizes CASCADE;
DROP VIEW IF EXISTS linked_teams CASCADE;

-- Recreate club_teams_detailed as regular view with proper RLS enforcement
CREATE VIEW club_teams_detailed AS
SELECT 
    ct.id,
    ct.club_id,
    ct.team_id,
    ct.created_at,
    c.name AS club_name,
    c.logo_url AS club_logo_url,
    t.name AS team_name,
    t.logo_url AS team_logo_url,
    t.age_group,
    t.game_format,
    t.season_start,
    t.season_end
FROM club_teams ct
JOIN clubs c ON ct.club_id = c.id
JOIN teams t ON ct.team_id = t.id;

-- Recreate kit_items_with_sizes as regular view
CREATE VIEW kit_items_with_sizes AS
SELECT 
    ki.id,
    ki.team_id,
    ki.name,
    ki.category,
    ki.size_category,
    ARRAY[]::uuid[] AS available_size_ids,
    ARRAY[]::text[] AS available_size_names
FROM kit_items ki;

-- Recreate linked_teams as regular view
CREATE VIEW linked_teams AS
SELECT 
    t.id,
    t.name,
    t.logo_url,
    t.age_group,
    t.game_format,
    t.season_start,
    t.season_end,
    t.created_at,
    t.updated_at,
    t.kit_icons,
    t.club_id,
    c.name AS club_name,
    c.logo_url AS club_logo_url,
    c.subscription_type,
    p.name AS manager_name,
    p.email AS manager_email,
    p.phone AS manager_phone,
    ARRAY(
        SELECT pc.name 
        FROM performance_categories pc 
        WHERE pc.team_id = t.id
    ) AS performance_categories
FROM teams t
LEFT JOIN clubs c ON t.club_id = c.id
LEFT JOIN user_teams ut ON t.id = ut.team_id AND ut.role = 'team_manager'
LEFT JOIN profiles p ON ut.user_id = p.id;

-- Enable RLS on all views (if not already enabled)
ALTER VIEW club_teams_detailed SET (security_invoker = true);
ALTER VIEW kit_items_with_sizes SET (security_invoker = true);
ALTER VIEW linked_teams SET (security_invoker = true);

-- Create enhanced rate limiting system at database level
CREATE TABLE IF NOT EXISTS rate_limiting_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    max_attempts integer NOT NULL DEFAULT 5,
    window_minutes integer NOT NULL DEFAULT 15,
    block_duration_minutes integer NOT NULL DEFAULT 30,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert default rate limiting configurations
INSERT INTO rate_limiting_config (action_type, max_attempts, window_minutes, block_duration_minutes)
VALUES 
    ('auth_attempt', 5, 15, 30),
    ('password_reset', 3, 60, 60),
    ('invitation_send', 10, 60, 60)
ON CONFLICT DO NOTHING;

-- Create enhanced rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit_enhanced(
    p_action_type text,
    p_user_id uuid DEFAULT NULL,
    p_ip_address inet DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    config_record RECORD;
    violation_count integer;
    is_blocked boolean := false;
    block_until timestamp with time zone;
    result jsonb;
BEGIN
    -- Get rate limiting configuration
    SELECT * INTO config_record
    FROM rate_limiting_config
    WHERE action_type = p_action_type;
    
    IF NOT FOUND THEN
        -- Default configuration if not found
        config_record.max_attempts := 5;
        config_record.window_minutes := 15;
        config_record.block_duration_minutes := 30;
    END IF;
    
    -- Check for existing violations within the time window
    SELECT COUNT(*), MAX(blocked_until)
    INTO violation_count, block_until
    FROM rate_limit_violations
    WHERE action_type = p_action_type
    AND (user_id = p_user_id OR ip_address = p_ip_address)
    AND window_start > now() - (config_record.window_minutes || ' minutes')::interval;
    
    -- Check if currently blocked
    IF block_until IS NOT NULL AND block_until > now() THEN
        is_blocked := true;
    ELSIF violation_count >= config_record.max_attempts THEN
        -- Create new violation record
        INSERT INTO rate_limit_violations (
            action_type, user_id, ip_address, violation_count,
            blocked_until, window_start
        ) VALUES (
            p_action_type, p_user_id, p_ip_address, violation_count + 1,
            now() + (config_record.block_duration_minutes || ' minutes')::interval,
            now()
        );
        is_blocked := true;
        block_until := now() + (config_record.block_duration_minutes || ' minutes')::interval;
    END IF;
    
    -- Log the rate limit check
    PERFORM log_security_event_enhanced(
        'RATE_LIMIT_CHECK',
        jsonb_build_object(
            'action_type', p_action_type,
            'violation_count', violation_count,
            'max_attempts', config_record.max_attempts,
            'is_blocked', is_blocked
        ),
        CASE WHEN is_blocked THEN 'high' ELSE 'low' END,
        p_ip_address
    );
    
    result := jsonb_build_object(
        'is_blocked', is_blocked,
        'violation_count', violation_count,
        'max_attempts', config_record.max_attempts,
        'blocked_until', block_until,
        'window_minutes', config_record.window_minutes
    );
    
    RETURN result;
END;
$$;

-- Create session security tracking table
CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    last_activity timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_admin_session boolean DEFAULT false,
    UNIQUE(session_token)
);

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
FOR DELETE USING (auth.uid() = user_id);

-- Create function to validate session security
CREATE OR REPLACE FUNCTION validate_session_security(
    p_user_id uuid,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    session_count integer;
    is_admin boolean := false;
    suspicious_activity boolean := false;
    result jsonb;
BEGIN
    -- Check if user is admin
    SELECT 'global_admin' = ANY(roles) INTO is_admin
    FROM profiles
    WHERE id = p_user_id;
    
    -- Count active sessions
    SELECT COUNT(*) INTO session_count
    FROM user_sessions
    WHERE user_id = p_user_id
    AND expires_at > now();
    
    -- Check for suspicious activity (multiple IPs, unusual patterns)
    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(DISTINCT ip_address) > 3 INTO suspicious_activity
        FROM user_sessions
        WHERE user_id = p_user_id
        AND created_at > now() - interval '24 hours';
    END IF;
    
    -- Log session validation
    PERFORM log_security_event_enhanced(
        'SESSION_VALIDATION',
        jsonb_build_object(
            'session_count', session_count,
            'is_admin', is_admin,
            'suspicious_activity', suspicious_activity
        ),
        CASE 
            WHEN suspicious_activity THEN 'high'
            WHEN is_admin THEN 'medium'
            ELSE 'low'
        END,
        p_ip_address,
        p_user_agent
    );
    
    result := jsonb_build_object(
        'session_count', session_count,
        'is_admin', is_admin,
        'suspicious_activity', suspicious_activity,
        'max_sessions', CASE WHEN is_admin THEN 2 ELSE 5 END
    );
    
    RETURN result;
END;
$$;

-- Create trigger for automatic session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < now() - interval '7 days';
    RETURN NULL;
END;
$$;

-- Create trigger to run session cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_sessions ON user_sessions;
CREATE TRIGGER trigger_cleanup_sessions
    AFTER INSERT ON user_sessions
    EXECUTE FUNCTION cleanup_expired_sessions();

-- Create enhanced role validation function
CREATE OR REPLACE FUNCTION validate_user_role_access(
    p_user_id uuid,
    p_required_role text,
    p_resource_type text DEFAULT 'general',
    p_resource_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_roles text[];
    has_access boolean := false;
    result jsonb;
BEGIN
    -- Get user roles
    SELECT roles INTO user_roles
    FROM profiles
    WHERE id = p_user_id;
    
    -- Check if user has required role
    has_access := p_required_role = ANY(user_roles);
    
    -- Additional checks for global admin
    IF 'global_admin' = ANY(user_roles) THEN
        has_access := true;
    END IF;
    
    -- Resource-specific access checks
    IF p_resource_type = 'team' AND p_resource_id IS NOT NULL THEN
        has_access := has_access OR EXISTS (
            SELECT 1 FROM user_teams
            WHERE user_id = p_user_id
            AND team_id = p_resource_id
            AND role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
        );
    ELSIF p_resource_type = 'club' AND p_resource_id IS NOT NULL THEN
        has_access := has_access OR EXISTS (
            SELECT 1 FROM user_clubs
            WHERE user_id = p_user_id
            AND club_id = p_resource_id
            AND role = ANY(ARRAY['club_admin', 'club_chair'])
        );
    END IF;
    
    -- Log access attempt
    PERFORM log_security_event_enhanced(
        'ROLE_ACCESS_CHECK',
        jsonb_build_object(
            'required_role', p_required_role,
            'user_roles', user_roles,
            'resource_type', p_resource_type,
            'resource_id', p_resource_id,
            'access_granted', has_access
        ),
        CASE WHEN NOT has_access THEN 'medium' ELSE 'low' END
    );
    
    result := jsonb_build_object(
        'has_access', has_access,
        'user_roles', user_roles,
        'required_role', p_required_role
    );
    
    RETURN result;
END;
$$;