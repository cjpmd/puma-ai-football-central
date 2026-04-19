

## Plan: Redesign Team Selection Manager — Squad / Staff / Formation Tabs

Restructure the Team Selection screen to match the attached Claude design, unifying it with the rest of the mobile glass design system.

### 1. New page-level layout (replaces current `TeamSelectionManager` modal contents on mobile)

Top header block (inside the dialog/page, glass styled, on the dark purple gradient):
- Back chevron (left), "TEAM SELECTION" eyebrow + team name (centre), `+` action (right)
- **Opponent line** under the title (e.g. "vs Riverside FC · H") — currently buried in event details
- **Period switcher pill** — `< Matchday 14 · Sat >` style chips (re-uses the period nav already in `GameDayStyleFormationEditor`, lifted up to the header)

Hero row (Formation tab only, hidden on Squad/Staff):
- Left stat: `15 — Avg last 5`
- Centre **glass card** (purple-tinted, prominent): `36 — Projected pts` + `Formation 3-4-3` chip
- Right stat: `93 — Season best`
- Space to the **left of the Projected Pts card** reserved for a **Performance Category** chip (e.g. "A Team", colour-coded), reading from the team's performance categories

### 2. Tab bar — Squad / Staff / Formation

Replace today's separate flows with a single segmented control under the hero:
- **Squad** — list of selected match-day players (uses the same glass row design as `PlayerManagementMobile.tsx` list view: shirt avatar, name, position abbr · squad number · availability dot, chevron). Tap a row → existing player action sheet.
- **Staff** — same glass row design for assigned coaches/managers (icon avatar, name, role badge, availability). Tap → existing staff edit/availability controls.
- **Formation** — current `GameDayStyleFormationEditor` content but restyled (see §3). Includes Pitch / List sub-toggle (matching screenshot 282) so users can flip between the pitch view and a position-grouped list (GOALKEEPER / DEFENDERS · n / MIDFIELDERS · n / FORWARDS · n).

The existing `AvailabilityDrivenSquadManagement` already wires squad ↔ formation; we'll keep its data layer and just re-skin + re-organise into these three tabs.

### 3. Formation tab visual updates

- **Pitch background**: keep `FPLPitch` but render inside a glass card (`.ios-card`) so it sits on the purple gradient cleanly (no white panel)
- **Player tokens**: keep `FPLPlayerToken` but show **two-line label** under the shirt — `Name` (white) on line 1 and `position abbr · squad #` (white/60) on line 2, matching screenshot 282
- **Bench**: convert `GameDayStubstituteBench` / `SubstituteBench` to the same glass card style as the pitch (no white background); header reads `BENCH · n` with a `drag to swap` hint on the right
- **List sub-view** (new): position-grouped glass rows; each row shows shirt avatar, name, `POS · squad # · AST/HOM` meta, projected pts pill on the right, drag handle

### 4. Squad & Staff tabs — consistent design

- Reuse `.ios-card` translucent rows from `PlayerManagementMobile.tsx`
- Squad rows: shirt avatar (kit colour), name, `position · #squad` meta, availability dot, chevron
- Staff rows: role-icon avatar, name, role badge (Manager / Coach / Physio…), availability dot, chevron
- Empty states: glass card with muted-white copy

### 5. Files to modify

| File | Change |
|------|--------|
| `src/components/events/TeamSelectionManager.tsx` | Replace contents: header + hero + Squad/Staff/Formation tabs wrapper |
| `src/components/events/AvailabilityDrivenSquadManagement.tsx` | Split internal sections into the three tab panels; expose period switcher to the header |
| `src/components/events/GameDayStyleFormationEditor.tsx` | Re-skin pitch + bench to glass; move period nav out (now lives in header); add Pitch/List sub-toggle |
| `src/components/events/SubstituteBench.tsx` (and/or `GameDaySubstituteBench.tsx`) | Glass background, white text, "drag to swap" hint |
| `src/components/events/FPLPlayerToken.tsx` (label area) or wrapper in formation editor | Two-line label (name + pos·#) under the shirt |
| `src/components/events/PlayerSelectionPanel.tsx` (or new lightweight Squad list) | Glass row design for the Squad tab |
| `src/components/events/StaffSelectionSection.tsx` | Glass row design for the Staff tab |

### 6. Data sources (already available — no schema changes)

- Performance Category: from `players.performance_category` / team's `performance_categories` table → renders coloured chip
- Opponent: from `events.opponent`
- Projected pts / Avg last 5 / Season best: **placeholder values for now** (no analytics table yet) — will render visually but flagged as "—" until real metrics are wired

### 7. Out of scope (call out for later)

- Real "Projected pts / Avg last 5 / Season best" calculations (needs a player/team performance metrics service — placeholder UI only this round)
- Drag-to-swap interactions in the new List sub-view (Formation list will show order but not yet support reordering — pitch view keeps existing dnd-kit behaviour)
- Desktop redesign — only mobile variant updated this round

