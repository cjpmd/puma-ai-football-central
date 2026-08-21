# Show all events in the Matches calendar

## What's wrong

The Jan 10th fixture vs Riverside does exist in the database (fixture, 10 Jan 2026, Broughty team). It isn't shown because the Matches tab only ever loads events in a fixed rolling window of **3 months back to 6 months forward from today**. Today is 21 Aug 2026, so the window starts 21 May 2026 and anything earlier — including January — is never fetched.

Making it worse: paging the mini calendar back to January does not trigger any new fetch. The month grid and the event list only ever show what was loaded on mount, so older months always look empty.

## The fix

1. **Make the fetch follow the calendar month.** When the user navigates the mini calendar to a month outside the currently loaded range, extend the loaded range to cover it and refetch. Concretely: keep a loaded-range state (start/end), initialised to the current rolling window, and widen it whenever the viewed month falls outside — then reload events, selections and privacy settings for the widened range.
2. **Widen the default window** so recent history is present without navigation: 12 months back to 12 months forward on mobile, matching the more generous desktop range.
3. **Keep month navigation cheap** — don't refetch when the target month is already inside the loaded range.
4. **Raise the page cap for the grid.** The list is server-paged at 50 events ordered newest-first; the mini calendar dot map is built from the same loaded array, so a month can appear empty purely because its events sit past the page cap. Build the month grid from a lightweight query (id, date, event_type) covering the loaded range so every event in a viewed month gets a dot, independent of list paging.
5. **Selected-day list** stays as-is, but will now have the events it needs since the range covers the viewed month.

## Technical notes

- File: `src/pages/CalendarEventsMobile.tsx`
  - `loadEvents` / `loadMoreEvents` currently recompute `windowStart`/`windowEnd` from `new Date()` inline (lines ~431-438 and ~527-533). Replace both with a single shared range state so paging and month navigation agree.
  - `calendarMonth` (line 255) is only passed to the grid and never observed; add an effect that widens the range and reloads when it moves outside the loaded range.
  - The `event_selections` query filters on `events.date` with the same bounds, so it must use the shared range too.
  - Offline cache key (`eventsCacheKeyRef`) should include the loaded range so a widened fetch doesn't collide with a narrower cached payload.
- Desktop `src/pages/CalendarEvents.tsx` already uses -6/+12 months; leave it unchanged unless you also want month-driven fetching there.
- No database or RLS changes needed — the event is readable, it was simply never requested.
