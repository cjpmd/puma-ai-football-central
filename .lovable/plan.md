# Fix Home tab availability + cross-team data leakage

Two related issues on the mobile Home tab (`DashboardMobile.tsx`).

## Issue 1 — Availability buttons missing in "Upcoming Events"

In your Jags screenshot (chrisjcdonald, staff) the event card shows no Available/Unavailable buttons, while the Pumas card does. This is because `QuickAvailabilityControls` returns `null` whenever it can't find a matching row in the `event_invitations` table for the current user's linked staff/player records.

For some Jags events, the staff invitation row was likely never created (the event was made before chrisjcdonald was added as staff, or the invite list is missing his `staff_id`). So even though the event is in his Upcoming list and shows "Pending response", the inline buttons get hidden.

**Fix:** broaden how the Home tab decides who can respond. Instead of requiring a row in `event_invitations`, treat the user as invited whenever **any** of these is true for the event:

1. There is an `event_availability` record for them as user/player/staff (this is what already drives the "pending" badge), OR
2. There is a row in `event_invitations` matching their user / linked player / linked staff IDs, OR
3. They are an active staff member of the event's team (via `team_staff` / `user_staff`), OR
4. They are linked (via `user_players`) to a player on the event's team.

Add a new prop `forceVisible` (or `inferredRole`) on `QuickAvailabilityControls` so the Home dashboard can pass in the role(s) it has already inferred from `pendingAvailability` / `userAvailabilityData`, bypassing the strict `invitedRoleSources` gate when those records exist.

Also pass the real `currentStatus` (from `event.user_availability`) instead of the hard-coded `"pending"` so the buttons reflect existing state.

## Issue 2 — Recent Results / Upcoming Events leaking across teams

In your Pumas screenshot, "Recent Results" shows a Jags 5-2 vs Arbroath line above the Pumas 1-0 vs Riverside. Events and results should respect the team selector.

Root cause: `loadLiveData()` only filters by a single team when `viewMode === 'single'`. If the team context is in `'all'` mode (the default and what `localStorage` often restores it to), every team you belong to is queried — that's how Jags rows appear on a "Pumas" screen.

The team picker chip on the Home tab currently shows "All Teams" when in all-mode, but the rest of the UI (and your mental model) treats whichever team you last viewed as "the" active team.

**Fix:** make Home strictly respect the picker.

- Keep the current `viewMode` logic, but ensure the picker chip is the source of truth. When the user picks a single team, only that team's events/results load (already works).
- When in `'all'` mode, prefix each card subtitle with the team name (already shown) but also add a small team-logo chip on the left edge of each list row so multi-team mixing is visually obvious — not a bug.
- Add a guard: if `viewMode === 'single'` but `currentTeam` is `null` (race during first load), short-circuit and don't query at all instead of falling back to all teams. Today the code does `currentTeam ? [currentTeam] : []` which is fine — but the `useEffect` re-runs on `availableTeams` change, so a transient empty `teams` array can cause a flash. Add a `currentTeam?.id` dependency and gate the fetch on `viewMode === 'all' || !!currentTeam`.
- Also tighten the fallback in `viewMode === 'all'`: use `availableTeams` (the user's actual teams) rather than `teams ?? allTeams` so global admins or users with cached `allTeams` don't get every team in the system.

## Technical changes (files to edit)

- `src/components/events/QuickAvailabilityControls.tsx`
  - Add optional prop `assumedRoles?: Array<'player' | 'staff'>`.
  - When provided and non-empty, treat the matching `userRoles` entries as invited (skip the `invitedRoleSources` gate for those roles only).
  - Keep current behaviour when the prop is absent (so Calendar / Event Details pages are unchanged).

- `src/pages/DashboardMobile.tsx`
  - In the Upcoming Events list, compute `assumedRoles` per event from `userAvailabilityData` (group statuses by `event_id` → unique roles) and `playerAvailabilityData` (→ `'player'`).
  - Pass `assumedRoles` and `currentStatus={event.user_availability ?? 'pending'}` to `QuickAvailabilityControls`.
  - In `loadLiveData()`:
    - Replace `teamsToUse = viewMode === 'all' ? (teams?.length ? teams : allTeams || []) : (currentTeam ? [currentTeam] : [])` with a version that uses `availableTeams` for the all-mode source and bails when single-mode has no `currentTeam`.
    - Add `currentTeam?.id` to the `useEffect` dependency array.

## Diagram

```text
Home tab event row
  ├─ event_availability has row for me?  ──► assumedRoles += role
  ├─ event_invitations has row for me?   ──► invitedRoleSources (existing path)
  └─ QuickAvailabilityControls
        if assumedRoles non-empty OR invitedRoleSources match
          → render Available / Unavailable buttons
        else
          → null (current behaviour)
```

## Out of scope

- Backfilling missing `event_invitations` rows for past events (separate data-repair task if you want it).
- Changing the Calendar / Event Details availability flow — only Home tab is touched.
