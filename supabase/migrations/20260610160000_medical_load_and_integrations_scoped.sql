-- Medical/load tables (from 20250504_medical_load.sql) and integrations
-- tables (from 20250507_integrations.sql), which were never applied to the
-- remote database. Table/column/index definitions are unchanged from the
-- original files; the permissive USING (true) policies they contained are
-- replaced with scoped policies:
--   * injury_record / training_load / maturation_record / fitness_test_result:
--     readable by the player's linked users (player/parent), the player's
--     team staff, and global admins; writable by team staff and global
--     admins. training_load additionally allows linked users to INSERT so
--     players can self-report RPE (LogRPE page). injury_record and
--     maturation_record are additionally readable (not writable) by the
--     player's club admins/chairs for welfare oversight.
--   * fitness_benchmark: reference norms — readable by any authenticated
--     user, writable by global admins only.
--   * video_clip: visible to the clip's creator, the academy's members, the
--     player's linked users and team staff; managed by creator, academy
--     members, player's team staff, and global admins.
--   * academy_settings: readable by academy members, writable by academy
--     admins and global admins.
--   * notification_preference: own-row policy, unchanged from the original.

-- ---------------------------------------------------------------------------
-- Shared helper: is the current user staff of the given player's team?
-- SECURITY DEFINER so it can traverse players/user_teams under RLS; not
-- executable by anon, matching the hardening applied to the other helpers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_player_team_staff(p_player_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = p_player_id
      AND ut.user_id = auth.uid()
      AND ut.role = ANY(ARRAY['admin','manager','staff','coach','team_manager','team_assistant_manager','team_coach','team_helper'])
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_player_team_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_player_team_staff(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_player_team_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_team_staff(uuid) TO service_role;

-- Is the current user a club admin/chair of the given player's club?
-- Same role set as is_user_club_admin_secure, resolved via the player's team.
-- Used for SELECT-only welfare oversight on injury and maturation records.
CREATE OR REPLACE FUNCTION public.is_player_club_admin(p_player_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    JOIN public.teams t ON t.id = p.team_id
    JOIN public.user_clubs uc ON uc.club_id = t.club_id
    WHERE p.id = p_player_id
      AND uc.user_id = auth.uid()
      AND uc.role = ANY(ARRAY['club_admin','club_chair'])
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_player_club_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_player_club_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_player_club_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_club_admin(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Part A: medical & load tracking (definitions from 20250504_medical_load.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS log_token uuid DEFAULT gen_random_uuid() UNIQUE;

CREATE TABLE IF NOT EXISTS public.injury_record (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  injury_date    date NOT NULL,
  body_part      text NOT NULL,
  injury_type    text NOT NULL,
  severity       text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('minor','moderate','severe')),
  notes          text,
  rtp_phase      integer NOT NULL DEFAULT 0 CHECK (rtp_phase BETWEEN 0 AND 5),
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_injury_record_player_id ON public.injury_record(player_id);
CREATE INDEX IF NOT EXISTS idx_injury_record_resolved  ON public.injury_record(resolved_at) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS public.training_load (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  session_date     date NOT NULL,
  rpe              integer NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  load_au          numeric(8,2) NOT NULL,
  acwr_at_time     numeric(5,2),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_load_player_date ON public.training_load(player_id, session_date);

CREATE TABLE IF NOT EXISTS public.maturation_record (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  recorded_date    date NOT NULL,
  bio_age_estimate numeric(4,1) NOT NULL,
  method           text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maturation_record_player ON public.maturation_record(player_id, recorded_date);

CREATE TABLE IF NOT EXISTS public.fitness_benchmark (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  bio_age   numeric(4,1) NOT NULL,
  p10       numeric(8,3) NOT NULL,
  p25       numeric(8,3) NOT NULL,
  p50       numeric(8,3) NOT NULL,
  p75       numeric(8,3) NOT NULL,
  p90       numeric(8,3) NOT NULL,
  UNIQUE (test_name, bio_age)
);

CREATE TABLE IF NOT EXISTS public.fitness_test_result (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  test_date   date NOT NULL,
  test_name   text NOT NULL,
  value       numeric(10,3) NOT NULL,
  unit        text,
  percentile  numeric(5,1),
  bio_age     numeric(4,1),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_test_result_player ON public.fitness_test_result(player_id, test_date);

ALTER TABLE public.injury_record       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_load       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maturation_record   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_benchmark   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_test_result ENABLE ROW LEVEL SECURITY;

-- Drop the permissive policies from the original files in case they exist.
DROP POLICY IF EXISTS "injury_record_all"       ON public.injury_record;
DROP POLICY IF EXISTS "training_load_all"       ON public.training_load;
DROP POLICY IF EXISTS "maturation_record_all"   ON public.maturation_record;
DROP POLICY IF EXISTS "fitness_benchmark_select" ON public.fitness_benchmark;
DROP POLICY IF EXISTS "fitness_test_result_all" ON public.fitness_test_result;

-- injury_record
CREATE POLICY "injury_record_select" ON public.injury_record
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_linked_to_player((SELECT auth.uid()), player_id)
    OR public.is_player_team_staff(player_id)
    OR public.is_player_club_admin(player_id)
  );
CREATE POLICY "injury_record_insert" ON public.injury_record
  FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "injury_record_update" ON public.injury_record
  FOR UPDATE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id))
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "injury_record_delete" ON public.injury_record
  FOR DELETE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));

-- training_load (linked users may also INSERT: player RPE self-reporting)
CREATE POLICY "training_load_select" ON public.training_load
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_linked_to_player((SELECT auth.uid()), player_id)
    OR public.is_player_team_staff(player_id)
  );
CREATE POLICY "training_load_insert" ON public.training_load
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_linked_to_player((SELECT auth.uid()), player_id)
    OR public.is_player_team_staff(player_id)
  );
CREATE POLICY "training_load_update" ON public.training_load
  FOR UPDATE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id))
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "training_load_delete" ON public.training_load
  FOR DELETE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));

