-- Compliance, Coaching Tools & Multi-Age-Group

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  is_safeguarding boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_academy_idx ON public.audit_log(academy_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS public.coaching_qualification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  licence_type text NOT NULL,
  issuing_body text,
  awarded_date date,
  expiry_date date,
  cpd_hours_required integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cpd_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  activity_type text NOT NULL,
  description text,
  hours numeric(4,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_outcome (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  age_group text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
  title text NOT NULL,
  age_group text,
  duration_minutes integer,
  objectives text,
  warm_up text,
  main_activity text,
  cool_down text,
  equipment text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_plan_outcome (
  session_plan_id uuid REFERENCES public.session_plan(id) ON DELETE CASCADE,
  outcome_id uuid REFERENCES public.curriculum_outcome(id) ON DELETE CASCADE,
  PRIMARY KEY (session_plan_id, outcome_id)
);

CREATE TABLE IF NOT EXISTS public.dual_registration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  home_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  guest_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.squad_promotion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  from_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  promotion_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_qualification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpd_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_outcome ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_plan_outcome ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dual_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_promotion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "coaching_qual_all" ON public.coaching_qualification FOR ALL USING (true);
CREATE POLICY "cpd_record_all" ON public.cpd_record FOR ALL USING (true);
CREATE POLICY "curriculum_outcome_all" ON public.curriculum_outcome FOR ALL USING (true);
CREATE POLICY "session_plan_all" ON public.session_plan FOR ALL USING (true);
CREATE POLICY "session_plan_outcome_all" ON public.session_plan_outcome FOR ALL USING (true);
CREATE POLICY "dual_registration_all" ON public.dual_registration FOR ALL USING (true);
CREATE POLICY "squad_promotion_all" ON public.squad_promotion FOR ALL USING (true);
