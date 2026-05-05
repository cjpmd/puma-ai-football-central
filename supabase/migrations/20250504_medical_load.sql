-- Medical & Load tracking tables

-- Add log_token to players for public RPE URL
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS log_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Injury records with RTP tracker
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

ALTER TABLE public.injury_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_record_all" ON public.injury_record;
CREATE POLICY "injury_record_all" ON public.injury_record USING (true) WITH CHECK (true);

-- Training load (RPE session)
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

ALTER TABLE public.training_load ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_load_all" ON public.training_load;
CREATE POLICY "training_load_all" ON public.training_load USING (true) WITH CHECK (true);

-- Biological age / maturation records
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

ALTER TABLE public.maturation_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maturation_record_all" ON public.maturation_record;
CREATE POLICY "maturation_record_all" ON public.maturation_record USING (true) WITH CHECK (true);

-- Fitness benchmark norms (by test + biological age)
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

ALTER TABLE public.fitness_benchmark ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fitness_benchmark_select" ON public.fitness_benchmark;
CREATE POLICY "fitness_benchmark_select" ON public.fitness_benchmark FOR SELECT USING (true);

-- Fitness test results per player
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

ALTER TABLE public.fitness_test_result ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fitness_test_result_all" ON public.fitness_test_result;
CREATE POLICY "fitness_test_result_all" ON public.fitness_test_result USING (true) WITH CHECK (true);
