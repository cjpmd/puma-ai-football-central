-- 1. Relax academy SELECT policy: any authenticated user can view basic academy info
DROP POLICY IF EXISTS "Academies viewable by global admin or members or linked club members" ON public.academies;

CREATE POLICY "Academies viewable by authenticated users"
ON public.academies FOR SELECT
TO authenticated
USING (true);

-- 2. Expand allowed roles in user_academies
ALTER TABLE public.user_academies
  DROP CONSTRAINT IF EXISTS user_academies_role_check;

ALTER TABLE public.user_academies
  ADD CONSTRAINT user_academies_role_check
  CHECK (role IN (
    'head_of_academy',
    'academy_admin',
    'academy_coach',
    'academy_staff',
    'academy_welfare_officer',
    'welfare_officer',
    'physio',
    'scout',
    'analyst'
  ));

-- 3. Add optional Performance app URL on academies
ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS performance_app_url TEXT;