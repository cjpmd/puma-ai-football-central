

## Plan: Squad List View, Fix Outline Button Styling, Compact Home with Team Dropdown

### 1. Squad — Add List View Toggle (mobile `PlayerManagementMobile.tsx`)

Add a **Cards / List** view toggle directly above the player count badge. Default to Cards (current FIFA-style).

**List view design** (matching screenshot 271 — purple gradient rows):
- One row per player, full-width
- Left: round avatar (photo or initials/squad number) with kit-color or position-color background
- Middle: Player name (respecting `nameDisplayOption` from team settings — last-name-first style works), `#squadNumber · Form XX` line below
- Right: small sparkline/trend mock OR availability dot, then chevron `>`
- Tapping the row opens the same `PlayerActionSheet` already used by FIFA cards (so player settings remain accessible)
- Optional grouping header by position type (Goalkeepers / Defenders / Midfielders / Forwards) — using `player.type` (goalkeeper vs outfield) for now; future-proof for full position groups
- View preference saved to `localStorage` (`squad-view-mode: 'cards' | 'list'`) so it persists per device

### 2. Fix White Icon Buttons (screenshot 272)

The "Codes / Staff / Medical" `variant="outline"` icon buttons render white-on-white because the outline variant's text/icon color isn't being applied on the dark themed mobile surface. Two changes:
- Add explicit `text-foreground` to those three outline buttons so the icon is visible at rest, not just on hover
- Verify against both light and dark surfaces

(The issue is that `variant="outline"` uses `bg-background` + default text color, but icon-only `<Key/>`, `<UserPlus/>`, `<Heart/>` inherit color and the dark mobile surface isn't being read correctly. Adding `text-foreground` makes the Lucide icons explicitly use the readable foreground color.)

### 3. Home Screen — Collapse Teams List into Dropdown (`DashboardMobile.tsx`)

Currently lines 722–781 render every team as a full-height row in a card, eating vertical space. Replace with a single compact selector:

- Single row showing **current selection** (team logo + name, or "All Teams") with a chevron-down
- Tapping opens a dropdown/sheet listing: "All Teams" + every team with logo + checkmark for the active one
- Same `setCurrentTeam` / `setViewMode('all')` handlers reused — no behavior change, just collapsed UI
- Frees up vertical space so the dashboard better matches the inspiration screenshots (270, 273) with prominent next-match / today's training cards

Implementation: use existing shadcn `Select` or a `Sheet` for a more native feel. Sheet preferred on mobile since the inspiration screens use bottom-sheet patterns.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/PlayerManagementMobile.tsx` | Add cards/list toggle, list view rendering, fix outline button text color |
| `src/pages/DashboardMobile.tsx` | Replace expanded teams list with compact selector + sheet |

### What Stays the Same

- All FIFA card behavior, action sheet, player edit modals
- Dashboard data loading, availability banners, quick actions, connected players chips
- Other home-screen sections (Next Match, Today, Team Form ideas from screenshots are separate future work — this PR only collapses the teams list)

### Out of Scope (call out for follow-up if desired)

- Building the new "Next Match", "Today" rings, "Team Form" cards from screenshots 270/273 — that's a larger redesign
- Sparkline form trends in the list view (will use a static placeholder/availability dot for now)
- Position-group sorting (Defenders/Midfielders/Forwards) — needs a `position` field on player; for now group by GK vs Outfield only

