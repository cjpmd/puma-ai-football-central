## Problem

In Team Selection → Staff for the **Broughty United Jags 2015s** event, Chris McDonald (chrisjpmcdonald@gmail.com) shows:
- "No linked account"
- "Not Linked" badge
- The "Some staff members need account linking" warning

But he IS effectively linked to the Jags — just through `user_teams` (role `team_manager`), not through `user_staff`.

## Root cause

Verified in the database:
- `team_staff` row `a0427e24…` exists for Chris on the Jags (role `team_manager`, email `chrisjpmcdonald@gmail.com`).
- There is **no matching row in `user_staff`** for that `staff_id`.
- However Chris's user_id (`bdc91e32…`) IS in `user_teams` for that same team_id with role `team_manager`, and his email matches a profile.

`src/components/events/EventStaffAssignmentSection.tsx` (the panel shown in the screenshot) determines `isLinked` using *only* the `user_staff` table. When an `eventId` is passed, it bypasses the `get_consolidated_team_staff` RPC and goes directly to `team_staff` + `user_staff`, so it never sees the `user_teams` link. Result: a falsely "Not Linked" staff member who actually has an account, and broken availability tracking for them.

This is inconsistent with the existing project rule (memory `staff/user-teams-integration-in-event-invitations`) that `user_staff` and `user_teams` should be treated as equivalent linkage sources for staff and invitations.

## Fix

Update `src/components/events/EventStaffAssignmentSection.tsx` so that, in the invited-staff branch, a `team_staff` record is considered linked if **any** of the following is true:

1. There is a matching row in `user_staff` (current behaviour), OR
2. There is a row in `user_teams` for the same `team_id` whose user has the same email as the `team_staff.email` (looked up via `profiles.email`), OR
3. As a safety net, the `team_staff.email` matches a profile that is in `user_teams` for this `team_id`.

Concretely:

- After loading `teamStaff` and existing `user_staff` rows, also query `user_teams` for `team_id = teamId` joined to `profiles` to get `{ user_id, email }` pairs.
- Build an email → `user_id` map (lowercased) from those rows.
- For each invited staff record, set:
  - `isLinked = userStaffMap.has(staff.id) || emailToUserMap.has(staff.email.toLowerCase())`
  - `linkedUserId = userStaffMap.get(staff.id) ?? emailToUserMap.get(staff.email.toLowerCase())`
- Keep the rest of the component (availability lookup via `linkedUserId`, the warning banner, etc.) unchanged — it will now correctly resolve Chris's `user_id` and pull his availability.

No DB migration is required. No other components are affected by this change because `StaffSelectionSection`, `TrainingPlanEditor`, and `EnhancedTeamSelectionManager` already use `get_consolidated_team_staff`, which already merges `user_teams`.

## Verification after change

1. Open the Jags 2015s event → Team Selection → Staff. Chris should appear with no "Not Linked" badge and an availability status (Pending/Available/Unavailable) instead of "No linked account".
2. The orange "Some staff members need account linking" warning should disappear when there are no other unlinked staff.
3. Pumas 2015s should continue to show Chris as linked (unchanged behaviour, since he has a `user_staff` row there).
4. Selecting/unselecting Chris should create/refresh his `event_availability` staff record correctly.
