# Club Management Mobile — Fixes & UX Refinement

## Problem Summary

On the Club Details mobile view (`/clubs/:id`):

1. **Teams tab** lists all 3 club teams (Panthers, Pumas, Jags).
2. **Summary tab** shows only "2 Teams / 38 Players" — Jags missing.
3. **Players tab** shows "29 players from 2 teams" — Jags missing.
4. **Teams tab** exposes a "Move to…" dropdown and an unlink button inline on every team row, making accidental year-group changes / unlinking too easy.

### Root cause of #2 and #3

There are two sources of truth for "teams in a club":
- `teams.club_id` column (used by the Teams tab).
- `club_teams` link table (used by Summary and Players tabs).

For this club, **Jags** has `teams.club_id` set correctly but no row in `club_teams`. So tabs that query through `club_teams` miss it. Confirmed via DB: 3 teams have `club_id` matching the club, but only 2 appear in `club_teams`.

## Plan

### 1. Make `teams.club_id` the single source of truth for club membership

Update both components so they discover club teams the same way the Teams tab does — a union of:
- `teams` rows where `club_id = clubId`, plus
- `club_teams.team_id` rows (legacy link table) — kept as fallback for any teams that only exist in the link table.

Files:

- **`src/components/clubs/ClubSummaryReport.tsx`** — `loadSummary()`
  - Query `teams` by `club_id` AND `club_teams` by `club_id`, then dedupe team IDs.
  - Continue to compute totals + age-group breakdown from the unified set.
- **`src/components/clubs/ClubPlayerManagement.tsx`** — team-loading effect (~line 67–95)
  - Same union approach. All downstream player queries, team-summary cards, and the team filter dropdown then include every team.

### 2. Self-heal `club_teams` on view load (light backfill)

When the unified loader detects a team that's in `teams.club_id` but missing from `club_teams`, insert the missing `club_teams` row (`{ club_id, team_id }`). This keeps the two stores aligned over time without requiring a one-off migration. Wrapped in try/catch so RLS denials don't break rendering.

### 3. Teams tab — safer management UI (`ClubTeamLinking.tsx`, ~line 458–500)

Replace the always-visible "Move to…" Select + Unlink button with a single discreet action menu per team:

- Each team row shows only the team name + age group + a small `MoreVertical` (⋮) icon button (ghost, muted).
- Tapping ⋮ opens a `DropdownMenu` with:
  - **Move to year group ▸** (submenu listing other year groups)
  - **Remove from year group** (muted)
  - separator
  - **Unlink team from club** (red/destructive, with `AlertDialog` confirmation: "Unlink {team name} from {club name}? This will not delete the team.")
- Use the existing `dropdown-menu`, `alert-dialog` components from `@/components/ui`.

Result: destructive actions require an explicit two-step gesture, the row is visually cleaner, and accidental dropdown taps are no longer possible.

### 4. No changes required

- `ClubDetailsMobile.tsx` wiring is fine.
- Year-group reassignment / unlink server logic in `ClubTeamLinking` is reused; only the trigger UI changes.

## Technical Notes

- Union query pattern (pseudo):
  ```ts
  const [{ data: byColumn }, { data: byLink }] = await Promise.all([
    supabase.from('teams').select('id, name, age_group').eq('club_id', clubId),
    supabase.from('club_teams').select('team_id, teams!inner(id, name, age_group)').eq('club_id', clubId),
  ]);
  const map = new Map<string, {id:string;name:string;age_group:string}>();
  byColumn?.forEach(t => map.set(t.id, t));
  byLink?.forEach(r => r.teams && map.set(r.teams.id, r.teams));
  const teams = [...map.values()];
  ```
- Backfill insert uses `.upsert({ club_id, team_id }, { onConflict: 'club_id,team_id', ignoreDuplicates: true })` to avoid duplicate errors.
- Dropdown trigger: `Button variant="ghost" size="icon" className="h-8 w-8"` with `MoreVertical` from `lucide-react`.

## Out of Scope

- No schema migration. No deletion of `club_teams` table.
- No changes to desktop `ClubDetailsModal` (request is mobile-focused). If desired later, the same dropdown pattern can be ported.
