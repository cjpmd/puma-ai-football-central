# Full-screen background coverage on Android (and bottom edge on iOS)

Goal: on both Android and iOS the strip behind the system status bar (top) and the gesture/navigation bar (bottom) is filled with the app background colour, without moving any content.

## What changes

1. **Android native config** — add an `android` section to the Capacitor config with `backgroundColor: '#120823'` so the native web view background matches the app, matching what iOS already has.

2. **Browser/Android theme colour** — update `index.html` `<meta name="theme-color">` from the stale `#1a1a2e` to `#120823`. This is what Android Chrome and installed PWAs use to tint the status bar.

3. **Bottom safe-area fill in the mobile shell** — the shell currently paints a fill only behind the top inset. Add a matching absolutely positioned fill at the bottom with `height: env(safe-area-inset-bottom)` and background `#120823`, sitting behind the floating bottom nav. Nothing shifts; only the previously bare strip gets colour.

4. **Status bar styling (optional, native only)** — add the `@capacitor/status-bar` plugin and, on native start, set overlay mode plus a dark background so Android draws the status bar in `#120823` with light icons. Without this Android can render a black or system-coloured bar even when the web view background matches.

## Technical notes

- Files: `capacitor.config.ts`, `index.html`, `src/components/layout/MobileLayout.tsx`, plus a small native-only init in the app entry if the status-bar plugin is included.
- `env(safe-area-inset-*)` already works because the viewport meta uses `viewport-fit=cover`.
- There is no `android/` platform folder in the repo yet, so after pulling the changes you run `npx cap add android`, then `npx cap sync` and rebuild in Android Studio. iOS just needs `npx cap sync` and a rebuild.

## Not included

No layout, spacing, or navigation changes — purely background colour coverage.
