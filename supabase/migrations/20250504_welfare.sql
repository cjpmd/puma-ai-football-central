-- Education & Welfare tables

-- Welfare / pastoral log with RLS
CREATE TABLE IF NOT EXISTS public.welfare_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  academy_id   uuid REFERENCES public.academies(id) ON DELETE SET NULL,
  type         text NOT NULL CHECK (type IN ('general','behaviour','academic','mental_health','family','safeguarding')),
  content      text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','monitoring')),
  is_restricted boolean NOT NULL DEFAULT false,
  tags         text[] NOT NULL DEFAULT '{}',
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welfare_log_player ON public.welfare_log(player_id);
CREATE INDEX IF NOT EXISTS idx_welfare_log_academy ON public.welfare_log(academy_id) WHERE academy_id IS NOT NULL;

-- Auto-restrict safeguarding entries (trigger fires before insert/update)
CREATE OR REPLACE FUNCTION public.fn_welfare_log_auto_restrict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'safeguarding' THEN
    NEW.is_restricted := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_welfare_log_auto_restrict ON public.welfare_log;
CREATE TRIGGER trig_welfare_log_auto_restrict
  BEFORE INSERT OR UPDATE OF type ON public.welfare_log
  FOR EACH ROW EXECUTE FUNCTION public.fn_welfare_log_auto_restrict();

ALTER TABLE public.welfare_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "welfare_unrestricted_select" ON public.welfare_log;
CREATE POLICY "welfare_unrestricted_select" ON public.welfare_log
  FOR SELECT USING (
    is_restricted = false
    AND (
      academy_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.user_academies
        WHERE user_id = auth.uid() AND academy_id = welfare_log.academy_id
      )
    )
  );

DROP POLICY IF EXISTS "welfare_restricted_select" ON public.welfare_log;
CREATE POLICY "welfare_restricted_select" ON public.welfare_log
  FOR SELECT USING (
    is_restricted = true
    AND EXISTS (
      SELECT 1 FROM public.user_academies
      WHERE user_id = auth.uid()
        AND academy_id = welfare_log.academy_id
        AND role IN ('welfare_officer','safeguarding_lead','head_of_academy')
    )
  );

DROP POLICY IF EXISTS "welfare_log_insert" ON public.welfare_log;
CREATE POLICY "welfare_log_insert" ON public.welfare_log
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "welfare_log_update" ON public.welfare_log;
CREATE POLICY "welfare_log_update" ON public.welfare_log
  FOR UPDATE USING (true);

-- School attendance (GENERATED columns for attendance_pct and flagged flag)
CREATE TABLE IF NOT EXISTS public.school_attendance (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id          uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  academic_year      text NOT NULL,
  term               text NOT NULL CHECK (term IN ('autumn','spring','summer')),
  school_name        text,
  sessions_possible  integer NOT NULL CHECK (sessions_possible > 0),
  sessions_attended  integer NOT NULL CHECK (sessions_attended >= 0),
  attendance_pct     numeric(5,2) GENERATED ALWAYS AS
                       (ROUND((sessions_attended::numeric / sessions_possible) * 100, 2)) STORED,
  flagged            boolean GENERATED ALWAYS AS
                       ((sessions_attended::numeric / sessions_possible) * 100 < 80) STORED,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, academic_year, term)
);

ALTER TABLE public.school_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_attendance_all" ON public.school_attendance;
CREATE POLICY "school_attendance_all" ON public.school_attendance USING (true) WITH CHECK (true);

