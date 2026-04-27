# Plan

I found two separate root causes behind the Home tab issues.

## What will be fixed

1. Restore Home-tab availability controls for Jags.
2. Stop Home-tab Recent Results / Upcoming Events from showing stale data from another selected team.
3. Verify the fix against the Pumas/Jags case before closing.

## Root causes found

- **Jags availability issue:** the Home card uses `QuickAvailabilityControls`, which depends on `get_user_event_roles(...)`. That database function currently only returns:
  - player roles from `user_players`
  - staff roles from `user_staff`

  It does **not** return staff access granted through `user_teams` (for example `team_manager`, `team_coach`, `team_assistant_manager`). For the affected user, the Jags event has a valid staff invitation and staff availability row, but the RPC returns no roles, so the Home controls render nothing.

- **Cross-team results leakage:** the Pumas recent-results query itself is team-filtered correctly in the database. That means the wrong result cards are most likely coming from **stale client state / out-of-order async responses** when switching between team views. `DashboardMobile` currently fires async loads on team/view changes, but it does not guard against an older request finishing after a newer one and overwriting the state.

## Implementation steps

### 1) Fix database role resolution for event availability
- Add a migration to replace `public.get_user_event_roles(p_event_id, p_user_id)` so it also returns **staff roles coming from `user_teams`** for the event’s team.
- Keep existing player-role and `user_staff` logic.
- Return a normalized `staff` role for team roles such as:
  - `team_manager`
  - `team_assistant_manager`
  - `team_coach`
  - `manager`
  - `coach`
  - other existing team-staff-equivalent roles already used in the app

### 2) Make `QuickAvailabilityControls` resilient when invitations/availability exist but role rows are missing
- Update `QuickAvailabilityControls.tsx` so `assumedRoles` can render a fallback control even when `userRoles` is empty.
- Add synthetic fallback entries for:
  - `staff` using the current user/profile
  - `player` using the linked player / cached player id
- Keep the existing invited-role filtering, but stop the component from returning `null` just because the RPC returned no rows.

### 3) Eliminate stale Home data when switching teams
- Update `DashboardMobile.tsx` so each `loadLiveData()` call is tied to a request key / sequence guard.
- Only apply `setStats(...)` if the response still matches the latest selected scope.
- Clear or reset the scoped Home data when team/view changes so previous team results do not linger while the new request is loading.
- Tighten team sourcing:
  - in `single` mode: only use `currentTeam.id`
  - in `all` mode: use the current `availableTeams` set for that context
  - avoid broader fallbacks that can reintroduce stale scope

### 4) Verify with the reported example
- Confirm that on **Jags Home**, the user can set availability from the Upcoming Events card.
- Confirm that on **Pumas Home**, Recent Results and Upcoming Events show only Pumas data.
- Confirm that **All Teams** still shows combined data intentionally.

## Technical details

Files expected to change:
- `src/pages/DashboardMobile.tsx`
- `src/components/events/QuickAvailabilityControls.tsx`
- `supabase/migrations/...sql` for `get_user_event_roles`

Database change shape:
```text
get_user_event_roles(event, user)
  = player roles from user_players for event.team_id
  + staff roles from user_staff/team_staff for event.team_id
  + staff roles from user_teams for event.team_id and staff-capable roles
```

Client-state hardening:
```text
team/view change
  -> start new scoped dashboard request
  -> invalidate older request responses
  -> only newest response can update Home stats
```

If you approve, I’ll implement the migration and the two frontend fixes together so the Home tab behaves consistently.