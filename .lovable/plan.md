# Kit Rendering Engine + Formation Sizing

Replace the fragmented shirt rendering (4 different SVG/div components) with a single parametric `KitShirt` SVG, extend the kit data model with sleeve/collar/pattern, rebuild the Kit Designer around a custom hex picker, and dynamically size shirts on the formation pitch by game format so 11 players never overlap.

## Problems today

- 4 different shirt renderers exist and disagree visually: `FPLShirtIcon` (pitch token), `PlayerShirtFallback` (player cards), `EnhancedKitAvatar` and `KitAvatar` (lists), plus a CSS-only div in `KitDesigner`. The designer preview never matches the pitch.
- `KitDesign` only has shirt / sleeve / shorts / socks / single stripe colour. No collar, no pattern variants, no proper sleeve cuff.
- Designer is locked to a 12-colour `Select` dropdown — no real custom colours.
- Pitch shirts (`fpl-shirt-circle`, `w-11 h-11`) are a single fixed size regardless of game format. On 4/5/7-a-side they look small; on 11-a-side mobile they crowd and the name pills overlap.

## What we'll build

### 1. Single SVG kit engine (`src/components/shared/KitShirt.tsx`)

Parametric, scalable, drives every shirt in the app.

```tsx
type KitPattern = 'solid' | 'stripes' | 'hoops' | 'halves' | 'sash';

interface KitShirtProps {
  primary: string;        // shirt body
  secondary?: string;     // sleeves / pattern accent
  collar?: string;
  pattern?: KitPattern;
  squadNumber?: number | string;
  size?: number;          // px (driven by formation sizing)
  className?: string;
}
```

Single `viewBox="0 0 140 160"` SVG with the shape from the user's reference (wide shoulders, defined sleeves, V-collar). Patterns rendered via `<defs><pattern>` so they're crisp at any size. Squad-number contrast computed from the body fill (luminance check that already exists in `FPLShirtIcon`).

### 2. Extended kit data model

`src/types/team.ts` — `KitDesign` gains optional fields (backwards compatible, safe defaults):

```ts
interface KitDesign {
  shirtColor: string;
  sleeveColor: string;     // already exists, now actually used
  collarColor?: string;    // NEW
  pattern?: KitPattern;    // NEW — replaces hasStripes; legacy hasStripes still read on load
  stripeColor: string;     // accent color for any pattern
  shortsColor: string;
  socksColor: string;
}
```

Migration on read: if an old record has `hasStripes: true` and no `pattern`, treat as `pattern: 'stripes'`. No DB migration needed — `kit_designs` is JSONB.

### 3. Rebuilt Kit Designer (`src/components/teams/KitDesigner.tsx`)

- Replace 12-option `Select` with a proper colour input: native `<input type="color">` + a row of preset swatches + hex text field. Keeps mobile UX simple.
- New controls: Sleeve colour, Collar colour, Pattern picker (Solid / Stripes / Hoops / Halves / Sash), Accent colour (only shown when pattern ≠ solid).
- Live preview uses the new `KitShirt` component → designer matches the pitch exactly.
- "Complete Kit Collection" overview also uses `KitShirt` — same component everywhere.
- Save handler maps to the new `KitDesign` shape (writes both `pattern` and `hasStripes` for back-compat).

### 4. Replace the four legacy shirt renderers

- `FPLShirtIcon` → re-export `KitShirt` (keep filename to avoid churn) or update its 16 import sites to `KitShirt`. Pick the latter; it's a clean refactor.
- `EnhancedKitAvatar`, `KitAvatar`, `PlayerShirtFallback` → thin wrappers around `KitShirt` at appropriate sizes (xs/sm/md → 24/32/48px).
- `FPLPlayerToken` (the formation token) renders `KitShirt` instead of `FPLShirtIcon`, passes through `pattern` / `secondary` / `collar`.

### 5. Dynamic shirt size on the formation pitch

The user's key requirement: 11 players must never overlap on mobile, but with fewer players we should make better use of space.

In `DraggablePitchPlayer` / `FPLPlayerToken`, derive token size from `gameFormat`. Add `useMobileDetection` and compute:

| Format | Mobile shirt | Desktop shirt | Name pill max-width |
|---|---|---|---|
| 4-a-side | 56px | 72px | 88px |
| 5-a-side | 52px | 68px | 84px |
| 7-a-side | 46px | 60px | 78px |
| 9-a-side | 40px | 52px | 72px |
| 11-a-side | 36px | 46px | 68px |

Implementation: add `gameFormat` prop to `FPLPlayerToken` (already on `GameDayStyleFormationEditor`, threaded through `DraggablePitchPlayer`). Replace the hardcoded `shirtSize = isPitch ? 'w-11 h-11' : 'w-9 h-9'` with a lookup table. Apply matching `max-width` to `.fpl-player-name-glass` via inline style override.

Also adjust `formationUtils.ts` Y-axis spacing minimally if needed — the existing 10-88% range already gives breathing room; the size change is the main fix.

### 6. Touch points (files modified)

- `src/types/team.ts` — extend `KitDesign`
- `src/components/shared/KitShirt.tsx` — NEW unified component
- `src/components/shared/FPLShirtIcon.tsx` — replace body with `KitShirt` (or delete + update imports; chosen approach: replace internals so all 16 callers keep working)
- `src/components/shared/EnhancedKitAvatar.tsx`, `KitAvatar.tsx`, `PlayerShirtFallback.tsx` — re-implement as `KitShirt` wrappers
- `src/components/teams/KitDesigner.tsx` — full rebuild around custom hex + pattern picker, preview uses `KitShirt`
- `src/components/events/FPLPlayerToken.tsx` — accept `gameFormat`, dynamic size lookup, pass new kit fields to `KitShirt`
- `src/components/events/DraggablePitchPlayer.tsx` — thread `gameFormat` prop through
- `src/components/events/GameDayStyleFormationEditor.tsx` — pass `gameFormat` down (already has it)
- `src/styles/game-day.css` — `.fpl-player-name-glass` max-width becomes a CSS variable so it can be overridden inline per format

### 7. Out of scope (flag for later)

- Drag-and-drop kit designer with logo overlay
- Export kit to PNG / share to WhatsApp
- Crest / badge upload onto the shirt
- Heat-map / fitness ring overlays on the formation token
- Server-side migration of legacy `hasStripes` records (handled at read time only)

## Visual outcome

- Designer preview, pitch token, player cards, calendar, bench — all show the *same* shirt shape with the same colours and pattern. Single source of truth.
- Coaches can pick any hex colour, plus stripes / hoops / halves / sash.
- 11-a-side on a 390px viewport: shirts are 36px, name pills are 68px wide, no overlap. 5-a-side gets dramatically larger 52px shirts that fill the pitch properly.