-- maturation_record
CREATE POLICY "maturation_record_select" ON public.maturation_record
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_linked_to_player((SELECT auth.uid()), player_id)
    OR public.is_player_team_staff(player_id)
    OR public.is_player_club_admin(player_id)
  );
CREATE POLICY "maturation_record_insert" ON public.maturation_record
  FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "maturation_record_update" ON public.maturation_record
  FOR UPDATE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id))
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "maturation_record_delete" ON public.maturation_record
  FOR DELETE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));

-- fitness_benchmark: shared reference norms
CREATE POLICY "fitness_benchmark_select" ON public.fitness_benchmark
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "fitness_benchmark_admin_write" ON public.fitness_benchmark
  FOR ALL TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())))
  WITH CHECK (public.is_global_admin((SELECT auth.uid())));

-- fitness_test_result
CREATE POLICY "fitness_test_result_select" ON public.fitness_test_result
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_linked_to_player((SELECT auth.uid()), player_id)
    OR public.is_player_team_staff(player_id)
  );
CREATE POLICY "fitness_test_result_insert" ON public.fitness_test_result
  FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "fitness_test_result_update" ON public.fitness_test_result
  FOR UPDATE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id))
  WITH CHECK (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));
CREATE POLICY "fitness_test_result_delete" ON public.fitness_test_result
  FOR DELETE TO authenticated
  USING (public.is_global_admin((SELECT auth.uid())) OR public.is_player_team_staff(player_id));