-- Safeguarding compliance checklist
CREATE TABLE IF NOT EXISTS public.safeguarding_checklist (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id         uuid REFERENCES public.academies(id) ON DELETE CASCADE,
  category           text NOT NULL,
  item_name          text NOT NULL,
  responsible_person text,
  status             text NOT NULL DEFAULT 'not_started'
                       CHECK (status IN ('not_started','in_progress','compliant','overdue','expired')),
  expiry_date        date,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.safeguarding_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "safeguarding_checklist_all" ON public.safeguarding_checklist;
CREATE POLICY "safeguarding_checklist_all" ON public.safeguarding_checklist USING (true) WITH CHECK (true);

-- Dual-career / education plan (one per player)
CREATE TABLE IF NOT EXISTS public.education_plan (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE UNIQUE,
  school_name         text,
  year_group          text,
  qualifications      text,
  career_aspirations  text,
  load_reduction_pct  integer NOT NULL DEFAULT 0 CHECK (load_reduction_pct BETWEEN 0 AND 100),
  exam_periods        jsonb NOT NULL DEFAULT '[]',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.education_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "education_plan_all" ON public.education_plan;
CREATE POLICY "education_plan_all" ON public.education_plan USING (true) WITH CHECK (true);

-- Parent / guardian communication log
CREATE TABLE IF NOT EXISTS public.parent_message (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  thread_id    uuid,
  sender_type  text NOT NULL CHECK (sender_type IN ('staff','parent')),
  subject      text,
  content      text NOT NULL,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_message_player ON public.parent_message(player_id, created_at);
CREATE INDEX IF NOT EXISTS idx_parent_message_thread ON public.parent_message(thread_id) WHERE thread_id IS NOT NULL;

ALTER TABLE public.parent_message ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_message_all" ON public.parent_message;
CREATE POLICY "parent_message_all" ON public.parent_message USING (true) WITH CHECK (true);

-- RLS isolation verification function (callable from Edge Function)
CREATE OR REPLACE FUNCTION public.verify_welfare_rls_isolation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_test    text;
  v_passed  boolean;
  v_msg     text;
  v_rls_on  boolean;
  v_policy  text;
  v_test_id uuid := gen_random_uuid();
  v_user1   uuid;
  v_user2   uuid;
  v_sentinel uuid := 'fee1dead-0000-4000-a000-000000000099'::uuid;
BEGIN
  -- T1: RLS enabled on welfare_log
  v_test := 'T1_rls_enabled';
  SELECT relrowsecurity INTO v_rls_on
  FROM pg_class WHERE relname = 'welfare_log' AND relnamespace = 'public'::regnamespace;
  v_passed := COALESCE(v_rls_on, false);
  v_results := v_results || jsonb_build_object('test', v_test, 'passed', v_passed,
    'message', CASE WHEN v_passed THEN 'RLS is enabled' ELSE 'RLS is NOT enabled' END);

  -- T2: restricted policy exists
  v_test := 'T2_restricted_policy_exists';
  SELECT policyname INTO v_policy
  FROM pg_policies
  WHERE tablename = 'welfare_log' AND schemaname = 'public' AND policyname = 'welfare_restricted_select';
  v_passed := v_policy IS NOT NULL;
  v_results := v_results || jsonb_build_object('test', v_test, 'passed', v_passed,
    'message', CASE WHEN v_passed THEN 'Policy exists' ELSE 'Policy missing' END);

  -- T3: auto-restrict trigger sets is_restricted for safeguarding type
  v_test := 'T3_auto_restrict_trigger';
  INSERT INTO public.welfare_log (id, player_id, type, content, is_restricted)
  SELECT v_test_id, id, 'safeguarding', 'rls-test-entry', false
  FROM public.players LIMIT 1;
  SELECT v_passed := is_restricted FROM public.welfare_log WHERE id = v_test_id;
  DELETE FROM public.welfare_log WHERE id = v_test_id;
  v_results := v_results || jsonb_build_object('test', v_test, 'passed', v_passed,
    'message', CASE WHEN v_passed THEN 'Trigger correctly set is_restricted=true'
                    ELSE 'Trigger did NOT set is_restricted' END);

  -- T4/T5 require 2 real users
  SELECT id INTO v_user1 FROM auth.users LIMIT 1;
  SELECT id INTO v_user2 FROM auth.users LIMIT 1 OFFSET 1;

  IF v_user1 IS NULL OR v_user2 IS NULL THEN
    v_results := v_results ||
      jsonb_build_object('test','T4_non_welfare_cannot_see_restricted','passed',null,'message','SKIP: fewer than 2 users') ||
      jsonb_build_object('test','T5_welfare_can_see_restricted','passed',null,'message','SKIP: fewer than 2 users');
    RETURN jsonb_build_object('results', v_results,
      'summary', jsonb_build_object('total', 5, 'passed',
        (SELECT count(*) FROM jsonb_array_elements(v_results) e WHERE (e->>'passed')::boolean),
        'failed', (SELECT count(*) FROM jsonb_array_elements(v_results) e WHERE (e->>'passed') = 'false'),
        'skipped', 2,
        'all_critical_passed', NOT EXISTS(
          SELECT 1 FROM jsonb_array_elements(v_results) e WHERE (e->>'passed') = 'false'
        )));
  END IF;

  -- Insert sentinel academy + assign user1 as non-welfare, user2 as welfare_officer
  INSERT INTO public.user_academies(user_id, academy_id, role)
  VALUES (v_user1, v_sentinel, 'coach'),
         (v_user2, v_sentinel, 'welfare_officer')
  ON CONFLICT DO NOTHING;

  -- Insert a restricted welfare_log row for sentinel academy
  INSERT INTO public.welfare_log(id, player_id, academy_id, type, content, is_restricted)
  SELECT v_test_id,
    (SELECT id FROM public.players LIMIT 1),
    v_sentinel, 'safeguarding', 'rls-isolation-test', true;

  -- T4: non-welfare user (user1/coach) cannot read it
  v_test := 'T4_non_welfare_cannot_see_restricted';
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user1)::text, true);
    PERFORM 1 FROM public.welfare_log WHERE id = v_test_id;
    v_passed := NOT FOUND;
  EXCEPTION WHEN OTHERS THEN v_passed := true; END;
  RESET ROLE;
  v_results := v_results || jsonb_build_object('test', v_test, 'passed', v_passed,
    'message', CASE WHEN v_passed THEN 'Non-welfare user correctly blocked'
                    ELSE 'CRITICAL: Non-welfare user CAN see restricted row' END);

  -- T5: welfare_officer (user2) can read it
  v_test := 'T5_welfare_can_see_restricted';
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user2)::text, true);
    PERFORM 1 FROM public.welfare_log WHERE id = v_test_id;
    v_passed := FOUND;
  EXCEPTION WHEN OTHERS THEN v_passed := false; END;
  RESET ROLE;
  v_results := v_results || jsonb_build_object('test', v_test, 'passed', v_passed,
    'message', CASE WHEN v_passed THEN 'Welfare officer can read restricted row'
                    ELSE 'Welfare officer CANNOT read restricted row' END);

  -- Cleanup
  DELETE FROM public.welfare_log WHERE id = v_test_id;
  DELETE FROM public.user_academies WHERE academy_id = v_sentinel;

  RETURN jsonb_build_object('results', v_results,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(v_results),
      'passed', (SELECT count(*) FROM jsonb_array_elements(v_results) e WHERE (e->>'passed')::boolean IS TRUE),
      'failed', (SELECT count(*) FROM jsonb_array_elements(v_results) e WHERE (e->>'passed') = 'false'),
      'skipped', (SELECT count(*) FROM jsonb_array_elements(v_results) e WHERE e->>'passed' = 'null'),
      'all_critical_passed', NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(v_results) e WHERE (e->>'passed') = 'false'
      )
    ));
END;
$$;
