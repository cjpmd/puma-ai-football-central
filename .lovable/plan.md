# Show all linked teams in Coaching Kit

## Problem

In Edit Profile → Coaching Kit, only one team appears (e.g. "Broughty United Pumas 2015s") even when the user is staff on multiple teams. `StaffKitSection` only queries the `user_staff` linking table, so teams the user manages via `user_teams` (team_manager, team_coach, team_assistant_manager, team_helper, manager, coach, staff, helper) are missing.

This matches our existing "Unified Staff" pattern (memory: Unified Staff — staff from `team_staff` and `user_teams` are merged).

## Fix

Update `src/components/staff/StaffKitSection.tsx` so the staff records list is the union of:

1. **`user_staff` → `team_staff` → `teams`** (existing query, unchanged)
2. **`user_teams` → `teams`** filtered to staff/management roles, for entries that don't already have a `team_staff` record for the same team

For source #2 there is no `team_staff.id`, so we use a synthetic id (`user-team:{team_id}`) and persist kit sizes by upserting into `team_staff` on save (create the missing `team_staff` row with the user's role + email, link it via `user_staff`), so the existing save path keeps working and future loads come through source #1.

### Technical details

`StaffKitSection.tsx`:

- After loading `userStaffData`, also fetch:
  ```ts
  supabase.from('user_teams')
    .select('team_id, role, teams!inner(id, name)')
    .eq('user_id', userId)
    .in('role', ['team_manager','team_assistant_manager','team_coach','team_helper','manager','coach','staff','helper'])
  ```
- Build a `Set` of team_ids already covered by `user_staff` records and append only the missing teams to `staffRecords` with:
  - `id: \`user-team:${team_id}\``
  - `kit_sizes: {}` (no team_staff row yet)
- Kit issues query for synthetic records: skip (no `team_staff.id` to match `staff_ids`); show empty issued list.
- `handleSaveKitSizes`: if `staffId` starts with `user-team:`, first `insert` a `team_staff` row (`team_id`, `role`, `name` from auth user, `email`), then `insert` into `user_staff` linking `user_id` ↔ new `staff_id`, then proceed with the kit_sizes update against the new id. Refresh local state with the real id and call `loadStaffData()`.

No DB schema changes needed. No other files affected.

## Out of scope

- "Kit Issued to You" history for teams the user only joined via `user_teams` until they save sizes (then it works normally).
- Existing `EditProfileModal` and `UnifiedProfile` consumers are unchanged — they already render `StaffKitSection`.
