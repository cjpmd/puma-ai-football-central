-- Create missing user_is_global_admin function referenced in RLS policies
CREATE OR REPLACE FUNCTION public.user_is_global_admin()
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

-- Create enhanced role validation function for authorization context
CREATE OR REPLACE FUNCTION public.validate_user_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_roles text[];
    user_teams jsonb;
    user_clubs jsonb;
    result jsonb;
BEGIN
    -- Get user roles
    SELECT roles INTO user_roles
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get user teams with roles
    SELECT jsonb_agg(
        jsonb_build_object(
            'team_id', team_id,
            'role', role
        )
    ) INTO user_teams
    FROM user_teams
    WHERE user_id = p_user_id;
    
    -- Get user clubs with roles
    SELECT jsonb_agg(
        jsonb_build_object(
            'club_id', club_id,
            'role', role
        )
    ) INTO user_clubs
    FROM user_clubs
    WHERE user_id = p_user_id;
    
    -- Build result
    result := jsonb_build_object(
        'user_roles', COALESCE(user_roles, ARRAY[]::text[]),
        'team_memberships', COALESCE(user_teams, '[]'::jsonb),
        'club_memberships', COALESCE(user_clubs, '[]'::jsonb),
        'is_global_admin', 'global_admin' = ANY(COALESCE(user_roles, ARRAY[]::text[]))
    );
    
    -- Log permission check
    PERFORM log_security_event_enhanced(
        'PERMISSION_CHECK',
        jsonb_build_object(
            'checked_user', p_user_id,
            'is_global_admin', 'global_admin' = ANY(COALESCE(user_roles, ARRAY[]::text[]))
        ),
        'low'
    );
    
    RETURN result;
END;
$$;

-- Create secure invitation validation function
CREATE OR REPLACE FUNCTION public.validate_invitation_data(
    p_email text,
    p_team_name text,
    p_user_name text,
    p_role text DEFAULT 'player'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    errors text[] := ARRAY[]::text[];
    result jsonb;
BEGIN
    -- Email validation
    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        errors := array_append(errors, 'Email is required');
    ELSIF NOT (p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        errors := array_append(errors, 'Invalid email format');
    ELSIF length(p_email) > 254 THEN
        errors := array_append(errors, 'Email address is too long');
    END IF;
    
    -- Team name validation
    IF p_team_name IS NULL OR TRIM(p_team_name) = '' THEN
        errors := array_append(errors, 'Team name is required');
    ELSIF length(p_team_name) > 100 THEN
        errors := array_append(errors, 'Team name is too long');
    END IF;
    
    -- User name validation
    IF p_user_name IS NULL OR TRIM(p_user_name) = '' THEN
        errors := array_append(errors, 'User name is required');
    ELSIF length(p_user_name) > 100 THEN
        errors := array_append(errors, 'User name is too long');
    END IF;
    
    -- Role validation
    IF p_role NOT IN ('player', 'team_manager', 'team_assistant_manager', 'team_coach', 'parent') THEN
        errors := array_append(errors, 'Invalid role specified');
    END IF;
    
    -- Check for existing invitations
    IF EXISTS (
        SELECT 1 FROM user_invitations 
        WHERE email = p_email 
        AND status = 'pending'
        AND expires_at > now()
    ) THEN
        errors := array_append(errors, 'An active invitation already exists for this email');
    END IF;
    
    -- Log validation attempt
    PERFORM log_security_event_enhanced(
        'INVITATION_VALIDATION',
        jsonb_build_object(
            'email', p_email,
            'team_name', p_team_name,
            'role', p_role,
            'errors_count', array_length(errors, 1)
        ),
        CASE WHEN array_length(errors, 1) > 0 THEN 'medium' ELSE 'low' END
    );
    
    result := jsonb_build_object(
        'is_valid', array_length(errors, 1) IS NULL,
        'errors', errors
    );
    
    RETURN result;
END;
$$;