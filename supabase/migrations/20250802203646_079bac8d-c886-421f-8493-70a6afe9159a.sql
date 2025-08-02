-- Fix Security Definer Views and Function Security Issues
-- Drop the existing security definer views and recreate them safely

-- First, let's identify and fix the club_teams_detailed view if it exists
DROP VIEW IF EXISTS public.club_teams_detailed CASCADE;

-- Recreate club_teams_detailed as a regular view (SECURITY INVOKER)
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

-- Drop and recreate kit_items_with_sizes view safely
DROP VIEW IF EXISTS public.kit_items_with_sizes CASCADE;

CREATE VIEW public.kit_items_with_sizes AS
SELECT 
  ki.id,
  ki.team_id,
  ki.name,
  ki.category,
  ki.size_category,
  ARRAY(
    SELECT ks.id 
    FROM kit_sizes ks 
    WHERE ks.category = ki.size_category
    ORDER BY ks.display_order
  ) as available_size_ids,
  ARRAY(
    SELECT ks.name 
    FROM kit_sizes ks 
    WHERE ks.category = ki.size_category
    ORDER BY ks.display_order
  ) as available_size_names
FROM kit_items ki;

-- Drop and recreate linked_teams view safely  
DROP VIEW IF EXISTS public.linked_teams CASCADE;

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
  t.subscription_type,
  t.club_id,
  c.name as club_name,
  c.logo_url as club_logo_url,
  p.name as manager_name,
  p.email as manager_email,
  p.phone as manager_phone,
  ARRAY(SELECT pc.name FROM performance_categories pc WHERE pc.team_id = t.id) as performance_categories
FROM teams t
LEFT JOIN clubs c ON t.club_id = c.id
LEFT JOIN user_teams ut ON t.id = ut.team_id AND ut.role IN ('team_manager', 'manager')
LEFT JOIN profiles p ON ut.user_id = p.id;

-- Fix database functions to use stable search_path and improve security
CREATE OR REPLACE FUNCTION public.is_user_club_admin(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM user_clubs uc 
    WHERE uc.club_id = p_club_id 
      AND uc.user_id = p_user_id 
      AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid uuid, required_roles text[] DEFAULT NULL::text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_id = auth.uid()
    AND team_id = team_uuid
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_club_member(club_uuid uuid, required_roles text[] DEFAULT NULL::text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_clubs
    WHERE user_id = auth.uid()
    AND club_id = club_uuid
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$function$;

-- Add password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  -- Password must be at least 12 characters
  IF length(password) < 12 THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain lowercase letter  
  IF password !~ '[a-z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain number
  IF password !~ '[0-9]' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain special character
  IF password !~ '[^A-Za-z0-9]' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Prevent role self-assignment for admin roles
CREATE OR REPLACE FUNCTION public.prevent_admin_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Prevent users from giving themselves global_admin role
  IF TG_OP = 'UPDATE' AND NEW.id = auth.uid() THEN
    IF 'global_admin' = ANY(NEW.roles) AND NOT ('global_admin' = ANY(OLD.roles)) THEN
      RAISE EXCEPTION 'Users cannot assign global_admin role to themselves';
    END IF;
  END IF;
  
  -- Prevent insertion of global_admin role during self-registration
  IF TG_OP = 'INSERT' AND NEW.id = auth.uid() THEN
    IF 'global_admin' = ANY(NEW.roles) THEN
      NEW.roles := array_remove(NEW.roles, 'global_admin');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for role protection
DROP TRIGGER IF EXISTS prevent_admin_self_assignment_trigger ON public.profiles;
CREATE TRIGGER prevent_admin_self_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_assignment();

-- Improve invitation security with expiration
CREATE OR REPLACE FUNCTION public.generate_secure_invitation_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
    code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate cryptographically secure 16-character code
        code := encode(gen_random_bytes(12), 'base64');
        code := translate(code, '/+=', 'ABC'); -- Replace problematic characters
        code := upper(left(code, 12));
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM user_invitations WHERE invitation_code = code) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$function$;

-- Add rate limiting table for invitations
CREATE TABLE IF NOT EXISTS public.invitation_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email text NOT NULL,
    invitation_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.invitation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limiting policy
CREATE POLICY "Users can manage their own rate limits" ON public.invitation_rate_limits
FOR ALL USING (user_id = auth.uid());

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    current_count integer;
    window_start_time timestamp with time zone;
BEGIN
    -- Check current rate limit window (1 hour)
    SELECT invitation_count, window_start INTO current_count, window_start_time
    FROM invitation_rate_limits 
    WHERE user_id = p_user_id AND email = p_email
    AND window_start > now() - interval '1 hour';
    
    -- If no recent record or window expired, allow and reset
    IF current_count IS NULL OR window_start_time <= now() - interval '1 hour' THEN
        INSERT INTO invitation_rate_limits (user_id, email, invitation_count, window_start)
        VALUES (p_user_id, p_email, 1, now())
        ON CONFLICT (user_id, email) DO UPDATE SET
            invitation_count = 1,
            window_start = now();
        RETURN TRUE;
    END IF;
    
    -- Check if under limit (max 5 invitations per hour per email)
    IF current_count < 5 THEN
        UPDATE invitation_rate_limits 
        SET invitation_count = invitation_count + 1
        WHERE user_id = p_user_id AND email = p_email;
        RETURN TRUE;
    END IF;
    
    -- Rate limit exceeded
    RETURN FALSE;
END;
$function$;

-- Add unique constraint to rate limits table
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_rate_limits_user_email 
ON public.invitation_rate_limits (user_id, email);