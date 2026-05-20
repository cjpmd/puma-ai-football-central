-- Fix infinite recursion in user_clubs RLS policies by using SECURITY DEFINER helper

DROP POLICY IF EXISTS "user_clubs_select_own" ON public.user_clubs;
DROP POLICY IF EXISTS "user_clubs_select_as_admin" ON public.user_clubs;
DROP POLICY IF EXISTS "user_clubs_insert" ON public.user_clubs;
DROP POLICY IF EXISTS "user_clubs_update" ON public.user_clubs;
DROP POLICY IF EXISTS "user_clubs_delete" ON public.user_clubs;

CREATE POLICY "user_clubs_select"
  ON public.user_clubs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
  );

CREATE POLICY "user_clubs_insert"
  ON public.user_clubs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
    OR (user_id = auth.uid() AND role = 'club_member')
  );

CREATE POLICY "user_clubs_update"
  ON public.user_clubs FOR UPDATE TO authenticated
  USING (
    public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
  );

CREATE POLICY "user_clubs_delete"
  ON public.user_clubs FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
  );