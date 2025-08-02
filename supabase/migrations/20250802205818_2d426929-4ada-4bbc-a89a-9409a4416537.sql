-- CRITICAL SECURITY FIXES FOR DATABASE LAYER

-- 1. Create comprehensive audit logging system
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only global admins can view security audit logs
CREATE POLICY "Only global admins can view security audit logs" 
ON public.security_audit_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND 'global_admin' = ANY(p.roles)
));

-- 2. Enhanced role management security
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent users from giving themselves global_admin role
  IF TG_OP = 'UPDATE' AND NEW.id = auth.uid() THEN
    -- Check if user is trying to add global_admin role to themselves
    IF 'global_admin' = ANY(NEW.roles) AND NOT ('global_admin' = ANY(OLD.roles)) THEN
      -- Log security violation
      INSERT INTO security_audit_logs (
        user_id, action_type, table_name, record_id, 
        old_data, new_data, risk_level, metadata
      ) VALUES (
        auth.uid(), 'ROLE_ESCALATION_ATTEMPT', 'profiles', NEW.id,
        jsonb_build_object('roles', OLD.roles),
        jsonb_build_object('roles', NEW.roles),
        'critical',
        jsonb_build_object('blocked', true, 'reason', 'Self-assignment of global_admin role')
      );
      
      RAISE EXCEPTION 'Security violation: Users cannot assign global_admin role to themselves';
    END IF;
  END IF;
  
  -- Prevent insertion of global_admin role during self-registration
  IF TG_OP = 'INSERT' AND NEW.id = auth.uid() THEN
    IF 'global_admin' = ANY(NEW.roles) THEN
      -- Log security violation
      INSERT INTO security_audit_logs (
        user_id, action_type, table_name, record_id, 
        new_data, risk_level, metadata
      ) VALUES (
        auth.uid(), 'ROLE_ESCALATION_ATTEMPT', 'profiles', NEW.id,
        jsonb_build_object('roles', NEW.roles),
        'critical',
        jsonb_build_object('blocked', true, 'reason', 'Self-registration with global_admin role')
      );
      
      -- Remove global_admin role silently
      NEW.roles := array_remove(NEW.roles, 'global_admin');
    END IF;
  END IF;
  
  -- Log all role changes for audit
  IF TG_OP = 'UPDATE' AND (OLD.roles IS DISTINCT FROM NEW.roles) THEN
    INSERT INTO security_audit_logs (
      user_id, action_type, table_name, record_id, 
      old_data, new_data, risk_level, metadata
    ) VALUES (
      auth.uid(), 'ROLE_CHANGE', 'profiles', NEW.id,
      jsonb_build_object('roles', OLD.roles),
      jsonb_build_object('roles', NEW.roles),
      CASE 
        WHEN 'global_admin' = ANY(NEW.roles) OR 'global_admin' = ANY(OLD.roles) THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object('changed_by', auth.uid(), 'target_user', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role management security
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- 3. Enhanced password strength validation with security logging
CREATE OR REPLACE FUNCTION public.validate_password_strength_enhanced(password text, user_email text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  errors text[] := ARRAY[]::text[];
  score integer := 0;
  common_passwords text[] := ARRAY[
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', '12345678', '111111', '1234567890', 
    'letmein', 'welcome', 'monkey', 'dragon', 'soccer'
  ];
  result jsonb;
BEGIN
  -- Length check (minimum 12 characters)
  IF length(password) < 12 THEN
    errors := array_append(errors, 'Password must be at least 12 characters long');
  ELSE
    score := score + 1;
  END IF;
  
  -- Uppercase letter check
  IF password !~ '[A-Z]' THEN
    errors := array_append(errors, 'Password must contain at least one uppercase letter');
  ELSE
    score := score + 1;
  END IF;
  
  -- Lowercase letter check
  IF password !~ '[a-z]' THEN
    errors := array_append(errors, 'Password must contain at least one lowercase letter');
  ELSE
    score := score + 1;
  END IF;
  
  -- Number check
  IF password !~ '[0-9]' THEN
    errors := array_append(errors, 'Password must contain at least one number');
  ELSE
    score := score + 1;
  END IF;
  
  -- Special character check
  IF password !~ '[^A-Za-z0-9]' THEN
    errors := array_append(errors, 'Password must contain at least one special character');
  ELSE
    score := score + 1;
  END IF;
  
  -- Check against common passwords
  IF lower(password) = ANY(common_passwords) THEN
    errors := array_append(errors, 'Password is too common and easily guessable');
  ELSE
    score := score + 1;
  END IF;
  
  -- Check for email similarity (if provided)
  IF user_email != '' AND lower(password) LIKE '%' || split_part(lower(user_email), '@', 1) || '%' THEN
    errors := array_append(errors, 'Password should not contain parts of your email address');
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'is_valid', array_length(errors, 1) IS NULL,
    'score', score,
    'max_score', 6,
    'strength', CASE 
      WHEN score >= 6 THEN 'strong'
      WHEN score >= 4 THEN 'medium' 
      ELSE 'weak'
    END,
    'errors', errors
  );
  
  -- Log weak password attempts
  IF score < 4 THEN
    INSERT INTO security_audit_logs (
      user_id, action_type, risk_level, metadata
    ) VALUES (
      auth.uid(), 'WEAK_PASSWORD_ATTEMPT', 'medium',
      jsonb_build_object('score', score, 'max_score', 6, 'email', user_email)
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 4. Rate limiting for sensitive operations
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  action_type TEXT NOT NULL,
  violation_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit violations
CREATE POLICY "Only admins can view rate limit violations" 
ON public.rate_limit_violations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND 'global_admin' = ANY(p.roles)
));

-- 5. Enhanced invitation security
CREATE OR REPLACE FUNCTION public.generate_secure_invitation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code text;
  collision_count integer := 0;
BEGIN
  LOOP
    -- Generate cryptographically secure random code
    code := encode(gen_random_bytes(16), 'base64');
    -- Remove URL-unsafe characters
    code := replace(replace(replace(code, '/', ''), '+', ''), '=', '');
    -- Take first 12 characters for reasonable length
    code := substr(code, 1, 12);
    
    -- Check for collisions
    IF NOT EXISTS (SELECT 1 FROM user_invitations WHERE invitation_code = code) THEN
      EXIT;
    END IF;
    
    collision_count := collision_count + 1;
    
    -- Prevent infinite loop
    IF collision_count > 10 THEN
      RAISE EXCEPTION 'Unable to generate unique invitation code after multiple attempts';
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;

-- 6. Secure database function updates (fix search_path vulnerabilities)
CREATE OR REPLACE FUNCTION public.is_user_club_admin_secure(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_clubs uc 
    WHERE uc.club_id = p_club_id 
      AND uc.user_id = p_user_id 
      AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
  );
$$;

-- Update all existing functions to use proper search_path
CREATE OR REPLACE FUNCTION public.is_club_member_secure(club_uuid uuid, required_roles text[] DEFAULT NULL::text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_clubs
    WHERE user_id = auth.uid()
    AND club_id = club_uuid
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_team_member_secure(team_uuid uuid, required_roles text[] DEFAULT NULL::text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_teams
    WHERE user_id = auth.uid()
    AND team_id = team_uuid
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_global_admin_secure()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
  );
END;
$$;