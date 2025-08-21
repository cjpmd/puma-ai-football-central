-- Phase 1: Individual Training Plans (ITP) schema - retry without IF NOT EXISTS for policies
-- 1) Helper function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.individual_training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  objective_text text,
  plan_type text NOT NULL DEFAULT 'self' CHECK (plan_type IN ('self','coach','ai')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','coach','teamStaff')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  weekly_sessions integer DEFAULT 3 CHECK (weekly_sessions BETWEEN 0 AND 14),
  focus_areas text[] DEFAULT ARRAY[]::text[],
  accountability jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_itp_date_range CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.individual_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.individual_training_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6),
  planned_date date,
  target_duration_minutes integer DEFAULT 45 CHECK (target_duration_minutes BETWEEN 0 AND 300),
  intensity integer NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  location text NOT NULL DEFAULT 'home' CHECK (location IN ('home','pitch','gym')),
  warmup_drill_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  cooldown_drill_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  session_order integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.individual_session_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.individual_training_sessions(id) ON DELETE CASCADE,
  drill_id uuid REFERENCES public.drills(id) ON DELETE SET NULL,
  custom_drill_name text,
  custom_drill_description text,
  target_repetitions integer,
  target_duration_minutes integer,
  target_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  progression_level integer NOT NULL DEFAULT 1 CHECK (progression_level BETWEEN 1 AND 3),
  sequence_order integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.individual_session_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.individual_training_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  actual_duration_minutes integer,
  rpe integer CHECK (rpe BETWEEN 1 AND 10),
  notes text,
  drill_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_evidence_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_itp_player_id ON public.individual_training_plans(player_id);
CREATE INDEX IF NOT EXISTS idx_itp_coach_id ON public.individual_training_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_its_plan_id ON public.individual_training_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_isd_session_id ON public.individual_session_drills(session_id);
CREATE INDEX IF NOT EXISTS idx_isc_session_id ON public.individual_session_completions(session_id);
CREATE INDEX IF NOT EXISTS idx_isc_player_id ON public.individual_session_completions(player_id);

-- 4) RLS
ALTER TABLE public.individual_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_session_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_session_completions ENABLE ROW LEVEL SECURITY;

-- Policies: individual_training_plans
CREATE POLICY "ITP: view plans" ON public.individual_training_plans
FOR SELECT USING (
  public.is_global_admin_secure()
  OR coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_training_plans.player_id AND up.user_id = auth.uid()
  )
  OR (
    visibility IN ('coach','teamStaff') AND EXISTS (
      SELECT 1
      FROM public.players p
      JOIN public.user_teams ut ON ut.team_id = p.team_id
      WHERE p.id = individual_training_plans.player_id
        AND ut.user_id = auth.uid()
        AND ut.role = ANY(ARRAY['team_manager','team_assistant_manager','team_coach'])
    )
  )
);

CREATE POLICY "ITP: player create" ON public.individual_training_plans
FOR INSERT WITH CHECK (
  public.is_global_admin_secure()
  OR EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_training_plans.player_id AND up.user_id = auth.uid()
  )
);

CREATE POLICY "ITP: coach create" ON public.individual_training_plans
FOR INSERT WITH CHECK (
  public.is_global_admin_secure()
  OR (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.players p
      JOIN public.user_teams ut ON ut.team_id = p.team_id
      WHERE p.id = individual_training_plans.player_id
        AND ut.user_id = auth.uid()
        AND ut.role = ANY(ARRAY['team_manager','team_assistant_manager','team_coach'])
    )
  )
);

CREATE POLICY "ITP: manage plans" ON public.individual_training_plans
FOR UPDATE USING (
  public.is_global_admin_secure()
  OR coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_training_plans.player_id AND up.user_id = auth.uid()
  )
) WITH CHECK (
  public.is_global_admin_secure()
  OR coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_training_plans.player_id AND up.user_id = auth.uid()
  )
);

CREATE POLICY "ITP: delete plans" ON public.individual_training_plans
FOR DELETE USING (
  public.is_global_admin_secure()
  OR coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_training_plans.player_id AND up.user_id = auth.uid()
  )
);

-- Policies: individual_training_sessions
CREATE POLICY "ITS: view" ON public.individual_training_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_training_sessions.plan_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
      OR (
        p.visibility IN ('coach','teamStaff') AND EXISTS (
          SELECT 1 FROM public.players pl
          JOIN public.user_teams ut ON ut.team_id = pl.team_id
          WHERE pl.id = p.player_id AND ut.user_id = auth.uid()
            AND ut.role = ANY(ARRAY['team_manager','team_assistant_manager','team_coach'])
        )
      )
    )
  )
);

CREATE POLICY "ITS: manage" ON public.individual_training_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_training_sessions.plan_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_training_sessions.plan_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
    )
  )
);

-- Policies: individual_session_drills
CREATE POLICY "ISD: view" ON public.individual_session_drills
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_sessions s
    JOIN public.individual_training_plans p ON p.id = s.plan_id
    WHERE s.id = individual_session_drills.session_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
      OR (
        p.visibility IN ('coach','teamStaff') AND EXISTS (
          SELECT 1 FROM public.players pl
          JOIN public.user_teams ut ON ut.team_id = pl.team_id
          WHERE pl.id = p.player_id AND ut.user_id = auth.uid()
            AND ut.role = ANY(ARRAY['team_manager','team_assistant_manager','team_coach'])
        )
      )
    )
  )
);

CREATE POLICY "ISD: manage" ON public.individual_session_drills
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_sessions s
    JOIN public.individual_training_plans p ON p.id = s.plan_id
    WHERE s.id = individual_session_drills.session_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.individual_training_sessions s
    JOIN public.individual_training_plans p ON p.id = s.plan_id
    WHERE s.id = individual_session_drills.session_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
    )
  )
);

-- Policies: individual_session_completions
CREATE POLICY "ISC: view" ON public.individual_session_completions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_sessions s
    JOIN public.individual_training_plans p ON p.id = s.plan_id
    WHERE s.id = individual_session_completions.session_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
      OR (
        p.visibility IN ('coach','teamStaff') AND EXISTS (
          SELECT 1 FROM public.players pl
          JOIN public.user_teams ut ON ut.team_id = pl.team_id
          WHERE pl.id = p.player_id AND ut.user_id = auth.uid()
            AND ut.role = ANY(ARRAY['team_manager','team_assistant_manager','team_coach'])
        )
      )
    )
  )
);

CREATE POLICY "ISC: manage" ON public.individual_session_completions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_sessions s
    JOIN public.individual_training_plans p ON p.id = s.plan_id
    WHERE s.id = individual_session_completions.session_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.individual_training_sessions s
    JOIN public.individual_training_plans p ON p.id = s.plan_id
    WHERE s.id = individual_session_completions.session_id AND (
      public.is_global_admin_secure()
      OR p.coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_players up WHERE up.player_id = p.player_id AND up.user_id = auth.uid())
    )
  )
);

-- 5) Triggers to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_itp_updated_at'
  ) THEN
    CREATE TRIGGER trg_itp_updated_at
    BEFORE UPDATE ON public.individual_training_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_its_updated_at'
  ) THEN
    CREATE TRIGGER trg_its_updated_at
    BEFORE UPDATE ON public.individual_training_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_isd_updated_at'
  ) THEN
    CREATE TRIGGER trg_isd_updated_at
    BEFORE UPDATE ON public.individual_session_drills
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_isc_updated_at'
  ) THEN
    CREATE TRIGGER trg_isc_updated_at
    BEFORE UPDATE ON public.individual_session_completions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
