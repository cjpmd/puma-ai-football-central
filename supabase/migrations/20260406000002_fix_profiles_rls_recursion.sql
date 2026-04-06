-- Fix infinite recursion in profiles RLS policies
--
-- ROOT CAUSE: Three places query `profiles` from within profiles RLS / CHECK:
--
--   1. "Limited admin profile creation" INSERT WITH CHECK
--      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND …)
--      → triggers SELECT policies on profiles → recursion
--
--   2. "Limited admin profile updates" UPDATE USING
--      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND …)
--      → same recursion path
--
--   3. prevent_self_admin_elevation CHECK constraint
--      SELECT array_length(roles,1) FROM profiles p2 WHERE p2.id = profiles.id
--      → self-referential; also logically a no-op (compares value to itself)
--
-- FIX: Replace all three with calls to the existing SECURITY DEFINER helper
-- user_is_global_admin(), which bypasses RLS and breaks the recursion.
-- The CHECK constraint is simply dropped (its logic was already ineffective).

-- ─── 1. Ensure the SECURITY DEFINER helper is present and correct ─────────────
CREATE OR REPLACE FUNCTION public.user_is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND 'global_admin' = ANY(roles)
  );
$$;

-- ─── 2. Drop the no-op / recursive CHECK constraint ───────────────────────────
--
-- BEFORE:
--   ALTER TABLE profiles ADD CONSTRAINT prevent_self_admin_elevation CHECK (
--     CASE
--       WHEN id = auth.uid() AND 'global_admin' = ANY(roles)
--       THEN array_length(roles, 1) = (
--         SELECT array_length(roles, 1) FROM profiles p2 WHERE p2.id = profiles.id
--       )
--       ELSE true
--     END
--   );
--
-- WHY DROPPED: The subquery reads the same row that is being written
-- (p2.id = profiles.id) so it always returns the same value and the
-- comparison is trivially true. The constraint was a no-op AND caused
-- recursion for global_admin users saving their own profile.
-- Role-escalation protection is handled by the trigger
-- prevent_admin_self_assignment_trigger instead.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS prevent_self_admin_elevation;

-- ─── 3. Fix INSERT policy ─────────────────────────────────────────────────────
--
-- BEFORE:
--   CREATE POLICY "Limited admin profile creation" ON profiles
--   FOR INSERT WITH CHECK (
--     auth.uid() = id OR
--     (EXISTS (
--       SELECT 1 FROM profiles p                    ← recursive
--       WHERE p.id = auth.uid()
--         AND 'global_admin' = ANY(p.roles)
--         AND array_length(p.roles, 1) = 1
--     ))
--   );
--
-- AFTER: replace the direct profiles subquery with user_is_global_admin()
DROP POLICY IF EXISTS "Limited admin profile creation" ON public.profiles;

CREATE POLICY "Limited admin profile creation"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id          -- users can create their own profile
    OR public.user_is_global_admin()  -- global admins can create any profile
  );

-- ─── 4. Fix UPDATE policy ─────────────────────────────────────────────────────
--
-- BEFORE:
--   CREATE POLICY "Limited admin profile updates" ON profiles
--   FOR UPDATE USING (
--     auth.uid() = id OR
--     (EXISTS (
--       SELECT 1 FROM profiles p                    ← recursive
--       WHERE p.id = auth.uid()
--         AND 'global_admin' = ANY(p.roles)
--         AND profiles.id != auth.uid()
--     ))
--   );
--
-- AFTER: use user_is_global_admin() and keep the "not own row" guard
DROP POLICY IF EXISTS "Limited admin profile updates" ON public.profiles;

CREATE POLICY "Limited admin profile updates"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id                                            -- own profile
    OR (public.user_is_global_admin() AND id != auth.uid())   -- admin updating others
  )
  WITH CHECK (
    auth.uid() = id
    OR (public.user_is_global_admin() AND id != auth.uid())
  );
