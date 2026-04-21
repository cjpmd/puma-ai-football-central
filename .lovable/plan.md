

## Plan: Fix mobile rendering issues across Team Settings, Kit Overview, and Team Selection

### Issue 1 — Team Settings → Basic Info: form fields look uncomfortable on mobile
The Sheet renders fine, but the top input has its label scrolled away on first open (looks like an unlabeled field). Cause: the form's first field is wrapped in a `grid grid-cols-1 md:grid-cols-2` and the Sheet opens scrolled to the top of the inner Card, which on a 390px viewport hides the "Age Group" `Label` because the input sits flush against the SheetHeader border.

Fix in `src/components/teams/settings/TeamBasicSettings.tsx`:
- Add `pt-2` to the first `CardContent` so the first label gets breathing room from the sheet border.
- Wrap the inner Cards in `border-0 bg-transparent shadow-none` (or similar) on mobile so they don't render duplicate borders inside the Sheet — the Sheet itself already provides the visual container, eliminating the "double box" effect visible in IMG_2729.
- Apply the `min-w-0 max-w-full` guard to the grid so long location strings don't push the card outside the sheet width.

### Issue 2 — Player Kit Sizes overview overflows the screen (IMG_2730)
The dialog uses `max-w-4xl max-h-[80vh] overflow-y-auto` (`TeamKitManagementSettings.tsx` line 623). On a 390px viewport the underlying `DialogContent` enforces `w-full max-w-lg` with `p-6`, and the long table column headers ("Home Kit (Shirt, Shorts & Socks)") force the inner content wider than the dialog → the close X is pushed half off-screen and the title is clipped.

Fix:
- In `TeamKitManagementSettings.tsx`: change the overview Dialog's `DialogContent` className to `max-w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-hidden p-0 sm:p-6 flex flex-col`.
- Wrap the body in a `ScrollArea`/scrollable div with both `overflow-y-auto` and `overflow-x-auto`, and add `px-4 pt-4 pb-4` so content has padding without touching the dialog edge.
- In `src/components/clubs/PlayerKitSizesOverview.tsx`:
  - Wrap the `<Table>` in `<div className="overflow-x-auto -mx-2">` so wide tables scroll horizontally instead of pushing the card.
  - Cap the kit-item column headers to two-line wrap with `whitespace-normal max-w-[120px]` to prevent the "Home Kit (Shirt, Shorts & Socks)" column from blowing the table to 3× viewport width.
  - Make the outer `Card` use `border-0 bg-transparent shadow-none p-0` on mobile so it doesn't add another inner box inside the dialog.
  - Header row: stack the title + Export button vertically on mobile (`flex-col gap-2 sm:flex-row sm:items-center`) so the Export button doesn't fight the title.

### Issue 3 — Team Selection: PWA wastes the top half of screen (IMG_2732)
The Team Selection modal is opened via a `Dialog` whose default `DialogContent` applies `p-6` and `border` even on mobile. The mobile override on line 989 only removes the close button, border and background — `p-6` still applies, so on iOS PWA standalone (no browser chrome) we get a 24px transparent strip plus the wallpaper showing through the ~88px taller available viewport, leaving the header card floating well below the status bar.

Fix in `src/components/events/EnhancedTeamSelectionManager.tsx`:
- Add `p-0` to the mobile `DialogContent` className (line 989): `${isMobile ? '[&>button]:hidden border-0 bg-transparent shadow-none p-0' : ''}`.
- Change the inner wrapper height from `h-[calc(100dvh-56px)]` to `h-[100dvh] max-h-[100dvh]` and let the safe-area handle the top inset (it already does via `pt-[calc(env(safe-area-inset-top)+0.75rem)]` on the header bar). The `-56px` subtraction was compensating for `MobileLayout`'s header which is **not** rendered behind the modal — removing it lets the dialog use the full screen, eliminating the top band visible in the PWA screenshot.
- Remove the `rounded-xl` on the inner wrapper for mobile so the dialog truly hits the screen edges (`${isMobile ? '' : 'rounded-xl'}`).
- The 3-box hero row is already constrained — no change needed; with the extra vertical space recovered, the Formation pitch will use ~88px more height in the PWA, matching the mobile-browser experience.

This is a CSS-only change; behaviour, save logic, and tab structure are untouched.

### Files modified

| File | Change |
|------|--------|
| `src/components/teams/settings/TeamBasicSettings.tsx` | Add top padding to first CardContent; flatten inner Card chrome on mobile so it doesn't double up against the Sheet. |
| `src/components/teams/settings/TeamKitManagementSettings.tsx` | Make the Player Kit Sizes overview Dialog mobile-safe (`max-w-[95vw]`, `p-0` on mobile, scrollable inner area). |
| `src/components/clubs/PlayerKitSizesOverview.tsx` | Wrap table in horizontal-scroll container; constrain column header width with `whitespace-normal max-w-[120px]`; flatten outer Card on mobile; stack header row on mobile. |
| `src/components/events/EnhancedTeamSelectionManager.tsx` | Add `p-0` to mobile DialogContent; change inner wrapper to true `100dvh` and drop the unnecessary 56px subtraction so PWA uses the full screen. |

### Out of scope
- Other Team Settings sub-pages (Kit Designer, Performance Categories, etc.) — separate review pass if they show similar issues.
- Native iOS Capacitor build — fix is purely CSS so it works in both PWA standalone and in-app webview.
- Refactoring the Sheet component itself.

### Verification (390x844)
- Open Team Settings → Basic Info: first label "Team Name" visible without scrolling, no double border, location field doesn't push past the sheet.
- Open Team Settings → Kit Sizes → "View Player Kit Sizes": dialog fits the screen, X close visible top-right, table scrolls horizontally without distorting the dialog.
- Open an event → Team Selection from the iOS Home Screen PWA: the header (Save & Close + title) sits just below the iPhone notch with no large empty band above; the formation pitch fills the recovered ~88px.
- Mobile browser still renders correctly (dialog respects browser chrome via `100dvh`).

