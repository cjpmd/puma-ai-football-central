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

CREATE POLICY "video_clip_all" ON public.video_clip FOR ALL USING (true);
CREATE POLICY "academy_settings_all" ON public.academy_settings FOR ALL USING (true);
CREATE POLICY "notif_pref_own" ON public.notification_preference FOR ALL USING (auth.uid() = user_id);
