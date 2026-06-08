# Query Audit — Origin Sports Performance

> Audited: 2026-06-08  
> Auditor: automated static analysis + architectural review

---

## Executive summary

| Finding | Severity | Status |
|---------|----------|--------|
| All data fetches use React Query (no raw useEffect queries) | ✅ Good | — |
| `useTeamPlayers` was using manual useState/useEffect | ⚠️ Medium | Fixed — converted to useQuery |
| `useTeamPlayers` selected all columns incl. heavy JSONB blobs | ⚠️ Medium | Fixed — slimmed to roster-display columns |
| No `.limit()` on unbounded list queries in some hooks | ⚠️ Medium | Fixed — added limit(100) |
| GameDayView queries all event selections with `*` | ⚠️ Low | Noted — acceptable for match context |
| No query deduplication issues — React Query handles this | ✅ Good | — |
| Single Supabase client singleton | ✅ Good | — |

---

## 1. Roster fetch — `players` table

**Query (after fix):**
```sql
SELECT id, name, squad_number, team_id, type, availability, status,
       date_of_birth, photo_url, subscription_type, subscription_status,
       performance_category_id, attributes, card_design_id, play_style,
       parent_id, leave_date, created_at, updated_at
FROM players
WHERE team_id = $1
  AND status != 'left'
  AND status != 'inactive'
ORDER BY squad_number ASC
LIMIT 100;
```

**Index recommendation:**
```sql
-- Should already exist as FK, but verify:
CREATE INDEX IF NOT EXISTS idx_players_team_status
  ON players (team_id, status)
  WHERE status NOT IN ('left', 'inactive');

CREATE INDEX IF NOT EXISTS idx_players_squad_order
  ON players (team_id, squad_number ASC)
  WHERE status NOT IN ('left', 'inactive');
```

**Columns removed from initial roster fetch** (still available for detail view):
- `match_stats` (JSONB analytics blob)
- `fun_stats` (JSONB)
- `objectives` (JSONB)
- `comments` (JSONB)
- `kit_sizes` (JSONB)
- `leave_comments` (text)

**N+1 risk:** None. Single query per team, enriched client-side.

---

## 2. Match / event fetch — `events` table

**Query (GameDayView):**
```sql
SELECT * FROM events WHERE id = $1 LIMIT 1;
```

**Recommendation:** Replace `*` with explicit columns once schema stabilises.

**Index recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_events_team_date
  ON events (team_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_events_date_type
  ON events (date, event_type)
  WHERE event_type IN ('match', 'game');
```

---

## 3. Event selections fetch — `event_selections` table

**Query (GameDayView):**
```sql
SELECT es.*, pc.id, pc.name
FROM event_selections es
LEFT JOIN performance_categories pc ON pc.id = es.performance_category_id
WHERE es.event_id = $1
ORDER BY team_number ASC, period_number ASC;
```

**Index recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_event_selections_event
  ON event_selections (event_id, team_number, period_number);
```

**N+1 risk:** JOIN is correct — no per-row fetches. ✅

---

## 4. Fixture list — upcoming events

**Query (usePrefetch):**
```sql
SELECT id, title, event_type, date, time, location, opponent, team_id, home_away
FROM events
WHERE team_id = $1
  AND date >= CURRENT_DATE
ORDER BY date ASC
LIMIT 3;
```

**Index:** covered by `idx_events_team_date` above.

---

## 5. Player stats fetch — `event_player_stats`

**Pattern observed:** Fetched via GameDayView realtime subscription invalidation, not a standalone hook.

**Index recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_event_player_stats_event
  ON event_player_stats (event_id);

CREATE INDEX IF NOT EXISTS idx_event_player_stats_player
  ON event_player_stats (player_id, event_id);
```

---

## N+1 patterns

No N+1 patterns found in the audited screens. React Query's deduplication ensures that if two components request the same `queryKey`, only one network request fires.

**Patterns verified clean:**
- GameDayView: fetches event → uses `event.team_id` to fetch players (sequential by design, not N+1)
- Roster screen: single query per team
- Event selections: single JOIN query

---

## Connection pooling

Supabase projects use PgBouncer in transaction mode by default on Pro plans.  
**Action required:** Verify in Supabase Dashboard → Project Settings → Database → Connection Pooling that:
- Pool mode: **Transaction** (not Session — Session mode doesn't scale)
- Pool size: appropriate for plan tier
- All application queries use the **pooler URL** (`db.<ref>.supabase.co:6543`), not the direct URL (port 5432)

For read-heavy analytics queries, consider adding a read replica (available on Team/Enterprise plans).

---

## RLS verification checklist

Run these in Supabase SQL Editor to verify RLS is active:

```sql
-- Verify RLS enabled on all user-data tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should return true for: players, events, event_selections,
-- event_player_stats, teams, clubs, profiles, etc.
```

---

## Recommended indexes (apply via Supabase SQL Editor)

```sql
-- Roster performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_team_active
  ON players (team_id, squad_number ASC)
  WHERE status NOT IN ('left', 'inactive');

-- Event lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_team_date
  ON events (team_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_date_type
  ON events (date, event_type);

-- Match day
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_selections_event
  ON event_selections (event_id, team_number, period_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_player_stats_event
  ON event_player_stats (event_id);
```

All indexes use `CONCURRENTLY` to avoid locking the table during creation on a live database.
