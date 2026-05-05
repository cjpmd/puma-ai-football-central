I’ve checked the current code, database state, RLS policies, the uploaded Claude prompt, and the Origin Sports Performance project context.

You’re right: the current implementation is getting the concepts blurred. The intended model is:

```text
Professional Club may own an Academy
Academy may link to one or more Clubs
Grassroots Clubs / Teams can feed into an Academy
Academy sits above Club for performance/development context
Club still remains its own separate organisation

Academy -> Clubs -> Year Groups -> Teams -> Players
```

There are also two separate apps/Supabase projects:

```text
Football Central: source of truth for academies, clubs, teams, players, fixtures
Origin Sports Performance: pulls/syncs academy/club/team/player data from Football Central
```

## What I found

1. The creator backfill now exists for Dundee FC:
   - `academies`: Dundee FC exists.
   - `user_academies`: there is now an `academy_admin` membership for the global admin user.

2. The app can still show “Academy not found” because the first academy query is RLS-dependent and the page treats any query failure as “not found”. It doesn’t distinguish:
   - actual missing academy,
   - access denied/RLS,
   - stale auth/profile state,
   - related-data query failures.

3. The current academy role model is inconsistent:
   - Migration constraint currently allows `academy_admin`, `head_of_academy`, `academy_coach`, `academy_staff`.
   - `AcademyDashboard.tsx` checks for `academy_welfare_officer`, but that role is not allowed by the current `user_academies.role` CHECK constraint.
   - The uploaded prompt expects academy roles like `head_of_academy`, `academy_admin`, `welfare_officer`, `physio`, `scout`, `analyst`, and profile-level additions `academy_admin` / `academy_welfare_officer`.

4. The current “Create Academy” flow wording and logic makes an academy feel like a type of club. It should instead make clear that an academy is a separate performance/development entity that can be linked to clubs after creation.

5. Current RLS is stricter than the prompt in one key place:
   - Prompt says `academies` SELECT can be public because name/logo are not sensitive.
   - Current RLS only allows global admin, direct academy member, or linked-club member.
   - This is probably why the dashboard experience is fragile. The sensitive data is not the academy row itself; it’s staff membership and player/team data.

## Plan

### 1. Clarify the data model in Football Central

Keep academies and clubs separate:

- `academies`: academy identity/profile only.
- `clubs`: normal club identity/profile.
- `academy_clubs`: relationship table showing which clubs feed into or are associated with an academy.
- `user_academies`: academy-level staff/permission memberships.

No club will be converted into an academy, and no academy will replace a club.

### 2. Fix academy RLS to match the intended privacy model

Create a migration that:

- Allows authenticated users to SELECT basic academy rows, or makes academy rows publicly readable if we follow the prompt exactly.
- Keeps academy creation/update/delete restricted to global admins / academy admins as appropriate.
- Keeps `user_academies` protected: users can see their own membership; academy admins/head of academy/global admins can manage members.
- Keeps `academy_clubs` readable to academy members and linked club members, manageable only by global admins or academy admins/head of academy.

This should stop the academy shell from disappearing just because the current user is not yet linked through every downstream relationship.

### 3. Normalize academy roles

Create a migration to update the `user_academies.role` constraint so it supports the roles the app and prompt reference.

Proposed allowed roles:

```text
head_of_academy
academy_admin
academy_coach
academy_staff
academy_welfare_officer
welfare_officer
physio
scout
analyst
```

Then update frontend checks to use a single normalized staff role list instead of hardcoded one-offs.

### 4. Fix academy creation flow semantics

Update `src/pages/ClubManagement.tsx` so the modal makes the relationship explicit:

- Rename wording from “link clubs” to “associated / feeder clubs”.
- Explain that the academy and club remain separate records.
- Assign the selected head as `head_of_academy` in `user_academies`, not only `academy_admin`.
- Keep creator auto-grant as `academy_admin` so the creator immediately has access.
- Continue adding `academy_admin` to `profiles.roles` only if needed for navigation, but do not rely on profile roles for access control.

### 5. Make the academy dashboard handle access states properly

Update `src/pages/AcademyDashboard.tsx` so it distinguishes:

- academy genuinely missing,
- user not authorized,
- related data unavailable,
- academy exists but has no linked clubs/year groups yet.

For an academy with no linked clubs yet, show a useful empty state, e.g.:

```text
Academy created
No clubs or teams are linked yet.
Link feeder clubs from Club Management to populate squads, fixtures and players.
```

This avoids the misleading “Academy not found” message for a newly created but not-yet-linked academy.

### 6. Fix academy navigation discovery

Update sidebar/navigation logic so it does not use `user.roles` from the Supabase auth user object. That object does not contain the project profile roles.

Instead, use:

- `profile.roles` for global/profile-level navigation labels, and
- `user_academies` membership rows for academy dashboard links.

Global admins should see academy management in `/clubs`; academy members should see direct academy dashboard links.

### 7. Add the Origin Sports Performance relationship as configuration, not a hardcoded assumption

Football Central should store/show the Performance link per academy when present.

- Use the existing `academies.performance_app_url` field if present in the live DB.
- If missing in migrations, add it via migration.
- Display “Open in Origin Sports Performance” only for academy staff/global admins.
- Do not copy Performance app functionality into Football Central; Performance remains the heavy academy management app.

### 8. Review the Performance sync contract, but do not modify the Performance project in this pass

I confirmed the Performance project already has `sync-external-academy` and core sync logic that expects:

- Football Central `academies`
- `academy_clubs`
- `user_academies`
- profile email matching
- `academy_id` populated on Performance clubs after academy sync

This pass will make Football Central’s data and roles cleaner so that Performance sync has a consistent source of truth.

## Files / database changes expected

- New Supabase migration for academy RLS and role constraint cleanup.
- `src/pages/ClubManagement.tsx`
- `src/pages/AcademyDashboard.tsx`
- `src/hooks/useSmartNavigation.ts`
- `src/components/layout/DashboardLayout.tsx`
- Possibly a small shared helper for academy role checks.

## Out of scope for this pass

- Changing Origin Sports Performance code directly.
- Building the full Academy Settings/staff invite page.
- Building welfare/medical/scouting/coaching modules in Football Central.
- Changing the video pipeline in Performance.