-- ---------------------------------------------------------------------------
-- Part B: integrations (definitions from 20250507_integrations.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE public.training_load
  ADD COLUMN IF NOT EXISTS distance_m numeric(8,1),
  ADD COLUMN IF NOT EXISTS hsr_distance_m numeric(8,1),
  ADD COLUMN IF NOT EXISTS sprint_distance_m numeric(8,1),
  ADD COLUMN IF NOT EXISTS max_speed_kmh numeric(5,2),
  ADD COLUMN IF NOT EXISTS player_load numeric(8,2),
  ADD COLUMN IF NOT EXISTS accel_count integer,
  ADD COLUMN IF NOT EXISTS gps_source text,
  ADD COLUMN IF NOT EXISTS gps_imported_at timestamptz;

CREATE TABLE IF NOT EXISTS public.video_clip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
  title text NOT NULL,
  source text NOT NULL DEFAULT 'internal' CHECK (source IN ('internal','hudl','other')),
  clip_url text,
  hudl_clip_id text,
  thumbnail_url text,
  duration_seconds integer,
  tags text[],
  metadata jsonb,
  session_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS performance_summary jsonb;

CREATE TABLE IF NOT EXISTS public.academy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid UNIQUE REFERENCES public.academies(id) ON DELETE CASCADE,
  academy_name text,
  contact_email text,
  contact_phone text,
  address text,
  logo_url text,
  min_reports_for_trial integer NOT NULL DEFAULT 3,
  gps_provider text CHECK (gps_provider IN ('catapult','statsports','other')),
  hudl_enabled boolean NOT NULL DEFAULT false,
  sync_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preference (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  injury_alerts boolean NOT NULL DEFAULT true,
  deadline_alerts boolean NOT NULL DEFAULT true,
  eppp_alerts boolean NOT NULL DEFAULT true,
  weekly_summary boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_clip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_clip_all" ON public.video_clip;
DROP POLICY IF EXISTS "academy_settings_all" ON public.academy_settings;
DROP POLICY IF EXISTS "notif_pref_own" ON public.notification_preference;

-- video_clip
CREATE POLICY "video_clip_select" ON public.video_clip
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR created_by = (SELECT auth.uid())
    OR (academy_id IS NOT NULL AND public.is_academy_member(academy_id))
    OR (player_id IS NOT NULL AND (
          public.is_linked_to_player((SELECT auth.uid()), player_id)
          OR public.is_player_team_staff(player_id)
       ))
  );
CREATE POLICY "video_clip_insert" ON public.video_clip
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin((SELECT auth.uid()))
    OR (academy_id IS NOT NULL AND public.is_academy_member(academy_id))
    OR (player_id IS NOT NULL AND public.is_player_team_staff(player_id))
  );
CREATE POLICY "video_clip_update" ON public.video_clip
  FOR UPDATE TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR created_by = (SELECT auth.uid())
    OR (academy_id IS NOT NULL AND public.is_academy_member(academy_id))
    OR (player_id IS NOT NULL AND public.is_player_team_staff(player_id))
  )
  WITH CHECK (
    public.is_global_admin((SELECT auth.uid()))
    OR created_by = (SELECT auth.uid())
    OR (academy_id IS NOT NULL AND public.is_academy_member(academy_id))
    OR (player_id IS NOT NULL AND public.is_player_team_staff(player_id))
  );
CREATE POLICY "video_clip_delete" ON public.video_clip
  FOR DELETE TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR created_by = (SELECT auth.uid())
    OR (academy_id IS NOT NULL AND public.is_academy_member(academy_id))
    OR (player_id IS NOT NULL AND public.is_player_team_staff(player_id))
  );

-- academy_settings
CREATE POLICY "academy_settings_select" ON public.academy_settings
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_academy_member(academy_id)
  );
CREATE POLICY "academy_settings_admin_write" ON public.academy_settings
  FOR ALL TO authenticated
  USING (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy'])
  )
  WITH CHECK (
    public.is_global_admin((SELECT auth.uid()))
    OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy'])
  );

-- notification_preference: own-row policy, unchanged from the original file
CREATE POLICY "notif_pref_own" ON public.notification_preference
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
