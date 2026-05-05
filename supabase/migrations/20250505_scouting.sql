-- Scouting & Recruitment module

CREATE TABLE IF NOT EXISTS public.prospect (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
  name text NOT NULL,
  date_of_birth date,
  nationality text,
  position text,
  current_club text,
  current_team text,
  status text NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified','watching','on_trial','offer','signed')),
  rating numeric(3,1) CHECK (rating BETWEEN 0 AND 10),
  maturation_badge text CHECK (maturation_badge IN ('early','average','late')),
  competing_interest text,
  international_eligible boolean NOT NULL DEFAULT false,
  on_watchlist boolean NOT NULL DEFAULT false,
  eppp_approach_date date,
  trial_decision_deadline date,
  photo_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scout_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospect(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attributes jsonb NOT NULL DEFAULT '{}',
  narrative text,
  recommendation text NOT NULL CHECK (recommendation IN ('sign','continue_watching','reject')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trial_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospect(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  session_type text NOT NULL DEFAULT 'training'
    CHECK (session_type IN ('training','match','evaluation','friendly')),
  coach_notes text,
  rating integer CHECK (rating BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scouting_settings (
  academy_id uuid PRIMARY KEY REFERENCES public.academies(id) ON DELETE CASCADE,
  min_reports_for_trial integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_select" ON public.prospect FOR SELECT USING (true);
CREATE POLICY "prospect_insert" ON public.prospect FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "prospect_update" ON public.prospect FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "prospect_delete" ON public.prospect FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "scout_report_select" ON public.scout_report FOR SELECT USING (true);
CREATE POLICY "scout_report_insert" ON public.scout_report FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "trial_session_select" ON public.trial_session FOR SELECT USING (true);
CREATE POLICY "trial_session_insert" ON public.trial_session FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "scouting_settings_all" ON public.scouting_settings FOR ALL USING (true);
