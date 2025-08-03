-- Fix remaining security linter issues

-- Fix RLS disabled on new tables
ALTER TABLE rate_limiting_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rate_limiting_config
CREATE POLICY "Only global admins can manage rate limiting config" ON rate_limiting_config
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND 'global_admin' = ANY(roles)
    )
);

-- Fix search path issues in functions by making them SECURITY INVOKER where appropriate
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < now() - interval '7 days';
    RETURN NULL;
END;
$$;

-- Update trigger
DROP TRIGGER IF EXISTS trigger_cleanup_sessions ON user_sessions;
CREATE TRIGGER trigger_cleanup_sessions
    AFTER INSERT ON user_sessions
    EXECUTE FUNCTION cleanup_expired_sessions();