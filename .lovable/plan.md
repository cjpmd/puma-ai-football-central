
Goal: Resolve three user-facing issues that are likely connected:
1) The mobile image editor overlay becomes non-interactive (no pinch/drag, Save/Cancel don’t respond).
2) Play styles appear to “save” (toast) but aren’t persistent/visible after close or refresh.
3) Calendar Event Details shows “No Team Selection” + wrong kit even when selections exist, and user sees “Profile fetch failed: canceling statement due to statement timeout”.

---

## What I found (from code + your screenshots)

### A) Image editor “freezes” because the overlay is not receiving pointer/touch events
Even after the recent portal change, the editor still portals to:
```ts
document.querySelector('[data-radix-portal]')
```
…but `querySelector` returns the FIRST matching portal, and Radix can create multiple portals. If we portal into the wrong one (or an older one), we can still end up outside the “interactive” layer (Radix disables pointer events outside the active modal layer). This matches your screenshot: the editor renders visually, but nothing responds.

### B) Play styles: saving may work, but they can still appear “not persistent” due to state/serialization mismatch or stale data flow
- DB stores `players.play_style` as a **string** that looks like JSON (e.g. `["finisher","speedster"]`).
- We saw play_style values in the DB already in that format.
- The UI saves via DashboardMobile/PlayerManagementMobile using `JSON.stringify(playStyles)` which is correct.
- However, the card’s internal state uses arrays sometimes, while the player prop coming from DB is a string. If any part of the code ends up saving a non-JSON string (or the UI rehydrates from a stale player object after refresh), it will look like it didn’t persist.

The fastest way to make this bulletproof is:
1) Ensure we ALWAYS write JSON string to DB.
2) Make parsing robust to multiple formats (JSON string, string array, comma-separated string).
3) Make the post-save “refresh source of truth” consistent (either re-fetch the player row, or update the same canonical field type across the app).

### C) “No Team Selection” + wrong kit on /calendar is very likely a bug in the teamId being passed
In `CalendarEventsMobile.tsx`, `MobileTeamSelectionView` is invoked with:
```tsx
teamId={teams?.[0]?.id || ''}
```
…but:
- `teams` here comes from `useClubContext()` (filteredTeams), not necessarily the currently selected team.
- The page already has `currentTeam` from `useTeamContext()` but doesn’t use it here.
- If `teamId` doesn’t match the event’s real team context, the Team Selection loader will query the wrong team and show “No Team Selection” (and can show the wrong kit).

This aligns perfectly with your report: “even when a squad has been selected, it shows no team selection and shows the wrong kit”.

### D) “Profile fetch failed: canceling statement due to statement timeout”
This toast is emitted by `AuthContext.fetchProfile()`.

Although the toast text says “Profile fetch failed”, the timeout can be caused by ANY of the parallel auth boot queries (profile, teams, clubs, connected players) creating load and/or doing heavy joins. In `fetchConnectedPlayers`, the query currently pulls `teams!inner(*)` (all team columns), which can be large and slow (kit designs, JSON fields, etc.). On mobile networks, this is a prime candidate for statement timeouts.

We should:
- Reduce columns in the heaviest embedded queries
- Add missing indexes on linking tables (user_players.user_id, user_teams.user_id, user_clubs.user_id, etc.)
- Improve error handling so a single slow query doesn’t spam the user or break context.

---

## Implementation approach (what I will change)

### 1) Fix the mobile image editor interaction (most urgent UX blocker)

#### 1.1 Portal into the correct Radix portal (pick the active/latest one, not the first)
Update `MobileImageEditor.tsx`:
- Use `document.querySelectorAll('[data-radix-portal]')` and choose the **last** element (most recently created portal, most likely the active dialog).
- Fallback to `document.body` if none found.

#### 1.2 Ensure the overlay explicitly allows pointer events
Add `pointer-events-auto` (or inline `style={{ pointerEvents: 'auto' }}`) on the editor root container.
This protects against inherited `pointer-events: none` from modal layering edge cases.

#### 1.3 Add Pointer Events fallback in addition to Touch Events (cross-device reliability)
Some environments behave differently with `touchstart/touchmove` + `preventDefault()`. We will:
- Keep the current touch handlers
- Add `onPointerDown/onPointerMove/onPointerUp` equivalents and a small state machine for drag
- For pinch: keep touch-only (pointer events don’t carry multi-touch in the same way), but ensure drag works universally

Verification:
- Can pinch/zoom on iOS and Android
- Can drag
- Can tap Save/Cancel immediately

Files:
- `src/components/players/MobileImageEditor.tsx`

---

### 2) Make play styles truly persistent + robust across reloads

Even though we previously adjusted parsing in the card, the persistence issue can still happen if:
- Any save path writes a non-JSON string
- The UI rehydrates from stale player data
- Parsing fails for a format that slipped in historically

