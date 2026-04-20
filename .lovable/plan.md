

## Plan: Fix blank Squad tab in Team Selection

### Root cause

`useAvailabilityBasedSquad` (the hook powering the Squad tab) decides whether to show "only invited players" or "all team players" using a fragile two-step probe:

1. Query `event_invitations` filtered to `invitee_type = 'player'`.
2. If that returns 0 rows, query `event_invitations` again with no `invitee_type` filter to see whether **any** invitation exists.
   - If any → assume "this event has selective invitations but no players" → show **0 players** (blank squad).
   - If none → assume "everyone invited" → load all team players.

This breaks in two real scenarios:

- **RLS visibility gaps.** RLS on `event_invitations` only grants SELECT to `team_manager / team_assistant_manager / team_coach` (or the invitee themselves). Any other role with squad-edit access (e.g. `team_admin`, `club_admin`, `club_chair`, `global_admin`) sees zero player invitations but may still see a single staff invitation (because `user_id = auth.uid()` matches them). The hook then falls into "invitations exist but none for players" → **blank squad**.
- **Newly added second team (Team 2).** After "+ Add Team", Team 2 has no `team_squads` rows. The hook should load all 9 invited players into "Available". If the invitations probe misfires (above), Team 2 also renders blank.

The DB confirms event `040b1f2a` has 9 player invitations + 1 staff invitation, matching this exact failure pattern for staff users without manager/coach role.

### Fix

In `src/hooks/useAvailabilityBasedSquad.ts`:

1. **Single query**, not two probes. Select `id, player_id, invitee_type` from `event_invitations` for the event in one round trip.
2. Compute:
   - `playerInvitations` = rows where `invitee_type = 'player'` AND `player_id` is not null
   - `hasAnyInvitations` = total rows > 0
3. Decide what to load:
   - `playerInvitations.length > 0` → load only those player IDs (current behaviour, preserved).
   - `playerInvitations.length === 0` → **load all active team players** for the event's team. (Safer default. The previous "invitations exist but none for players → show 0" behaviour was a footgun: RLS makes "0 visible" indistinguishable from "0 sent", and an event with only staff invitations should still let staff build a squad from the full roster.)
4. Drop the second probe query entirely.

This keeps the "everyone invited" UX, restores the squad list for `team_admin` / club / global-admin roles, and correctly populates Team 2 after "+ Add Team".

### Files modified

| File | Change |
|------|--------|
| `src/hooks/useAvailabilityBasedSquad.ts` | Replace the two-step invitation probe (lines ~46–116) with a single query that returns player invitations and falls back to loading the full active team roster when there are no player-typed invitations. |

### Out of scope

- RLS policy changes on `event_invitations` (separate hardening task — would require auditing every consumer).
- Visual/glass styling changes to `AvailabilityDrivenSquadManagement`.
- `MobileTeamSelectionView` summary counts (separate code path).

### Verification

- Open event "Arbroath" (`040b1f2a-…`) on mobile → Event Details → Open Team Manager → Squad tab.
- Team 1 shows the 9 invited players (already in Selected Squad as recovered from `team_squads`).
- Switch to Team 2 → Selected Squad empty, Available Players shows the same 9 invited players, each addable.
- Repeat as a `team_coach` user (already worked) and as a non-manager staff user (was previously blank) — both now populated.

