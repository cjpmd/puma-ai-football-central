-- Security hardening: SECURITY DEFINER views + anon RPC surface
--
-- 1) Recreate all_user_roles without selecting from auth.users
--    (rebuilt on public.profiles, which mirrors auth.users ids/emails).
-- 2) Set security_invoker = true on the four SECURITY DEFINER views so the
--    querying user's RLS applies: team_staff_roles, all_user_roles,
--    player_profiles, profile_player_team.
-- 3) Revoke EXECUTE from PUBLIC and anon on 43 SECURITY DEFINER functions
--    exposed via /rest/v1/rpc, re-granting authenticated + service_role.
--    Five functions intentionally keep anon EXECUTE because they are called
--    before login (signup/login validation, join/linking codes):
--      validate_authentication_input(text,text,text)
--      log_security_event_enhanced(text,jsonb,text,inet,text)
--      get_team_by_join_code(text)
--      verify_player_linking_code(text)
--      verify_parent_linking_code(text)
--
-- Behaviour note: helper functions referenced by RLS policies declared
-- TO public (is_team_member, is_global_admin, ...) will now raise
-- "permission denied for function" for unauthenticated REST queries against
-- those tables instead of returning an empty result set. Authenticated
-- behaviour is unchanged.

-- ---------------------------------------------------------------------------
-- 1 + 2a. all_user_roles: drop (email column type changes from varchar to
-- text) and recreate from profiles with security_invoker.
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.all_user_roles;

CREATE VIEW public.all_user_roles
WITH (security_invoker = true) AS
SELECT p.id AS user_id,
       p.email,
       p.name AS profile_name,
       p.roles AS profile_roles,
       ts.role AS staff_role,
       ts.team_id AS staff_team_id,
       up.player_id AS linked_player_id,
       pp.name AS linked_player_name,
       ut.team_id AS linked_player_team_id
FROM public.profiles p
LEFT JOIN public.user_staff us ON p.id = us.user_id
LEFT JOIN public.team_staff ts ON ts.id = us.staff_id
LEFT JOIN public.user_players up ON p.id = up.user_id
LEFT JOIN public.profiles pp ON up.player_id = pp.id
LEFT JOIN public.user_teams ut ON up.player_id = ut.user_id;

REVOKE ALL ON public.all_user_roles FROM anon;

-- ---------------------------------------------------------------------------
-- 2b. Remaining SECURITY DEFINER views: switch to invoker rights in place.
-- ---------------------------------------------------------------------------

ALTER VIEW public.team_staff_roles    SET (security_invoker = true);
ALTER VIEW public.player_profiles     SET (security_invoker = true);
ALTER VIEW public.profile_player_team SET (security_invoker = true);

REVOKE ALL ON public.team_staff_roles    FROM anon;
REVOKE ALL ON public.player_profiles     FROM anon;
REVOKE ALL ON public.profile_player_team FROM anon;

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER functions: remove anon (and default PUBLIC) EXECUTE.
--    Each function's ACL currently includes both "=X" (PUBLIC) and "anon=X",
--    so both must be revoked; authenticated + service_role are re-granted
--    explicitly to preserve logged-in behaviour.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.audit_sensitive_changes()',
    'public.auto_send_availability_notifications()',
    'public.backup_event_selections()',
    'public.calculate_event_score(uuid)',
    'public.can_manage_team_settings(uuid)',
    'public.check_rate_limit_enhanced(text,uuid,inet)',
    'public.cleanup_expired_notification_tokens()',
    'public.fn_check_academy_club_tier()',
    'public.format_file_size(bigint)',
    'public.generate_secure_invitation_code()',
    'public.generate_secure_notification_token()',
    'public.get_consolidated_team_staff(uuid)',
    'public.get_current_user_id()',
    'public.get_user_event_roles(uuid,uuid)',
    'public.handle_club_creator_role()',
    'public.handle_new_user()',
    'public.is_academy_member(uuid,text[])',
    'public.is_club_member(uuid,text[])',
    'public.is_club_member_secure(uuid,text[])',
    'public.is_global_admin()',
    'public.is_global_admin(uuid)',
    'public.is_global_admin_secure()',
    'public.is_linked_to_player(uuid,uuid)',
    'public.is_team_member(uuid,text[])',
    'public.is_team_member_secure(uuid,text[])',
    'public.is_user_club_admin(uuid,uuid)',
    'public.is_user_club_admin_secure(uuid,uuid)',
    'public.log_admin_changes()',
    'public.log_security_event(text,jsonb,text)',
    'public.prevent_admin_self_assignment()',
    'public.prevent_role_escalation()',
    'public.remove_unavailable_player_from_event(uuid,uuid,uuid)',
    'public.schedule_event_reminders(uuid)',
    'public.send_availability_notifications(uuid)',
    'public.split_team(uuid,text,uuid[])',
    'public.update_availability_status(uuid,uuid,text,text)',
    'public.update_player_match_stats(uuid)',
    'public.user_is_global_admin()',
    'public.validate_invitation_data(text,text,text,text)',
    'public.validate_password_strength_enhanced(text,text)',
    'public.validate_session_security(uuid,inet,text)',
    'public.validate_user_permissions(uuid)',
    'public.validate_user_role_access(uuid,text,text,uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;

-- Pre-auth functions: keep anon, but drop the default PUBLIC grant so any
-- future roles do not inherit EXECUTE implicitly.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.validate_authentication_input(text,text,text)',
    'public.log_security_event_enhanced(text,jsonb,text,inet,text)',
    'public.get_team_by_join_code(text)',
    'public.verify_player_linking_code(text)',
    'public.verify_parent_linking_code(text)'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
