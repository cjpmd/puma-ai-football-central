## Club Management — Teams & Year Group UI Refinement

Two files are in scope:
- `src/components/clubs/ClubTeamLinking.tsx` — Club Management → Teams tab
- `src/components/clubs/YearGroupManagement.tsx` — Year Groups → Manage Teams modal

### 1. Club Management → Teams tab (`ClubTeamLinking.tsx`)

**Add a "Linked" indicator pill on each team row**
- Add a small pill next to the team name on every linked team row (both in the Unassigned and per-year-group sections).
- Pill: `Badge` variant `secondary` with a `Link2` (lucide) icon + label "Linked", using existing semantic tokens (no hard-coded greens). Subtle, informational only.

**Condense the team row boxes**
- Reduce row padding from `p-2 sm:p-3` → `px-2.5 py-1.5`.
- Drop the `flex-col sm:flex-row` stack — keep a single horizontal row at all breakpoints (name+meta on left, action button on right). Year group/age group already short enough.
- Collapse the two-line team name + age group into a single line: `Team Name · U12` (smaller muted suffix).
- Action `MoreVertical` button: `h-7 w-7` instead of `h-8 w-8`.
- Reduce inter-row gap `space-y-2` → `space-y-1.5`.

**Collapsible year-group sections**
- Wrap each year-group `Card` (the `assignedTeams.map` loop) in a Radix `Collapsible` (`@/components/ui/collapsible` — already used elsewhere).
- Header (`CardHeader`) becomes the `CollapsibleTrigger`: clickable row showing year-group name, format badge, team count, and a `ChevronDown` that rotates 180° when open.
- `CardContent` becomes `CollapsibleContent`.
- Default state: **expanded** when ≤3 year groups total, **collapsed** when >3 (so heavy clubs see a clean overview).
- Persist open/closed per year-group in component state (`Record<string, boolean>`).
- Apply the same collapsible pattern to the "Unassigned Teams" warning card so it can also be folded away.

**Tighten card chrome**
- Reduce `CardHeader` from `p-3 sm:p-4 pb-2` → `p-3 pb-2` (already mobile-tight; remove the desktop bump that adds visual weight on phones).
- Reduce gap between year-group cards `space-y-6` → `space-y-3`.

### 2. Year Groups → Manage Teams modal (`YearGroupManagement.tsx`)

This is the screen in the user's second screenshot with off-scheme green/yellow tinted boxes.

**Replace off-scheme backgrounds with the app design tokens**
- "Currently Assigned Teams" rows (line 468): remove `bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800`. Use the standard glass row style consistent with `ClubTeamLinking`: `border border-white/10 bg-white/[0.04] rounded-lg`. Replace the green "Assigned" badge with the same `Linked` pill (Badge `secondary` + `Link2` icon).
- "Unassigned Teams" rows (line 521): remove yellow tint. Use the same neutral row style; keep the `Unassigned` badge but switch to `variant="outline"` with `text-amber-300/border-amber-400/30` tokens (semantic warning, no flat color block) — or simply `variant="secondary"` with an `AlertTriangle` icon to stay fully on-scheme.
- "Teams in Other Year Groups" rows already neutral — leave structure, only condense.
- "Assign" button (line 534): drop `bg-green-600 hover:bg-green-700`; use default primary button so it follows theme.

**Condense rows (same recipe as section 1)**
- Row padding `p-3` → `px-2.5 py-1.5`.
- Single-line name + muted age group suffix; no stacked layout on mobile.
- "Move to..." `Select` shrinks to `h-7 w-32 text-xs`; only renders on rows that need the move action (use a `MoreVertical` dropdown with "Move to year group" submenu + "Remove" item — matches the pattern already established in `ClubTeamLinking.tsx` for consistency).
- `Card` headers tighter: `p-3 pb-2`; outer `space-y-*` between cards reduced.

### Out of scope
- No data-model changes; all teams shown here are already linked (filtered by `team.club_id === clubId`), so the "Linked" pill is purely a visual affordance the user requested.
- No changes to dialogs/forms (Edit year group, Create team) — only list rows and card chrome.

### Files to edit
- `src/components/clubs/ClubTeamLinking.tsx`
- `src/components/clubs/YearGroupManagement.tsx`
