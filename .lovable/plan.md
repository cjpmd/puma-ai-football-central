# iOS top-of-screen background color

## Problem
On the iOS simulator the area at the very top of the screen (status bar / dynamic-island strip) is not covered by the app background color. Content must stay where it is to avoid the notch, but the top strip should share the same dark-purple background.

## Solution
1. **Match the native iOS background color** in `capacitor.config.ts`.
   - Change `ios.backgroundColor` from `#0d0d0d` to `#120823` (the top color of the app gradient) so the native area behind the status bar matches the app wallpaper.

2. **Add a top safe-area fill to the mobile shell** in `src/components/layout/MobileLayout.tsx`.
   - Render an absolutely positioned strip at the top of the shell that fills `env(safe-area-inset-top)` with the same `#120823` / gradient background.
   - This sits behind the header/content so nothing moves; the existing `env(safe-area-inset-top)` content padding stays unchanged.

3. **Keep the existing shell background** so the gradient remains visible everywhere else.

## Verification
- Build the app.
- Re-run in the iOS simulator and confirm the top strip is no longer a different color.
- Confirm that the greeting/logo/header still sits below the dynamic island and has not been pushed up.

## Post-change steps for native build
After these changes, the iOS project config will need synced:

```bash
npx cap sync
```

Then rebuild in Xcode.
