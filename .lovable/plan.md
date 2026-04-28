# Mobile Event UX & Multi-Team Visibility Fix

Three related issues across the mobile event flow.

## 1. Edit Event – Inconsistent box widths & wasted space

The "Time Settings" card and the nested "Team-Specific Times" card both apply `p-3 sm:p-4`, so the team boxes sit inside a doubly-padded panel. That makes the inner time inputs look narrower than the End Time input above. Mobile also has very tall stacking because the Team N rows render as `grid-cols-1` (each label/KO/meeting on its own row).

### Changes in `src/components/events/EventForm.tsx`
- Replace the nested `Team-Specific Times` panel styling so it's no longer a second bordered/padded card on mobile. Use `p-0 sm:p-4` plus a thin top border separator, OR drop the inner border on mobile (`border-0 sm:border bg-transparent sm:bg-muted/30 p-0 sm:p-4`).
- Make every input across both blocks share the same width container — wrap each input in a `min-w-0 w-full` div with consistent `h-10` height.
- Compact each team's row on mobile: change `grid-cols-1 md:grid-cols-3` to `grid-cols-2` on mobile (KO + Meeting Time side-by-side) with the "Team N" label sitting above as a small header (`text-xs uppercase text-muted-foreground`) instead of a third stacked row.
- Reduce vertical rhythm: `space-y-3` → `space-y-2` between teams, tighten card paddings to `p-3` and remove the redundant helper text under Default Start Time on mobile (`hidden sm:block`).

Result: End Time, Default Start Time, KO, and Meeting Time inputs all align to the same width; two teams fit on screen without scrolling.

## 2. Event Details – Team Selection only shows 1 team

`MobileTeamSelectionView` already renders multi-team tabs, but it only builds entries from rows in `event_selections`. When a second team has scores recorded but no `event_selections` row (the case in the screenshot — Messi has a selection, "Team 2" only has a score), it never appears.

### Changes in `src/components/events/MobileTeamSelectionView.tsx`
Mirror the synthesis logic already used in `MyTeamMobile.tsx`:
- After loading `event_selections`, also read `event.scores` and the team's `performance_categories` (ordered by name).
- Detect every `team_N` key present in scores via `/^team_(\d+)$/`.
- For any `team_N` without an `event_selections` row, push a synthesized `TeamSelection` entry:
  - `teamNumber = N`
  - `performanceCategory = orderedCategories[N-1]?.name ?? \`Team ${N}\``
  - `periods: []`, `squadPlayers: 0`, `formation: undefined`, `staffIds: []`
- Sort the merged array by `teamNumber` so tabs render in order.
- The empty-state currently triggers when `teamSelections.length === 0`; with synthesis, the second team will render its tab, an "Edit / Open Team Manager" button, and a small note ("No squad selected yet") in place of the captain row when `periods.length === 0`.

Result: Both teams appear as tabs in the Team Selection card; tapping each opens the team manager for that team_number.

## 3. Post-Game Report – only shows 1 team

`PostGameEditor.loadTeamSelections` builds the list strictly from `event_selections`. Same root cause as #2.

### Changes in `src/components/events/PostGameEditor.tsx`
- After loading `event_selections`, also fetch `performance_categories` for `event.team_id` ordered by name.
- Scan `event.scores` for `team_N` keys and add synthesized `TeamSelection` entries for any team number missing from `uniqueTeamsMap`:
  - `teamNumber = N`
  - `performanceCategoryName = orderedCategories[N-1]?.name ?? \`Team ${N}\``
  - `players: []` (POTM dropdown will be hidden for synthesized teams since the existing code already gates POTM on `team.players.length > 0`).
- Keep the existing sort by `teamNumber`.

Result: Match Results card renders one block per scored team (Messi 5–2, Team 2 5–8 etc.), each with its own score inputs and outcome badge. POTM dropdown only appears for teams that have a real squad selection — matching current behaviour for teams that do.

## Files to edit
- `src/components/events/EventForm.tsx` (layout/spacing only)
- `src/components/events/MobileTeamSelectionView.tsx` (synthesize teams from scores)
- `src/components/events/PostGameEditor.tsx` (synthesize teams from scores)

No DB changes, no new components.
