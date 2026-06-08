# Offline-Capable Screens

> Last updated: 2026-06-08

All screens listed here cache their last successful data load to `localStorage` with a timestamp.
On mount they render cached data **immediately (0 ms)**, then fetch fresh data from Supabase in
the background. If the background refresh succeeds the display updates silently and the stale
indicator disappears. If it fails (no network), the cached data remains visible.

An amber banner — `"Updated X min ago · Offline mode"` — is shown whenever the UI is serving
data from cache rather than a live Supabase response.

---

## Offline screens

| Screen | File | Cache key pattern | Data cached |
|--------|------|-------------------|-------------|
| **Game Day** | `src/components/events/GameDayView.tsx` | `origin_offline_game_day_event_<eventId>` | Event details |
| | | `origin_offline_game_day_selections_<eventId>` | Team formations + period selections |
| **Event List** | `src/pages/CalendarEventsMobile.tsx` | `origin_offline_offline_events_<teamIds>` | All events in 9-month window |
| **Individual Event detail** | `src/pages/CalendarEventsMobile.tsx` | (same cache as Event List — detail is a modal over the list) | Event data + selections |
| **Team Manager** | `src/pages/TeamManagementMobile.tsx` | `origin_offline_offline_teams_<userId>` | Teams list with player counts + upcoming events |
| **Team Analytics (My Team)** | `src/pages/MyTeamMobile.tsx` | `origin_offline_offline_analytics_<teamId>_<season>` | Full season analytics: results, goals, scorers, attendance |

---

## Implementation details

### Cache layer
- **File:** `src/lib/offlineCache.ts`
- **Storage:** `localStorage` with prefix `origin_offline_`
- **Format:** `{ data: T, savedAt: number }` (savedAt = ms since epoch)
- **Survival:** Persists across app restarts and backgrounding (localStorage is never cleared by the OS)
- **Eviction:** No automatic eviction — data is overwritten on every successful fetch. If the user has never loaded a screen, there is no cache entry.

### Stale threshold
The app always attempts a background refresh when network is available. The "stale" concept is
purely cosmetic — the amber banner appears whenever the *currently displayed data* came from
localStorage rather than a live fetch. It disappears the moment fresh data arrives.

For reference: localStorage data older than 30 minutes is considered visually stale but is still
displayed (correct pitch-side behaviour — stale data beats no data).

### Cache invalidation
Cache entries are overwritten by every successful network response. There is no time-based
eviction; `writeCache()` always uses `Date.now()` as the `savedAt` timestamp.

### Hook used by Game Day
`src/hooks/useOfflineAwareQuery.ts` — wraps `useQuery` with transparent localStorage read/write
using `placeholderData`. Handles the React Query integration automatically.

### Manual pattern used by Event List, Team Manager, Team Analytics
Three steps in each component:
1. Build a stable cache key from context values (team IDs, user ID, season label)
2. `readCache()` before the network call → `setState(cached.data)` + `setLoading(false)` if found
3. `writeCache()` after a successful network response → `setStaleSavedAt(null)` to hide banner

---

## Adding a new offline screen

1. Import `readCache`, `writeCache`, `staleLabel`, `staleMins` from `@/lib/offlineCache`
2. Add `const [staleSavedAt, setStaleSavedAt] = useState<number | null>(null)`
3. Add `const cacheKeyRef = useRef<string | null>(null)`
4. Before the network call: read cache, hydrate state, call `setLoading(false)` if hit
5. After successful network response: call `writeCache()`, then `setStaleSavedAt(null)`
6. In JSX: render the amber banner conditionally on `staleSavedAt`
7. Add `// OFFLINE CAPABLE — cached via localStorage, last updated <date>` comment at top of file
8. Add the screen to this document
