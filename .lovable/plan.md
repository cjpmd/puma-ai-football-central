# Fix FIFA Card Play Styles + Duplicate Close Button

## Problem 1 — Legacy play styles persist
`player.play_style` in the DB still contains pre-migration values (e.g. `speedster`, `finisher`, `workhorse`, `maestro`, `interceptor`, `guardian`, `wall`, `clinical`, `commander`, `engine`, `reflexes`, `rock`, `sweeper`). Andrew McDonald has `["finisher","speedster","rapid"]`. Only `rapid` exists in the new `FIFA_PLAY_STYLES` list.

Result in `FifaStylePlayerCard.tsx`:
- The picker grid only highlights values present in `FIFA_PLAY_STYLES`, so legacy values appear unselected in the UI.
- However, `selectedPlayStyles` still contains them, so the counter shows `3/3` and the user can't add more.
- On the front of the card, `getPlayStyleIcon()` returns `null` for legacy values, leaving phantom slots.

## Problem 2 — Two close (X) buttons on the Dashboard
On `DashboardMobile.tsx` (line 1176–1198) the card is wrapped in a shadcn `<Dialog>`. `DialogContent` (`src/components/ui/dialog.tsx` line 45) renders its own `DialogPrimitive.Close` X in the top-right. The card itself already has its own X (`FifaStylePlayerCard.tsx` line 557–566), so the user sees two — the outer one floating outside the card frame.

## Fix

### 1. Sanitize legacy play styles in `FifaStylePlayerCard.tsx`
In `parsePlayStyles()` (lines 148–190), after building `rawStyles`, filter to keep only values that exist in the current `FIFA_PLAY_STYLES` list:

```ts
const validValues = new Set(FIFA_PLAY_STYLES.map(s => s.value));
return [...new Set(rawStyles)].filter(v => validValues.has(v)).slice(0, 3);
```

Effect: legacy values are dropped on load, so:
- Counter shows the correct number (e.g. `1/3` for Andrew after dropping `finisher`/`speedster`).
- Front-of-card no longer has phantom empty icon slots.
- The next time the user changes their selection, `onSavePlayStyle` writes only the cleaned array back to the DB, naturally migrating the record.

No DB migration required — sanitization happens client-side and self-heals on next save. (Optionally we could run a one-off cleanup query later, but it's not needed for the bug fix.)

### 2. Hide the duplicate X on `DashboardMobile.tsx`
Two equally simple options — picking the cleanest one:

Replace the wrapping `DialogContent` with a custom variant that omits the built-in close button. The simplest in-place change is to override the close button via CSS on this single Dialog instance:

```tsx
<DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none [&>button]:hidden">
```

The `[&>button]:hidden` arbitrary selector hides the auto-rendered `DialogPrimitive.Close` (the only direct `<button>` child of `DialogContent`), leaving the card's own X intact and inside the frame.

## Files to edit
- `src/components/players/FifaStylePlayerCard.tsx` — add legacy-value filter inside `parsePlayStyles`.
- `src/pages/DashboardMobile.tsx` — add `[&>button]:hidden` to the `DialogContent` className on line 1177.

## Out of scope
- One-off DB cleanup of legacy values across all players (not required; handled lazily on next save). Happy to add a migration if you want a single sweep.
- Changes to how positional labels (`Midfielder Right+++` etc.) are computed — those come from match minutes, not from `play_style`, and are working as designed.
