-- Performance: hot FK indexes + RLS optimization.
--
-- 1) B-tree indexes on frequently joined/filtered FK columns flagged by the
--    Supabase performance advisor.
-- 2) Rewrite RLS policies on club_teams, event_availability,
--    facility_availability, team_kit_issues to use (select auth.uid())
--    instead of auth.uid(), so Postgres evaluates it once per statement
--    (initplan) instead of once per row.
-- 3) Consolidate overlapping permissive policies:
--    club_teams (14 policies -> 4), event_availability (10 -> 4), and
--    team_kit_issues (8 -> 4). club_teams is the exact OR-union of the
--    policies it replaces. event_availability normalises the staff role
--    list to the role names actually present in user_teams
--    ('team_manager','team_assistant_manager','team_coach','coach') across
--    SELECT/INSERT/DELETE — previously SELECT/INSERT used 'manager','coach'
--    which matched almost nobody. team_kit_issues drops the dead
--    "managed teams" duplicates and tightens writes to manager/coach roles
--    instead of any team member. facility_availability keeps its existing
--    policy set (same names, same logic), only rewritten with the
--    initplan-friendly form.
--
-- All policies are declared TO authenticated: every replaced policy's
-- predicate depends on auth.uid(), so anon matched nothing before and
-- matches nothing now.

-- ===========================================================================
-- 1. Hot FK indexes
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_teams_club_id
  ON public.teams (club_id);
CREATE INDEX IF NOT EXISTS idx_players_parent_id
  ON public.players (parent_id);
CREATE INDEX IF NOT EXISTS idx_players_performance_category_id
  ON public.players (performance_category_id);
CREATE INDEX IF NOT EXISTS idx_events_facility_id
  ON public.events (facility_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id
  ON public.event_attendees (user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_player_id
  ON public.event_invitations (player_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_staff_id
  ON public.event_invitations (staff_id);

-- ===========================================================================
-- 2 + 3a. club_teams: 14 overlapping policies -> 4 consolidated
--
-- Union of replaced policies, per command:
--   SELECT: club member (user_clubs) OR club official (club_officials)
--           OR team member (user_teams)
--   INSERT: club admin/chair OR club official admin/manager
--           OR team admin/manager/coach
--   UPDATE: club admin/chair
--   DELETE: club admin/chair OR club official admin/manager
--           OR team admin/manager/coach
-- ===========================================================================

DROP POLICY IF EXISTS "Club admins can manage club teams"            ON public.club_teams;
DROP POLICY IF EXISTS "Club admins can manage club teams safely"     ON public.club_teams;
DROP POLICY IF EXISTS "Club admins can delete club team links"       ON public.club_teams;
DROP POLICY IF EXISTS "Club officials can unlink teams from their clubs" ON public.club_teams;
DROP POLICY IF EXISTS "Team owners can unlink their teams from clubs" ON public.club_teams;
DROP POLICY IF EXISTS "Club admins can create club team links"       ON public.club_teams;
DROP POLICY IF EXISTS "Club officials can link teams to their clubs" ON public.club_teams;
DROP POLICY IF EXISTS "Team owners can link their teams to clubs"    ON public.club_teams;
DROP POLICY IF EXISTS "Club members can view club teams"             ON public.club_teams;
DROP POLICY IF EXISTS "Club members can view club teams safely"      ON public.club_teams;
DROP POLICY IF EXISTS "Club officials can view their club teams"     ON public.club_teams;
DROP POLICY IF EXISTS "Team owners can view their team club links"   ON public.club_teams;
DROP POLICY IF EXISTS "Users can view club teams for their clubs"    ON public.club_teams;
DROP POLICY IF EXISTS "Club admins can update club team links"       ON public.club_teams;

CREATE POLICY "club_teams_select" ON public.club_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_clubs uc
      WHERE uc.club_id = club_teams.club_id
        AND uc.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.club_officials co
      WHERE co.club_id = club_teams.club_id
        AND co.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = club_teams.team_id
        AND ut.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "club_teams_insert" ON public.club_teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_clubs uc
      WHERE uc.club_id = club_teams.club_id
        AND uc.user_id = (SELECT auth.uid())
        AND uc.role = ANY (ARRAY['club_admin','club_chair'])
    )
    OR EXISTS (
      SELECT 1 FROM public.club_officials co
      WHERE co.club_id = club_teams.club_id
        AND co.user_id = (SELECT auth.uid())
        AND co.role = ANY (ARRAY['admin','manager'])
    )
    OR EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = club_teams.team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['admin','manager','coach'])
    )
  );

