-- Academies tables
CREATE TABLE IF NOT EXISTS public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  fa_registration_number TEXT,
  eppp_category INTEGER,
  founded_year INTEGER,
  head_of_academy_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_clubs (
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (academy_id, club_id)
);

CREATE TABLE IF NOT EXISTS public.user_academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('academy_admin','head_of_academy','academy_coach','academy_staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, academy_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_academies_user ON public.user_academies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_academies_academy ON public.user_academies(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_clubs_club ON public.academy_clubs(club_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_academies_updated_at ON public.academies;
CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Membership helper
CREATE OR REPLACE FUNCTION public.is_academy_member(_academy_id UUID, _roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_academies
    WHERE user_id = auth.uid()
      AND academy_id = _academy_id
      AND (_roles IS NULL OR role = ANY(_roles))
  )
$$;

-- Enable RLS
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_academies ENABLE ROW LEVEL SECURITY;

-- academies policies
CREATE POLICY "Academies viewable by global admin or members or linked club members"
ON public.academies FOR SELECT
USING (
  public.is_global_admin(auth.uid())
  OR public.is_academy_member(id)
  OR EXISTS (
    SELECT 1 FROM public.academy_clubs ac
    JOIN public.user_clubs uc ON uc.club_id = ac.club_id
    WHERE ac.academy_id = academies.id AND uc.user_id = auth.uid()
  )
);

CREATE POLICY "Global admins can create academies"
ON public.academies FOR INSERT
WITH CHECK (public.is_global_admin(auth.uid()));

CREATE POLICY "Academy admins or global admins can update academies"
ON public.academies FOR UPDATE
USING (public.is_global_admin(auth.uid()) OR public.is_academy_member(id, ARRAY['academy_admin','head_of_academy']));

CREATE POLICY "Global admins can delete academies"
ON public.academies FOR DELETE
USING (public.is_global_admin(auth.uid()));

-- academy_clubs policies
CREATE POLICY "Academy clubs viewable by global admin, academy member, or club member"
ON public.academy_clubs FOR SELECT
USING (
  public.is_global_admin(auth.uid())
  OR public.is_academy_member(academy_id)
  OR EXISTS (SELECT 1 FROM public.user_clubs uc WHERE uc.club_id = academy_clubs.club_id AND uc.user_id = auth.uid())
);

CREATE POLICY "Global admins or academy admins can manage academy clubs (insert)"
ON public.academy_clubs FOR INSERT
WITH CHECK (public.is_global_admin(auth.uid()) OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy']));

CREATE POLICY "Global admins or academy admins can manage academy clubs (delete)"
ON public.academy_clubs FOR DELETE
USING (public.is_global_admin(auth.uid()) OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy']));

-- user_academies policies
CREATE POLICY "Users can view own academy memberships or admins can view all"
ON public.user_academies FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_global_admin(auth.uid())
  OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy'])
);

CREATE POLICY "Global admins or academy admins can add academy members"
ON public.user_academies FOR INSERT
WITH CHECK (public.is_global_admin(auth.uid()) OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy']));

CREATE POLICY "Global admins or academy admins can update academy members"
ON public.user_academies FOR UPDATE
USING (public.is_global_admin(auth.uid()) OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy']));

CREATE POLICY "Global admins or academy admins can remove academy members"
ON public.user_academies FOR DELETE
USING (public.is_global_admin(auth.uid()) OR public.is_academy_member(academy_id, ARRAY['academy_admin','head_of_academy']));
