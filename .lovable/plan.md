

## Plan: Make Event Details + Team Selection true full-screen on mobile / iOS standalone

Both screens look like floating cards because the underlying `DialogContent` is centered (`top-[50%] translate-y-[-50%]`) and capped at `max-h-[90/92vh]`. On a phone — especially Capacitor / standalone — the leftover ~5% top + ~5% bottom strips show through as wallpaper, and the Team Selection bench is clipped because the card never reaches the bottom of the screen.

Fix is scoped to two `DialogContent` overrides; no changes to the shared `Dialog` primitive, no behaviour changes.

### 1. Event Details modal — `src/pages/CalendarEventsMobile.tsx` (line 1234)

Current:
```
<DialogContent className="w-full max-w-full sm:max-w-[425px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
```

Change on mobile (default state) to a true fullscreen sheet anchored top-left so Radix's centering transform is neutralised:

- Override the centering with `top-0 left-0 translate-x-0 translate-y-0` on mobile (revert to default at `sm:`).
- Use `w-screen h-[100dvh] max-h-[100dvh] max-w-none rounded-none` on mobile so the dark card occupies the entire viewport (no purple wallpaper band top or bottom).
- Drop `max-h-[90vh]` for mobile; keep `sm:max-h-[90vh] sm:max-w-[425px]` so desktop is unchanged.
- Add `pt-[max(env(safe-area-inset-top),1rem)] pb-[env(safe-area-inset-bottom)]` so the title clears the Dynamic Island and content respects the home-bar inset.
- Replace `overflow-y-auto` on `DialogContent` with a flex column (`flex flex-col`) and move the scroll onto the inner content wrapper so the close button stays pinned to the top of the screen.

The visible `Event Details` title, Friendly/Available chips, map and Team Selection sections stay identical — only the frame around them goes edge-to-edge.

### 2. Team Selection modal — `src/components/events/EnhancedTeamSelectionManager.tsx` (line 989)

The inner wrapper already uses `h-[100dvh]` and `ios-wallpaper-dawn`, but the host `DialogContent` is still centered and has `max-h-[92vh]`, so:
- A purple wallpaper band shows above the header (visible in IMG_2738 between the status bar and the "Team Selection" title).
- The bottom is clipped → the "Players & playing time" bar below the bench is cut off.

Apply the same fullscreen overrides on mobile only:
- `top-0 left-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-h-[100dvh] max-w-none rounded-none` (mobile).
- Keep current `sm:max-w-6xl xl:max-w-7xl max-h-[92vh]` for desktop.
- Inner wrapper: change `h-[100dvh]` → `h-full` so it fills the now-correct parent (and remove the redundant `max-h-[100dvh]`).
- Header `pt-[calc(env(safe-area-inset-top)+0.75rem)]` already exists — keep as-is so the back chevron clears the Dynamic Island.
- Add `pb-[env(safe-area-inset-bottom)]` to the outer wrapper so the substitute bench's bottom row is no longer hidden under the home indicator.

This reclaims the ~88px top band + ~30px bottom band visible in the screenshot, which is exactly the space the cut-off bench bar needs.

### 3. Sanity check on the Dialog overlay

The shared `DialogOverlay` uses `bg-black/85` — perfect for fullscreen standalone (no purple wallpaper bleed). No changes needed.

### Files modified

| File | Change |
|------|--------|
| `src/pages/CalendarEventsMobile.tsx` | Make the Event Details `DialogContent` true fullscreen on mobile (anchor top-left, `w-screen h-[100dvh]`, safe-area paddings, scroll moved to inner div). Desktop unchanged. |
| `src/components/events/EnhancedTeamSelectionManager.tsx` | Add the same fullscreen anchor overrides to Team Selection's `DialogContent`; switch inner wrapper to `h-full` and add bottom safe-area padding so the bench bar stops being clipped. |

### Out of scope
- The shared `DialogContent` primitive (used by ~50 dialogs) — leaving as-is to avoid regressions on every other modal.
- Native splash, status bar styling, or Capacitor config changes.
- Inner layouts of either screen — only the outer frame goes fullscreen.

### Verification
- iOS standalone (Xcode build): open Event Details → dark card fills the entire screen, title sits just below the Dynamic Island, no purple band above or below.
- Open Team Selection → header clears the Dynamic Island, formation pitch grows, the "BENCH · drag to swap" bar and the playing-time row beneath it are fully visible above the home indicator.
- Mobile Safari (browser chrome present): both modals still fill the available viewport via `100dvh`.
- Desktop: both dialogs render exactly as today (sm: classes preserved).