CREATE POLICY "club_teams_update" ON public.club_teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_clubs uc
      WHERE uc.club_id = club_teams.club_id
        AND uc.user_id = (SELECT auth.uid())
        AND uc.role = ANY (ARRAY['club_admin','club_chair'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_clubs uc
      WHERE uc.club_id = club_teams.club_id
        AND uc.user_id = (SELECT auth.uid())
        AND uc.role = ANY (ARRAY['club_admin','club_chair'])
    )
  );

CREATE POLICY "club_teams_delete" ON public.club_teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_clubs uc
      WHERE uc.club_id = club_teams.club_id
        AND uc.user_id = (SELECT auth.uid())
        AND uc.role = ANY (ARRAY['club_admin','club_chair'])
    )
    OR EXISTS (
      SELECT 1 FROM public.club_officials co
      WHERE co.club_id = club_teams.club_id
        AND co.user_id = (SELECT auth.uid())
        AND co.role = ANY (ARRAY['admin','manager'])
    )
    OR EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = club_teams.team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['admin','manager','coach'])
    )
  );

-- ===========================================================================
-- 2 + 3b. event_availability: 10 overlapping policies -> 4 consolidated
--
-- Union of replaced policies, per command, with the staff role list
-- normalised to the names actually present in user_teams:
--   SELECT: own row OR linked player OR team staff
--   INSERT: own row OR linked player OR team staff
--   UPDATE: own row OR linked player
--   DELETE: own row OR team staff
-- where team staff = role in ('team_manager','team_assistant_manager',
-- 'team_coach','coach')
-- ===========================================================================

DROP POLICY IF EXISTS "Team managers can delete event availability"    ON public.event_availability;
DROP POLICY IF EXISTS "Users can delete their own availability records" ON public.event_availability;
DROP POLICY IF EXISTS "Team managers can insert event availability"    ON public.event_availability;
DROP POLICY IF EXISTS "Users can create their own availability records" ON public.event_availability;
DROP POLICY IF EXISTS "Users can insert their own availability"        ON public.event_availability;
DROP POLICY IF EXISTS "Team managers can view event availability"      ON public.event_availability;
DROP POLICY IF EXISTS "Users can view their own availability"          ON public.event_availability;
DROP POLICY IF EXISTS "Users can view their own availability records"  ON public.event_availability;
DROP POLICY IF EXISTS "Users can update their own availability"        ON public.event_availability;
DROP POLICY IF EXISTS "Users can update their own availability records" ON public.event_availability;

CREATE POLICY "event_availability_select" ON public.event_availability
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (player_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_players up
      WHERE up.player_id = event_availability.player_id
        AND up.user_id = (SELECT auth.uid())
    ))
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.user_teams ut ON e.team_id = ut.team_id
      WHERE e.id = event_availability.event_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  );

CREATE POLICY "event_availability_insert" ON public.event_availability
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (player_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_players up
      WHERE up.player_id = event_availability.player_id
        AND up.user_id = (SELECT auth.uid())
    ))
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.user_teams ut ON e.team_id = ut.team_id
      WHERE e.id = event_availability.event_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  );

CREATE POLICY "event_availability_update" ON public.event_availability
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (player_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_players up
      WHERE up.player_id = event_availability.player_id
        AND up.user_id = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (player_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_players up
      WHERE up.player_id = event_availability.player_id
        AND up.user_id = (SELECT auth.uid())
    ))
  );

