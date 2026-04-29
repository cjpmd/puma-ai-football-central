# Team Analytics — Restructure & Confirmed-Availability Attendance

Refactor `src/pages/MyTeamMobile.tsx` so the analytics page reflects how the user actually thinks about attendance, presents stats in collapsible cards (collapsed by default), reorders sections, and adds minutes breakdowns.

## Changes

### 1. Attendance: switch to confirmed availability (with selection override)

Today, "attendance" is derived from `event_player_stats.minutes_played > 0` (i.e. only players who actually played). Change the source of truth to **availability confirmations**, with squad selection as an override:

For each past event in the season, a player is counted as "attended" if either:
- They (or a linked parent) responded `available` in `event_availability` for that event (`role = 'player'`, matched by `player_id`), OR
- They have an `event_player_stats` row with `minutes_played > 0` for that event (selection overrides a missing/declined RSVP).

**Implementation**:
- Query `event_availability` filtered by `event_id IN (past events)`, `role = 'player'`, `status = 'available'`, joined to `players` via `player_id` filtered to the current team.
- Union per `(event_id, player_id)` with the existing `event_player_stats` rows where `minutes_played > 0`.
- For each unique `(event_id, player_id)` pair, increment the bucket for `events.event_type`.
- Captain count remains driven by `event_player_stats.is_captain` (only meaningful when selected).

### 2. Make all stat cards collapsible, collapsed by default

Wrap these in `<Collapsible>` with `defaultOpen={false}` (matching the existing Attendance/Game Day pattern):
- Season Record (W-D-L)
- By Performance Category
- Team Performance (Goals Scored / Conceded bars)
- Recent Results
- Top Scorers
- Top Assisters
- Most Appearances

Attendance and Game Day Stats already use the pattern — change their initial state to `false` (already `false`, confirm).

The top "Key Metrics Grid" (Games / Wins / Win Rate / Goal Diff) stays as-is (always visible summary).

### 3. Reorder sections and remove redundant card

New order under the filters/key metrics:
1. Season Record
2. Attendance
3. Game Day Stats  *(now the single source for goals/assists/saves/cards)*
4. **Most Appearances** (moved here, expanded with minutes data — see below)
5. By Performance Category
6. Team Performance
7. Recent Results
8. Top Scorers
9. Top Assisters

Delete the standalone **Match Events** card (lines ~743–781) — its data (totals for goals, assists, saves, yellow/red cards) already appears dynamically in Game Day Stats.

### 4. Most Appearances: add minutes overall + by position

For each top performer (top 3 by appearances), aggregate from `event_player_stats`:
- `totalMinutes` (already computed) — surface as the primary subtitle
- `minutesByPosition`: sum `minutes_played` grouped by `position` (use `usePositionAbbreviations` / existing position helpers for display, fall back to raw value)

Render under each player as small chips, e.g. `GK 120 · CB 45 · ST 30`. If no position data, show only total minutes (current behavior).

## Technical Details

**File touched**: `src/pages/MyTeamMobile.tsx` only. No DB migrations, no new services.

**Data fetch additions in `loadAnalyticsData`**:
```ts
// Confirmed availability for past events in season
const { data: avail } = await supabase
  .from('event_availability')
  .select('event_id, player_id, players!inner(team_id)')
  .in('event_id', safeEventIds)
  .eq('role', 'player')
  .eq('status', 'available')
  .eq('players.team_id', currentTeam.id);

// Extend event_player_stats select to include `position`
.select('event_id, player_id, is_captain, position, minutes_played, players!inner(name)')
```

**Attendance aggregation**:
```ts
const attended = new Set<string>(); // `${event_id}:${player_id}`
avail?.forEach(a => attended.add(`${a.event_id}:${a.player_id}`));
playerStats?.forEach(s => {
  if ((s.minutes_played || 0) > 0) attended.add(`${s.event_id}:${s.player_id}`);
});
attended.forEach(key => {
  const [eid] = key.split(':');
  const et = eventTypeById.get(eid) || 'unknown';
  attendanceMap.set(et, (attendanceMap.get(et) || 0) + 1);
  totalAppearances++;
});
```

**Per-player position minutes** added to the `PlayerStat` shape: `minutesByPosition: Record<string, number>`, populated in the existing `playerStats?.forEach` loop.

**Collapsible state**: introduce one `useState(false)` per new collapsible (or a single `Record<string, boolean>` map keyed by section id) — keep code straightforward with individual `useState` calls matching the current style.

## Out of scope

- No changes to Game Day recording or to `event_availability` schema.
- No change to season selector, filters, or off-season banner.
- "Most Appearances" stays limited to top 3 (unchanged).