-- Fix remaining Security Definer views - corrected version

-- 1. Drop and recreate views without SECURITY DEFINER to fix linter errors
DROP VIEW IF EXISTS public.club_teams_detailed;
DROP VIEW IF EXISTS public.kit_items_with_sizes;
DROP VIEW IF EXISTS public.linked_teams;

-- 2. Recreate views without Security Definer (use Security Invoker by default)
CREATE VIEW public.club_teams_detailed AS
SELECT 
  ct.id,
  ct.club_id,
  ct.team_id,
  ct.created_at,
  c.name as club_name,
  c.logo_url as club_logo_url,
  t.name as team_name,
  t.logo_url as team_logo_url,
  t.age_group,
  t.game_format,
  t.season_start,
  t.season_end
FROM club_teams ct
JOIN clubs c ON ct.club_id = c.id
JOIN teams t ON ct.team_id = t.id;

-- Simplified kit items view without non-existent kit_sizes table
CREATE VIEW public.kit_items_with_sizes AS
SELECT 
  ki.id,
  ki.team_id,
  ki.name,
  ki.category,
  ki.size_category,
  ARRAY[]::uuid[] as available_size_ids,
  ARRAY[]::text[] as available_size_names
FROM kit_items ki;

CREATE VIEW public.linked_teams AS
SELECT 
  t.id,
  t.name,
  t.logo_url,
  t.age_group,
  t.game_format,
  t.season_start,
  t.season_end,
  t.kit_icons,
  t.created_at,
  t.updated_at,
  t.club_id,
  c.name as club_name,
  c.logo_url as club_logo_url,
  c.subscription_type,
  p.name as manager_name,
  p.email as manager_email,
  p.phone as manager_phone,
  array_agg(DISTINCT pc.name) FILTER (WHERE pc.name IS NOT NULL) as performance_categories
FROM teams t
LEFT JOIN clubs c ON t.club_id = c.id
LEFT JOIN user_teams ut ON t.id = ut.team_id AND ut.role IN ('team_manager', 'team_assistant_manager')
LEFT JOIN profiles p ON ut.user_id = p.id
LEFT JOIN performance_categories pc ON t.id = pc.team_id
GROUP BY t.id, t.name, t.logo_url, t.age_group, t.game_format, t.season_start, 
         t.season_end, t.kit_icons, t.created_at, t.updated_at, t.club_id,
         c.name, c.logo_url, c.subscription_type, p.name, p.email, p.phone;

-- 3. Add comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type text, 
  details jsonb DEFAULT '{}', 
  risk_level text DEFAULT 'low',
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO security_audit_logs (
    user_id,
    action_type,
    risk_level,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    event_type,
    risk_level,
    details,
    ip_address,
    user_agent
  );
END;
$$;

-- 4. Enhanced input validation for authentication endpoints
CREATE OR REPLACE FUNCTION public.validate_authentication_input(
  email text DEFAULT NULL,
  password text DEFAULT NULL,
  action_type text DEFAULT 'login'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  errors text[] := ARRAY[]::text[];
  password_validation jsonb;
BEGIN
  -- Rate limiting check
  IF EXISTS (
    SELECT 1 FROM rate_limit_violations 
    WHERE action_type = 'auth_attempt'
    AND (user_id = auth.uid() OR ip_address = inet_client_addr())
    AND blocked_until > now()
  ) THEN
    errors := array_append(errors, 'Too many attempts. Please try again later.');
  END IF;
  
  -- Email validation
  IF email IS NOT NULL THEN
    IF NOT (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
      errors := array_append(errors, 'Invalid email format');
    END IF;
    
    IF length(email) > 254 THEN
      errors := array_append(errors, 'Email address is too long');
    END IF;
  END IF;
  
  -- Password validation for signup/password change
  IF password IS NOT NULL AND action_type IN ('signup', 'password_change') THEN
    password_validation := validate_password_strength_enhanced(password, COALESCE(email, ''));
    
    IF NOT (password_validation->>'is_valid')::boolean THEN
      errors := errors || ARRAY(
        SELECT jsonb_array_elements_text(password_validation->'errors')
      );
    END IF;
  END IF;
  
  -- Log authentication attempt
  PERFORM log_security_event_enhanced(
    'AUTH_VALIDATION',
    jsonb_build_object(
      'action_type', action_type,
      'email_provided', email IS NOT NULL,
      'password_provided', password IS NOT NULL,
      'errors_count', array_length(errors, 1)
    ),
    CASE 
      WHEN array_length(errors, 1) > 0 THEN 'medium'
      ELSE 'low'
    END
  );
  
  result := jsonb_build_object(
    'is_valid', array_length(errors, 1) IS NULL,
    'errors', errors
  );
  
  RETURN result;
END;
$$;