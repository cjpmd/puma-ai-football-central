## Manage Teams modal — fit mobile screen

The Manage Teams dialog (`YearGroupManagement.tsx` → `TeamManagementContent`) overflows the 390px viewport because each row contains too many fixed-width children (team name + age + Linked badge + 128px "Move to..." Select), and the year-group info card title row doesn't constrain.

### File: `src/components/clubs/YearGroupManagement.tsx`

**1. Outer container**
- Change wrapper from `space-y-6` → `space-y-3 min-w-0` so flex children can shrink.

**2. Year Group Info card (top card with name/format/description)**
- Tighten `CardHeader`: `p-3 pb-2`.
- Title row: add `min-w-0`, shrink icon to `h-4 w-4`, `truncate` the name, mark format badge `flex-shrink-0` and reduce to compact size (`text-[10px] px-1.5 py-0 h-5`).
- Description: add `break-words`, drop "per team" to keep one line, smaller `text-xs`.

**3. "Currently Assigned Teams" rows**
- Replace the 128px-wide `Select` ("Move to...") with a compact `MoreVertical` `DropdownMenu` (h-7 w-7), matching the pattern already used in `ClubTeamLinking.tsx`. Items:
  - Submenu "Move to year group" listing other year groups
  - "Remove from year group" (destructive)
- Make age suffix `hidden xs:inline` style — hide on very narrow widths via `hidden [@media(min-width:360px)]:inline` (or simpler: `truncate` parent + drop the separate flex item, append age to the same span).
- Simplest fix: collapse name + age into one truncating span: `{team.name} <span className="text-muted-foreground">· {team.age_group}</span>` inside a single `truncate` block.
- Keep "Linked" badge but make icon-only on narrow screens (text `hidden sm:inline`).

**4. "Unassigned Teams" rows**
- Same single-truncating-span treatment for name+age.
- "Unassigned" badge: text `hidden sm:inline`, keep visual color hint.
- Keep Assign button but icon-only on narrow screens (label `hidden sm:inline`).

**5. "Teams in Other Year Groups" rows**
- Same name-collapse + truncate.
- Year-group badge: truncate, max-width.
- "Move here" button label `hidden sm:inline`, icon-only otherwise.

### Out of scope
- No data/logic changes.
- No changes to the parent `ClubTeamLinking.tsx` view.

Single file edited: `src/components/clubs/YearGroupManagement.tsx`.
