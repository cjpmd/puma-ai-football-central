

## Plan: Unified Glass Design System Across Mobile Pages

The reference screenshots use a **dark purple gradient background** with **translucent glass cards** (blurred, semi-transparent surfaces) — not solid white cards. Currently many mobile pages render Tailwind defaults (`bg-card` = white) which clashes with the dark wallpaper.

This plan unifies the visual system across all mobile pages and adds proper safe-area handling for the iOS notch/Dynamic Island.

### 1. Safe-area handling (iOS notch / Dynamic Island)

`MobileHeader` currently uses `pt-[calc(theme(spacing.safe-top)+0.75rem)]`. Verify `tailwind.config.ts` defines `spacing.safe-top` as `env(safe-area-inset-top)` — if missing, add it. Also ensure:
- `index.html` has `<meta name="viewport" content="..., viewport-fit=cover">`
- Bottom nav respects `env(safe-area-inset-bottom)` (already partially handled via `safe-bottom`)
- Header reserves enough top space (~44–50px) for status bar — increase to `pt-[calc(env(safe-area-inset-top)+1rem)]` minimum on devices with notches

### 2. Glass card utility — apply across mobile pages

The `.ios-glass` utility in `index.css` already exists but isn't used in the new redesigned sections. Replace solid white surfaces with glass surfaces on these mobile pages:

**Matches (`CalendarEventsMobile.tsx`)**
- Mini month grid container → glass surface (purple-tinted, translucent), white text
- Event row cards → glass purple gradient cards (matching screenshot 275/278): keep date column, accent bar, but switch backgrounds to `bg-white/8 backdrop-blur` with subtle border
- Section labels ("This Week", "Past Events") → uppercase, muted white

**Squad (`PlayerManagementMobile.tsx`) — list view**
- List rows currently use `from-primary/90 to-primary` solid purple. Match screenshot 276 exactly: lighter purple translucent rows (`bg-white/8` with purple tint), white player name, muted subtitle, colored avatar circle, availability dot, chevron
- Cards/List toggle pill → glass background, active segment white pill with purple text
- Top action buttons (Add Player / Codes / Staff / Medical) → glass surface with white icons

**Home (`DashboardMobile.tsx`)**
- "All caught up!" banner, "Active Team" selector, "Your Players" chip row, "Quick Actions" rows → all glass surfaces (translucent over purple wallpaper) instead of solid white
- Action row icons keep their colored circular badges (those look correct)
- Greeting "Home" / date in white at top with avatar pill on the right

**Training (`TrainingMobile.tsx`)**
- Weekly Load card, Today's Session card, Upcoming list rows → glass surfaces matching screenshot 278

### 3. Reusable approach

Add (or use existing) two utility classes consistently:
- `.ios-card` — `rounded-2xl bg-white/8 backdrop-blur-xl border border-white/10 text-white` (for general cards)
- `.ios-card-strong` — same but `bg-white/12` for hero/highlight cards

Replace `<Card>` shadcn usages on these mobile pages with simple `<div className="ios-card">` so they don't pick up the white `bg-card` token. Keep shadcn Card for desktop/non-mobile pages.

### 4. Text color discipline

Inside dark glass cards, all text must default to white/light:
- Primary: `text-white`
- Secondary: `text-white/70`
- Muted/labels: `text-white/50` uppercase tracking
Audit each modified mobile page for `text-foreground` / `text-muted-foreground` / `text-gray-*` and swap appropriately.

### 5. Files to modify

| File | Change |
|------|--------|
| `tailwind.config.ts` | Confirm/add `spacing.safe-top` & `safe-bottom` using `env()` insets |
| `index.html` | Ensure `viewport-fit=cover` |
| `src/index.css` | Add `.ios-card` and `.ios-card-strong` helper classes |
| `src/components/layout/MobileHeader.tsx` | Increase top padding for notch/Dynamic Island clearance |
| `src/pages/DashboardMobile.tsx` | Convert white cards → glass cards; restyle Active Team, Players chips, Quick Actions |
| `src/pages/PlayerManagementMobile.tsx` | Restyle list-view rows to match screenshot 276; glass top action buttons; glass toggle pill |
| `src/pages/CalendarEventsMobile.tsx` | Glass mini month grid; glass event row cards |
| `src/pages/TrainingMobile.tsx` | Apply glass surfaces to Weekly Load, Today's Session, Upcoming cards |

### 6. Out of scope

- Bottom-nav redesign (separate request — current nav stays as-is)
- Real progress rings on Home "Today" card and Team Form sparkline (requires data plumbing — placeholder UI only if needed; this PR focuses on backgrounds/glass styling)
- Desktop pages — only mobile (`*Mobile.tsx`) views are touched

### 7. Visual reference summary

- **Background**: dark purple gradient (already on `MobileLayout`)
- **Cards**: translucent white-on-purple (`bg-white/8` + `backdrop-blur-xl` + thin white border)
- **Text on cards**: white primary, white/70 secondary, white/50 labels
- **Active accent**: `oklch(0.58 0.19 295)` purple already in the palette
- **Status bar safe-area**: respected via `env(safe-area-inset-top)`

