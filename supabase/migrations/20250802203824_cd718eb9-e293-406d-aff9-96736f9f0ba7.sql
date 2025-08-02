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

-- Drop and recreate kit_items_with_sizes view safely (simplified without kit_sizes)
DROP VIEW IF EXISTS public.kit_items_with_sizes CASCADE;

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