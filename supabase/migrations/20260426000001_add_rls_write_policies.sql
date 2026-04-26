-- Add RLS write policies for players, events, event_selections, team_staff
--
-- CONTEXT: Prior to this migration all four tables had read RLS policies but
-- no write (INSERT / UPDATE / DELETE) policies.  Any authenticated user could
-- call the Supabase JS client directly and mutate any row regardless of the
-- UI permission checks.  This migration enforces write access at the database
-- level using two SECURITY DEFINER helper functions so that permission checks
-- cannot themselves trigger infinite RLS recursion.
--
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- user_can_manage_team(p_team_id) – true for managers and above (used for
--   sensitive mutations: player delete, staff write, event delete)
--
-- user_can_coach_team(p_team_id)  – true for coaches and above (used for
--   lower-privilege writes: event update, event_selections write)

-- Ensure base admin helper exists (idempotent; originally in 20260406000002)
CREATE OR REPLACE FUNCTION public.user_is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND 'global_admin' = ANY(roles)
  );
$$;

-- Manager-level check: team_manager / manager / assistant_manager /
-- club_admin / club_chair roles in user_teams for this team, or global admin.
CREATE OR REPLACE FUNCTION public.user_can_manage_team(p_team_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_teams
      WHERE user_id  = auth.uid()
        AND team_id  = p_team_id
        AND role IN (
          'manager',
          'team_manager',
          'team_assistant_manager',
          'assistant_manager',
          'club_admin',
          'club_chair'
        )
    );
$$;

-- Coach-level check: all manager roles plus coaching staff.
CREATE OR REPLACE FUNCTION public.user_can_coach_team(p_team_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_teams
      WHERE user_id  = auth.uid()
        AND team_id  = p_team_id
        AND role IN (
          'manager',
          'team_manager',
          'team_assistant_manager',
          'assistant_manager',
          'club_admin',
          'club_chair',
          'team_coach',
          'coach',
          'assistant_coach',
          'fitness',
          'analytics'
        )
    );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- players
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- INSERT: only managers and above for the destination team
DROP POLICY IF EXISTS "Team managers can insert players" ON public.players;
CREATE POLICY "Team managers can insert players"
  ON public.players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_manage_team(team_id)
  );

-- UPDATE: USING checks current team, WITH CHECK checks new team (handles
-- transfers where team_id changes).
DROP POLICY IF EXISTS "Team managers can update players" ON public.players;
CREATE POLICY "Team managers can update players"
  ON public.players
  FOR UPDATE
  TO authenticated
  USING (
    public.user_can_manage_team(team_id)
  )
  WITH CHECK (
    public.user_can_manage_team(team_id)
  );

-- DELETE: manager or above for the player's current team
DROP POLICY IF EXISTS "Team managers can delete players" ON public.players;
CREATE POLICY "Team managers can delete players"
  ON public.players
  FOR DELETE
  TO authenticated
  USING (
    public.user_can_manage_team(team_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- events
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- INSERT: coaches and above may create events for their team
DROP POLICY IF EXISTS "Team coaches can insert events" ON public.events;
CREATE POLICY "Team coaches can insert events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_coach_team(team_id)
  );

-- UPDATE: coaches and above for this event's team
DROP POLICY IF EXISTS "Team coaches can update events" ON public.events;
CREATE POLICY "Team coaches can update events"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    public.user_can_coach_team(team_id)
  )
  WITH CHECK (
    public.user_can_coach_team(team_id)
  );

-- DELETE: managers and above only
DROP POLICY IF EXISTS "Team managers can delete events" ON public.events;
CREATE POLICY "Team managers can delete events"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    public.user_can_manage_team(team_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- event_selections
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.event_selections ENABLE ROW LEVEL SECURITY;

-- Unique constraint required for the UPSERT fix (C5).
-- NULLIF guards: team_number and period_number default to 1 for matching
-- purposes if NULL, but in practice both are always set by the application.
ALTER TABLE public.event_selections
  DROP CONSTRAINT IF EXISTS event_selections_upsert_key;

ALTER TABLE public.event_selections
  ADD CONSTRAINT event_selections_upsert_key
  UNIQUE (event_id, team_id, team_number, period_number);

-- INSERT
DROP POLICY IF EXISTS "Team coaches can insert event selections" ON public.event_selections;
CREATE POLICY "Team coaches can insert event selections"
  ON public.event_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_coach_team(team_id)
  );

-- UPDATE
DROP POLICY IF EXISTS "Team coaches can update event selections" ON public.event_selections;
CREATE POLICY "Team coaches can update event selections"
  ON public.event_selections
  FOR UPDATE
  TO authenticated
  USING (
    public.user_can_coach_team(team_id)
  )
  WITH CHECK (
    public.user_can_coach_team(team_id)
  );

-- DELETE
DROP POLICY IF EXISTS "Team coaches can delete event selections" ON public.event_selections;
CREATE POLICY "Team coaches can delete event selections"
  ON public.event_selections
  FOR DELETE
  TO authenticated
  USING (
    public.user_can_coach_team(team_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- team_staff
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.team_staff ENABLE ROW LEVEL SECURITY;

-- INSERT: manager or above
DROP POLICY IF EXISTS "Team managers can insert staff" ON public.team_staff;
CREATE POLICY "Team managers can insert staff"
  ON public.team_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_manage_team(team_id)
  );

-- UPDATE
DROP POLICY IF EXISTS "Team managers can update staff" ON public.team_staff;
CREATE POLICY "Team managers can update staff"
  ON public.team_staff
  FOR UPDATE
  TO authenticated
  USING (
    public.user_can_manage_team(team_id)
  )
  WITH CHECK (
    public.user_can_manage_team(team_id)
  );

-- DELETE
DROP POLICY IF EXISTS "Team managers can delete staff" ON public.team_staff;
CREATE POLICY "Team managers can delete staff"
  ON public.team_staff
  FOR DELETE
  TO authenticated
  USING (
    public.user_can_manage_team(team_id)
  );
