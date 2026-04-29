## Goal

Add two new collapsible cards to the My Team analytics page (`/my-team`):

1. **Attendance Breakdown** — appearances broken down by event type, with counts and percentages, plus a captain count.
2. **Game Day Stats** — aggregate goals, assists, saves, yellow cards, red cards, sourced live from the `match_events` table so any new event type added in Game Day automatically flows through.

Both respect the currently selected season and the existing category / event-type filters.

## What you'll see

**Attendance card** (collapsed by default, tap header to expand):
- Total appearances number at the top
- Per-event-type rows (Fixtures, Friendlies, Tournaments, Festivals, Training, etc.) showing `count` and `%` of total appearances
- Bottom row: "Captain appearances: X" with a small captain icon

**Game Day Stats card** (collapsed by default):
- Grid of stat tiles for every event type recorded in `match_events` for the season:
  Goals, Assists, Saves, Yellow Cards, Red Cards, plus any future types (e.g. own goals, penalties) — driven dynamically from the data so nothing has to change here when Game Day adds a new event type.
- Each tile shows icon, count, label.

## Technical notes

**File touched:** `src/pages/MyTeamMobile.tsx` only. No DB changes needed — all data already exists in `event_player_stats` (appearances, captain) and `match_events` (goals/assists/saves/cards).

**Data fetching** (extends existing `loadAnalyticsData`):
- `event_player_stats`: already loaded; extend select to include `event_id` so we can join back to `events.event_type`. Aggregate per event_type to count appearances. Sum `is_captain = true` for captain count.
- `match_events`: already loaded; group by `event_type` dynamically (no hardcoded list) to build the Game Day stats grid. Map known types to friendly labels + icons; unknown future types fall back to a title-cased label and a default icon.

**Collapsible UI:** use the existing `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` primitives (`src/components/ui/collapsible.tsx`) wrapped in the existing `Card` style used elsewhere on this page. Default state: collapsed. Chevron rotates on open.

**Filtering:** both cards recompute when `selectedCategory` / `selectedEventType` / `selectedSeason` change, matching how the existing W-D-L card behaves.

**Future-proofing Game Day:** the Game Day stats grid iterates over `Object.keys(groupedByType)` from `match_events` rather than a fixed list, so any new `event_type` value introduced by Game Day automatically appears here with no code change. A small `EVENT_TYPE_META` map provides icon/label for known types; unknowns get a generic icon and a humanised label.

## Out of scope

- No changes to Game Day recording UI.
- No new DB columns or migrations.
- No changes to desktop `/my-team` (this page is mobile-only via routing).
