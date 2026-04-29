-- Academy Vertical schema
-- Tables: academies, academy_clubs, user_academies
-- New columns: year_groups.academy_id, players.performance_summary

-- ============================================================
-- 1. academies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.academies (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text        NOT NULL,
  logo_url                text,
  fa_registration_number  text,
  eppp_category           int,
  founded_year            int,
  head_of_academy_user_id uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. academy_clubs  (many-to-many: academy ↔ club)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.academy_clubs (
  academy_id  uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  club_id     uuid NOT NULL REFERENCES public.clubs(id)     ON DELETE CASCADE,
  PRIMARY KEY (academy_id, club_id)
);

-- ============================================================
-- 3. user_academies  (membership with role)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_academies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  academy_id  uuid        NOT NULL REFERENCES public.academies(id)  ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('academy_admin', 'academy_welfare_officer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, academy_id)
);

-- ============================================================
-- 4. Extend existing tables
-- ============================================================
ALTER TABLE public.year_groups
  ADD COLUMN IF NOT EXISTS academy_id uuid REFERENCES public.academies(id) ON DELETE SET NULL;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS performance_summary jsonb DEFAULT NULL;

-- ============================================================
-- 5. Enable RLS
-- ============================================================
ALTER TABLE public.academies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_clubs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_academies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS policies — academies
-- ============================================================

-- global_admin: full CRUD
CREATE POLICY "global_admin manages academies"
  ON public.academies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  );

-- academy members: SELECT only (own academies)
CREATE POLICY "academy members read own academies"
  ON public.academies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_academies ua
      WHERE ua.academy_id = academies.id
        AND ua.user_id = auth.uid()
    )
  );

-- club_admin/club_chair: read academies that contain their clubs
CREATE POLICY "club admins read linked academies"
  ON public.academies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.academy_clubs ac
      JOIN public.clubs c ON c.id = ac.club_id
      WHERE ac.academy_id = academies.id
        AND c.id IN (
          SELECT club_id FROM public.user_clubs WHERE user_id = auth.uid()
        )
    )
  );

-- ============================================================
-- 7. RLS policies — academy_clubs
-- ============================================================

CREATE POLICY "global_admin manages academy_clubs"
  ON public.academy_clubs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  );

CREATE POLICY "academy members read academy_clubs"
  ON public.academy_clubs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_academies ua
      WHERE ua.academy_id = academy_clubs.academy_id
        AND ua.user_id = auth.uid()
    )
  );

CREATE POLICY "club members read own club in academy_clubs"
  ON public.academy_clubs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_clubs uc
      WHERE uc.club_id = academy_clubs.club_id
        AND uc.user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. RLS policies — user_academies
-- ============================================================

CREATE POLICY "global_admin manages user_academies"
  ON public.user_academies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  );

-- Users can read their own academy memberships
CREATE POLICY "users read own academy memberships"
  ON public.user_academies
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- academy_admin can view all members of their academy
CREATE POLICY "academy_admin reads academy members"
  ON public.user_academies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_academies self
      WHERE self.academy_id = user_academies.academy_id
        AND self.user_id    = auth.uid()
        AND self.role       = 'academy_admin'
    )
  );