CREATE POLICY "event_availability_delete" ON public.event_availability
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.user_teams ut ON e.team_id = ut.team_id
      WHERE e.id = event_availability.event_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  );

-- ===========================================================================
-- 2c. facility_availability: same 8 policies, initplan-friendly auth.uid()
-- ===========================================================================

DROP POLICY IF EXISTS "Club and team members can manage facility availability" ON public.facility_availability;
DROP POLICY IF EXISTS "Team managers can manage facility availability"   ON public.facility_availability;
DROP POLICY IF EXISTS "Club officials can delete facility availability"  ON public.facility_availability;
DROP POLICY IF EXISTS "Team managers can delete their facility bookings" ON public.facility_availability;
DROP POLICY IF EXISTS "Team managers can book facilities"                ON public.facility_availability;
DROP POLICY IF EXISTS "Club and team members can view facility availability" ON public.facility_availability;
DROP POLICY IF EXISTS "Users can view facility availability"             ON public.facility_availability;
DROP POLICY IF EXISTS "Team managers can update their bookings"          ON public.facility_availability;

CREATE POLICY "Club and team members can manage facility availability" ON public.facility_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.user_clubs uc ON uc.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND uc.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.user_id = (SELECT auth.uid())
        AND ut.team_id = facility_availability.booked_by_team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.user_clubs uc ON uc.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND uc.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.user_id = (SELECT auth.uid())
        AND ut.team_id = facility_availability.booked_by_team_id
    )
  );

CREATE POLICY "Team managers can manage facility availability" ON public.facility_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.user_clubs uc ON uc.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND uc.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.user_clubs uc ON uc.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND uc.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Club officials can delete facility availability" ON public.facility_availability
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.club_officials co ON co.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND co.user_id = (SELECT auth.uid())
        AND co.role = ANY (ARRAY['admin','manager'])
    )
  );

CREATE POLICY "Team managers can delete their facility bookings" ON public.facility_availability
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = facility_availability.booked_by_team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager'])
    )
  );

CREATE POLICY "Team managers can book facilities" ON public.facility_availability
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.club_teams ct ON ct.club_id = f.club_id
      JOIN public.user_teams ut ON ut.team_id = ct.team_id
      WHERE f.id = facility_availability.facility_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager'])
    )
  );

CREATE POLICY "Club and team members can view facility availability" ON public.facility_availability
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.club_officials co ON co.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND co.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = facility_availability.booked_by_team_id
        AND ut.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can view facility availability" ON public.facility_availability
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      JOIN public.user_clubs uc ON uc.club_id = f.club_id
      WHERE f.id = facility_availability.facility_id
        AND uc.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Team managers can update their bookings" ON public.facility_availability
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = facility_availability.booked_by_team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager'])
    )
  );

-- ===========================================================================
-- 2d + 3c. team_kit_issues: 8 overlapping policies -> 4 consolidated.
-- Reads stay open to any team member; writes are tightened to manager/coach
-- roles only (previously the "their teams" policies let any team member
-- write, making the role-restricted "managed teams" duplicates dead weight).
-- ===========================================================================

DROP POLICY IF EXISTS "Users can delete kit issues for managed teams" ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can delete kit issues for their teams"   ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can create kit issues for managed teams" ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can create kit issues for their teams"   ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can view kit issues for accessible teams" ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can view kit issues for their teams"     ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can update kit issues for managed teams" ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can update kit issues for their teams"   ON public.team_kit_issues;

CREATE POLICY "team_kit_issues_select" ON public.team_kit_issues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = team_kit_issues.team_id
        AND ut.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "team_kit_issues_insert" ON public.team_kit_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = team_kit_issues.team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  );

CREATE POLICY "team_kit_issues_update" ON public.team_kit_issues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = team_kit_issues.team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = team_kit_issues.team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  );

CREATE POLICY "team_kit_issues_delete" ON public.team_kit_issues
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.team_id = team_kit_issues.team_id
        AND ut.user_id = (SELECT auth.uid())
        AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach','coach'])
    )
  );
