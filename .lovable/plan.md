# Game Day improvements + Create Event title fix

## 1. Use the same kit design as the Formation tab

Currently `GameDayView` fetches `team.kit_designs` and computes `kitDesign` / `goalkeeperKitDesign`, but it does **not** pass them down to `GameDayFormationCard` → `FPLPlayerToken`, so players render with default position-coloured shirts instead of the team's kit (the Formation tab passes them in via `DraggablePitchPlayer`).

Changes:
- `src/components/events/GameDayFormationCard.tsx`
  - Add `kitDesign?: KitDesign` and `goalkeeperKitDesign?: KitDesign` props.
  - Pass them through to each `<FPLPlayerToken>` (pitch + bench renders).
  - Also forward `gameFormat` (from event) and `isMobile` so sizing matches Formation tab.
- `src/components/events/GameDaySubstituteBench.tsx`
  - Accept and forward the same kit props to its `FPLPlayerToken` instances.
- `src/components/events/GameDayView.tsx`
  - Pass `kitDesign`, `goalkeeperKitDesign`, `gameFormat={event.game_format}` into `GameDayFormationCard` and `GameDaySubstituteBench`.

Result: Game Day shirts match Formation tab exactly (same KitShirt SVG, same sizing).

## 2. Header shows opponent name only

In `GameDayView.tsx` the header currently shows: tiny "GAME DAY" eyebrow, `event.title`, then `vs {opponent}`. Replace the title block with just the opponent name (no eyebrow, no event title, no "vs" prefix). Fall back to `event.title` only when `opponent` is missing.

## 3. Persistent, shared match timer

Today `useMatchTimer` is in-memory only. If the user navigates away or locks the phone, the displayed time resets when they return (and is unique per device).

Approach: store the timer state on the event row so all viewers see the same clock and it survives navigation / app backgrounding.

- Database migration: add columns to `events`
  - `match_timer_started_at timestamptz`
  - `match_timer_paused_elapsed_seconds int default 0`
  - `match_timer_is_running boolean default false`
  - `match_timer_period int default 1`
- Rewrite `useMatchTimer` (or add a new `useSharedMatchTimer(eventId)`):
  - Read timer fields from the event row (already fetched).
  - Computed elapsed = `paused_elapsed + (is_running ? now - started_at : 0)`.
  - Tick locally every second using `Date.now()` so backgrounded tabs catch up correctly when foregrounded.
  - `start()` → update event: `is_running=true, started_at=now()`.
  - `pause()` → update event: `is_running=false, paused_elapsed = paused_elapsed + (now - started_at)`.
  - `reset()` → update event: `is_running=false, paused_elapsed=0, started_at=null`.
  - Realtime: extend `useGameDayRealtime` (already subscribes to `events` UPDATE) so any user pressing play/pause updates everyone's timer.
- RLS: add an UPDATE policy (or rely on existing event-update policy) so any user with team-staff/management access can write timer fields.

Backgrounding behaviour: because elapsed is derived from `now() - started_at`, the clock keeps "running" even when the tab is suspended or the phone is locked — when the user returns, the displayed time jumps forward to the correct value.

## 4. Confirm multi-user Game Day recording

Already true today and will continue to work after the above changes:
- `useGameDayRealtime(eventId)` subscribes to `event_selections`, `event_player_stats`, and `events` updates. Goals/cards/subs logged by one user invalidate everyone's React Query cache and re-render in real time.
- `match_events` are written through `matchEventService.createMatchEvent` → straight to Supabase, so any authorised staff member on any device can log events.
- After this change, the timer also syncs across users via the same realtime channel.

We will additionally extend the realtime subscription to invalidate on `match_events` inserts/deletes so timeline updates are instant for all viewers (currently relies on the stats/selection invalidation).

## 5. Create Event — Title no longer required

- `src/components/events/MobileEventForm.tsx`
  - Label: "Title *" → "Title".
  - Remove `required` on the title input.
  - In submit handler, if `formData.title` is blank, fall back to a sensible default before insert: e.g. for fixtures `"vs {opponent}"` (or `"Match"` if no opponent), and for trainings `"Training"`. This keeps lists/calendars readable.
- `src/components/events/EventForm.tsx` (desktop) — same change for parity.

## Technical summary

Files edited:
- `src/components/events/GameDayView.tsx` — header, pass kit/format props, use shared timer hook.
- `src/components/events/GameDayFormationCard.tsx` — accept + forward kit props.
- `src/components/events/GameDaySubstituteBench.tsx` — accept + forward kit props.
- `src/hooks/useMatchTimer.ts` — switch to event-backed shared timer (or new hook).
- `src/hooks/useGameDayRealtime.ts` — also invalidate on `match_events` changes.
- `src/components/events/MobileEventForm.tsx`, `src/components/events/EventForm.tsx` — title optional + default.

Database:
- New migration adding `match_timer_*` columns to `events` and an UPDATE policy permitting team staff to write them.
