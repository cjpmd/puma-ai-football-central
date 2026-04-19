

## Plan: Calendar Mini-Grid + Training Page Redesign (Mobile)

The reference screenshots (image-274) show two distinct designs:
- **Calendar (Matches)**: a compact month grid at the top with selected/today/dotted-event days, then a "This Week" list of events below
- **Training**: a hero "Weekly load" chart card, a "Today's Session" highlight card, and an "Upcoming" list

You've asked for the Calendar to use a **smaller** date grid so the events list gets more space.

### 1. Calendar page — `src/pages/CalendarEventsMobile.tsx`

**Add a compact month grid at the top** (replacing nothing — sits above the existing pending-availability + grouped event list):

- Header: month name (e.g. "April 2026") with a small `+` create button on the right (only when `canCreateEvents()`)
- 7-column grid (M T W T F S S) with single-digit day cells, ~28px tall — much smaller than a standard `<Calendar />`
- Each day cell:
  - Today → outlined ring
  - Selected day → filled primary background
  - Days with events → small dot below the number
  - Past days → muted
- Tapping a day either:
  - Filters the list below to that day, OR
  - Scrolls to that day's section (TBD — I'll go with **filter** since it's cleaner)
- A "Show all" pill clears the filter

**Existing event list stays** but gets the saved space:
- Keep current grouped sections (This Week / Next Week / etc.)
- Keep the date-column + colored-accent + title card design (already matches the screenshot's "This Week" look closely)
- When a day is selected in the grid, hide the period headers and just show that day's events (or "No events on this day")

**Build it as a small inline component** inside `CalendarEventsMobile.tsx` (no new file needed) — uses `date-fns` (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `getDay`, `isSameDay`, `isSameMonth`).

**Month nav**: left/right chevrons either side of the month label to page months. Defaults to current month.

### 2. Training page — `src/pages/TrainingMobile.tsx`

Currently a 3-tab page (Library / Plans / Sessions). The reference shows a feed-style training home. Redesign the default landing into a **scrollable feed** with the existing tab functionality moved into a secondary access point:

**New top section (above tabs)**:
1. **Week summary card** — "Week N · X of Y sessions" header + "Weekly load: Optimal" + a 7-bar mini-chart (M–S), built from sessions on the team's calendar this week. Acute:Chronic ratio shown if computable, otherwise hidden.
2. **Today's Session card** — picks the next training event today (or next future training if none today). Shows time · location · duration, title, description, and a `Start` action that navigates to that event's training plan view. Hidden if no upcoming training.
3. **Upcoming list** (next 3 training events) — same compact horizontal card style as the Calendar list (date column + title + time/location), tap → navigate to event details.

**Tabs section stays below** for Library / Plans / Sessions so existing functionality isn't lost — collapsed by default into a "Manage drills & plans" disclosure or kept visible as the secondary tabs (I recommend keeping the tabs visible but below the new feed so power-users still have access).

**Data sources**:
- Pull training events via `supabase.from('events').select().eq('event_type','training').in('team_id', teamIds)` for the current week + next 7 days
- Bar chart heights = duration of each day's training session(s); inactive days = empty bars
- "Weekly load" label is a simple bucket: 0–1 sessions = Light, 2–3 = Optimal, 4+ = High

### 3. Out of scope (call out for later if wanted)

- Real acute:chronic workload ratio (needs a workload tracking table)
- The redesigned bottom-nav style from the screenshot (Home / Squad / Matches / Training / Profile with the active pill background) — current nav already works but doesn't match exactly. Tell me if you want that polished too.
- Replacing the Calendar/Training designs across **all** views — this plan only updates the mobile pages

### Files to modify

| File | Change |
|------|--------|
| `src/pages/CalendarEventsMobile.tsx` | Add compact month-grid component above the event list; add selected-day filter |
| `src/pages/TrainingMobile.tsx` | Add Weekly load card, Today's Session card, Upcoming list above the existing tabs |

### What stays the same

- All event details modal, post-game editor, team selection flow on Calendar
- Drill library, plans dashboard, drill creator on Training
- Pending availability banner at the top of Calendar
- Routing, auth, role permissions

