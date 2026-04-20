

## Plan: Fix "Failed to add team" + "+" button overflow

### Issue 1 — Failed to add team (data bug)
`handleAddTeam` in `src/pages/CalendarEventsMobile.tsx` (line 592-636) uses the wrong team ID and a column that doesn't exist on `event_selections`.

Problems:
1. Uses `teams[0].id` (the user's first team in their list) instead of the event's actual team — causes RLS denials and inserts against the wrong team.
2. Inserts a `substitutes: []` column. The schema column is `substitute_players` (Json, nullable). `substitutes` is also a column but `NOT NULL` with no default in some rows — safer to use `substitute_players`.
3. Updates `events.teams` using the *raw* `teamNumbers` from the existing rows, but those numbers are stored as integers; `event.teams` array expects strings — current code does `teamNumbers.map(String)` correctly, but the new entry should also be appended without losing prior string entries already in `event.teams`. We should source from `selectedEvent.teams` rather than rebuild.

Fix:
- Replace `teams[0].id` with `selectedEvent.team_id` everywhere in `handleAddTeam`.
- Insert `substitute_players: []` (matches `MobileTeamSelectionView.handleDeleteTeam` which already uses this column).
- Build `newTeamsArray` from existing `selectedEvent.teams` (preserving prior values) plus the new team number as a string.
- Add a guard: only proceed if `selectedEvent.team_id` is defined; show clearer error toast otherwise.

### Issue 2 — "+" button purple ring overflows the dialog
The Plus button uses `variant="ghost"` with no border, but inherits the global focus ring from `button.tsx`:
```
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```
After click, the button retains focus → a 2px purple ring + 2px offset (4px total) appears, and because the button sits flush with the dialog's `p-6` right edge, the ring visibly exceeds the frame on mobile.

Fix (scoped, no global change):
- In `CalendarEventsMobile.tsx` change the "+" button to `size="icon"` look but explicitly pad: `className="h-8 w-8 p-0 rounded-full mr-[-4px]"` is wrong — instead add `focus-visible:ring-offset-0` and reduce to `focus-visible:ring-1`, plus give it `shrink-0`.
- Wrap header row with `pr-1` so the focus ring has room to render inside the dialog.
- As an extra safety net add `overflow-hidden` to the immediate parent of the row (the section already has it via DialogContent → already has `overflow-x-hidden`, fine).

### Files modified
| File | Change |
|------|--------|
| `src/pages/CalendarEventsMobile.tsx` | Fix `handleAddTeam` (correct team_id, correct column name, preserve teams array). Adjust the "+" button classes to keep focus ring inside the dialog. |

### Out of scope
- Global Button focus-ring changes (might affect dozens of screens — handled locally).
- DialogContent width/border behavior.
- Behaviour of `MobileTeamSelectionView` (delete already uses correct columns).

### Verification
- Open an event → Event Details → tap "+" next to Team Selection → toast "Team added successfully", a new Team 2/Group 2 chip appears.
- Tap "+" again → focus ring stays inside the dialog frame on a 390px viewport.