#### 2.1 Harden parsing in `FifaStylePlayerCard`
Update `parsePlayStyles` to support:
- JSON string array: `["finisher","speedster"]`
- Plain array (already supported): `["finisher","speedster"]`
- Comma-separated fallback: `"finisher,speedster"`

This ensures that even “bad legacy values” still display, and users can re-save to normalize.

#### 2.2 Normalize what we store and what we keep in local state
In both `DashboardMobile.tsx` and `PlayerManagementMobile.tsx`:
- Continue to store `play_style: JSON.stringify(playStyles)`
- But also update local state so `player.playStyle` becomes the SAME format the DB returns (string), to avoid mixed typing and hydration weirdness:
  - set local `playStyle` to the JSON string, not an array
  - `parsePlayStyles` already handles string

This avoids “looks saved until reopen/refresh, then disappears” type issues.

#### 2.3 Optional (recommended): re-fetch the updated player row after save
Instead of trusting local state, after saving play styles:
- perform a follow-up `select('play_style')` for that player id
- set local state from the returned value
This removes any ambiguity about what actually persisted.

Files:
- `src/components/players/FifaStylePlayerCard.tsx`
- `src/pages/DashboardMobile.tsx`
- `src/pages/PlayerManagementMobile.tsx`

Verification:
- Pick 1–3 play styles → close card → reopen: still there
- Hard refresh → still there

---

### 3) Fix “No Team Selection” + wrong kit on Calendar Event Details

#### 3.1 Pass the correct teamId into `MobileTeamSelectionView`
Change in `CalendarEventsMobile.tsx`:
- Replace `teamId={teams?.[0]?.id || ''}` with:
  - Prefer `selectedEvent.team_id` (the event’s canonical team)
  - If the app supports multi-team events, use the event’s `team_id` for selection fetching, and use `currentTeam` only for display filtering
- Use the same correction for both places where `MobileTeamSelectionView` is rendered (expanded and inline event details).

This should immediately fix:
- “No Team Selection” when selections exist
- Wrong kit rendering (because kit should be derived from the event’s team)

Files:
- `src/pages/CalendarEventsMobile.tsx`

Verification:
- Open an event you know has a squad selection → it should show the selection immediately
- Kit shown matches that team

---

### 4) Reduce / eliminate the “Profile fetch failed: statement timeout” errors

This likely stems from heavy parallel auth boot queries (especially embedded joins). We’ll address in two layers:

#### 4.1 Reduce columns in the most expensive auth queries
In `AuthContext.tsx`:
- `fetchConnectedPlayers` currently selects `teams!inner(*)` which is very heavy.
- Replace with a minimal subset of team columns actually needed for UI context (id, name, club_id, kit_icons, logo_url, game_format, subscription_type, header display fields).
- Keep player columns minimal too.

This reduces payload size and query planning complexity.

#### 4.2 Add missing indexes on linking tables (DB migration)
Add indexes (concurrently if allowed, otherwise normal) on:
- `user_players(user_id)`
- `user_players(player_id)`
- `user_teams(user_id)`
- `user_teams(team_id)`
- `user_clubs(user_id)`
- `club_teams(club_id)`
- `event_selections(event_id, team_id)` (and optionally `(event_id, team_id, team_number, period_number)` if that’s the common filter)

These indexes commonly eliminate statement timeouts in “lookup by foreign key” workloads.

#### 4.3 Improve error messaging so we don’t mislabel timeouts as “profile fetch failed”
In `fetchProfile`:
- If the error message includes `statement timeout`, show a more accurate toast like:
  - “Connection is slow, loading your account is taking longer than expected. Retrying…”
- Optionally retry once with a short delay.

Files:
- `src/contexts/AuthContext.tsx`
- DB migration under `supabase/migrations/*`

Verification:
- Navigate around calendar/event details without seeing the timeout toast
- AuthContext loads profile/teams/connected players consistently on mobile networks

---

## Rollout / validation sequence
1) Fix CalendarEventsMobile teamId wiring (fast win for wrong kit + “No Team Selection”).
2) Fix MobileImageEditor portal selection (choose last portal) + pointer-events auto + pointer fallback.
3) Harden play styles storage/local state normalization.
4) Reduce AuthContext query weight + add DB indexes to stop statement timeouts.

---

## What I will need from you (non-technical)
Nothing required to start implementing, but after changes:
- Please retest:
  1) Open FIFA card → upload photo → pinch/drag → Save/Cancel
  2) Select play styles → close/reopen card → refresh page
  3) Open the same event on Calendar that already has a selection → confirm selection + kit

---

## Technical notes (for maintainability)
- We will not store images in the database; only store `photo_url` pointing to Supabase Storage.
- Index changes are safe and non-destructive; they only speed up reads.
- The portal “last radix portal” approach is a standard fix when multiple Radix portals exist (toaster, dialogs, nested dialogs).

