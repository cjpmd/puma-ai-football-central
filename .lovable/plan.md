

## Plan: Compact, Color-Coded Calendar in Matches

Make `MiniMonthGrid` more compact and color-code event days like the screenshot (rounded "tile" highlight per event, with a coloured underline/dot indicating event type).

### 1. Compactness pass
- Reduce cell height from `h-8` → `h-7` (~12% shorter); tighten vertical paddings
- Reduce gaps (`gap-0.5` already tight — keep) and shrink internal `ios-card` padding `p-3` → `p-2`
- Drop the small "Show all" pill and instead make tapping the selected date again deselect (already supported via toggle)
- Slightly smaller header text (`text-sm` → keep, but reduce mb-2 → mb-1)

### 2. Color-coded event days (per screenshot)
Build a per-date map keyed on `yyyy-MM-dd` → list of event types occurring that day. Then for each day cell:

- If it has events, render a **rounded tile background** in the type's tint:
  - `match` / `fixture` → blue (`bg-blue-500/25 border border-blue-400/40`)
  - `friendly` → green tint
  - `training` → purple tint
  - `tournament` → orange tint
  - `festival` → amber tint
  - mixed types → neutral white tint
- Add a **single coloured dot** below the number using the same hue (matches the screenshot's small dot under each highlighted day)
- Today indicator stays as a ring; selected day uses a stronger filled tile (current behaviour)

### 3. Data wiring
- Replace the existing `eventDateSet: Set<string>` with `eventTypesByDate: Map<string, Set<string>>` (built in the same `useMemo`, fed from `filteredEvents`)
- Pass it into `MiniMonthGrid` as `eventTypesByDate`; helper `getDayTint(types)` returns the bg/dot classes (uses a small lookup table; "match" or "fixture" both map to blue)

### 4. Files to modify
| File | Change |
|------|--------|
| `src/pages/CalendarEventsMobile.tsx` | Update `MiniMonthGridProps` (`eventDates` → `eventTypesByDate`); add `getDayTint` helper; restyle day cells (tile bg + coloured dot, smaller height, tighter padding); rebuild the `useMemo` that feeds the grid |

### 5. Out of scope
- Desktop calendar (`CalendarGridView.tsx`) — separate component, not on this page
- Any change to the event list below the calendar
- New event types or schema changes

