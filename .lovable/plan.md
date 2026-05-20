## Root cause

Profile fetch is failing with **"infinite recursion detected in policy for relation user_clubs"** (seen in session replay). With no profile loaded, `isGlobalAdmin` is false, `clubs`/`teams` arrays are empty, and `SmartViewContext` only adds the `parent` view (because `connectedPlayers` still loads via `user_players`). That's why you see only the Parent role and lose super-user rights.

The recursion was introduced when the Academy/Club hierarchy migration rewrote `user_clubs` RLS. The current SELECT/INSERT/UPDATE/DELETE policies on `user_clubs` all contain:

```sql
EXISTS (SELECT 1 FROM user_clubs uc2 WHERE uc2.club_id = user_clubs.club_id
        AND uc2.user_id = auth.uid()
        AND uc2.role IN ('club_admin','club_chair'))
```

That sub-query re-evaluates RLS on `user_clubs` → infinite recursion → every dependent query (clubs load, teams via clubs, profile-parallel fetches) errors out.

## Fix

### 1. Migration — break the recursion on `user_clubs`

There is already a `SECURITY DEFINER` helper `public.is_user_club_admin(p_club_id, p_user_id)` that bypasses RLS. Replace the recursive sub-queries with calls to it.

```sql
-- SELECT: own rows OR you're a club admin for that club OR global admin
DROP POLICY "user_clubs_select_own" ON public.user_clubs;
DROP POLICY "user_clubs_select_as_admin" ON public.user_clubs;
CREATE POLICY "user_clubs_select"
  ON public.user_clubs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
  );

-- INSERT
DROP POLICY "user_clubs_insert" ON public.user_clubs;
CREATE POLICY "user_clubs_insert"
  ON public.user_clubs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
    OR (user_id = auth.uid() AND role = 'club_member')
  );

-- UPDATE
DROP POLICY "user_clubs_update" ON public.user_clubs;
CREATE POLICY "user_clubs_update"
  ON public.user_clubs FOR UPDATE TO authenticated
  USING (
    public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
  );

-- DELETE
DROP POLICY "user_clubs_delete" ON public.user_clubs;
CREATE POLICY "user_clubs_delete"
  ON public.user_clubs FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_global_admin(auth.uid())
    OR public.is_user_club_admin(club_id, auth.uid())
  );
```

### 2. Audit sibling tables for the same pattern

While in there, double-check `user_teams` and `user_academies` policies don't have the same recursive shape. From inspection:
- `user_teams` is fine (only `user_id = auth.uid()` and `user_is_global_admin()`).
- `user_academies` uses `is_academy_member(...)` — if that helper queries `user_academies` without `SECURITY DEFINER`, it would have the same bug. Verify and, if needed, rewrite to use a definer function. Apply the same fix only if recursion is confirmed.

### 3. No frontend changes required

Once profile loads cleanly, `AuthorizationContext` will see `global_admin` in `profile.roles`, `SmartViewContext` will populate `availableViews` with `global_admin / club_admin / team_manager / coach / parent` for you, and the `RoleContextSwitcher` dropdown will reappear in the header. Your existing localStorage preference (`smartview-<your-id>`) may still be pinned to `parent` — if so, switch via the dropdown once it reappears (it persists per-user).

## Out of scope

- Any new role types.
- Refactor of `is_academy_member` unless step 2 confirms recursion.
- Cosmetic changes to the role switcher.

## Files touched

- New Supabase migration: `user_clubs` RLS rewrite (+ optional `user_academies` fix if recursion is confirmed).
- No application source changes.
