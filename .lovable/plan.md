

## Plan: Finish Glass Conversion on Dashboard + Condense Header Like Reference

### 1. Finish glass conversion on `DashboardMobile.tsx`

Convert remaining white surfaces to `.ios-card` glass surfaces with white text:
- **Active Team selector** + bottom sheet contents
- **Your Players** chip row (chips → translucent white-on-purple pills)
- **Quick Actions** row
- **Upcoming Events** card
- **Recent Results** card
- Audit and replace any `bg-white`, `bg-gray-*`, `text-gray-*`, `text-foreground`, `text-muted-foreground` → white / `white/70` / `white/50`

### 2. Condense the top of the dashboard to match screenshot 281

Reference shows a tight header block:
```
Sunday, 19 April                    [avatar]
Home
```
Single column, date as small muted-white label, "Home" as a large white heading, avatar pill on the right — no separate `MobileHeader` purple bar above it (the page background already provides the gradient).

Implementation:
- The current `MobileHeader` purple gradient bar duplicates what the page wallpaper already does. On the Dashboard we'll **hide** the standard `MobileHeader` and render an inline condensed header inside the page content instead:
  - Small muted date line (`text-white/60 text-xs`)
  - Large "Home" / greeting (`text-3xl font-bold text-white`)
  - Avatar circle on the right (existing connected-player chip → use first initial)
- Saves ~60–80px of vertical space at the top, matching the reference compactness.

### 3. iOS notch / Dynamic Island clearance (re-verify)

Reference clearly shows the time (9:41) and battery/signal sitting **above** the page content, with the gradient extending behind them. To guarantee this on every mobile page:

- Confirm `index.html` has `<meta name="viewport" content="..., viewport-fit=cover">` — add if missing
- In `MobileLayout.tsx`, ensure the outer container reserves `padding-top: env(safe-area-inset-top)` so content never sits under the status bar (the gradient still extends behind status bar because it's the page background)
- For the Dashboard's inline header, add `pt-[max(env(safe-area-inset-top),1rem)]` so the date line sits below the Dynamic Island
- For pages that still use `MobileHeader`, keep the existing `max(env(safe-area-inset-top), 1rem)` rule — already correct

### 4. Files to modify

| File | Change |
|------|--------|
| `index.html` | Verify/add `viewport-fit=cover` |
| `src/components/layout/MobileLayout.tsx` | Add optional `hideHeader` prop; apply safe-area-inset-top to root container |
| `src/pages/DashboardMobile.tsx` | Hide `MobileHeader`; add condensed inline header (date + "Home" + avatar); convert remaining white cards/chips/buttons to glass |

### 5. Out of scope (next step suggestions)

- Building the actual "Next Match" hero card, "Today" rings, and "Team Form" sparkline shown in screenshot 281 — design only specifies the layout; needs separate data plumbing
- Polishing bottom-nav style (active pill background) — flagged previously, still pending

