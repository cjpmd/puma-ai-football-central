# Full-screen background coverage on iOS and Android

## Goal
Paint the Origin Sports dark-purple background across the complete device screen—including the iOS status-bar/Dynamic Island area and both platforms’ bottom gesture/navigation area—without moving page content or changing safe-area spacing.

## Changes
1. **Correct native status-bar appearance**
   - Change the Capacitor status-bar setup to use light system icons on the dark background.
   - Keep the WebView overlay enabled so the app background can render beneath the iOS status bar and Android system bar.
   - Reapply the setup when the native app becomes active, preventing the OS from restoring a white system-bar appearance after backgrounding.

2. **Guarantee a painted web root**
   - Give `html`, `body`, and `#root` a full-height dark-purple base background so no route, loading transition, overscroll edge, or transparent WebView frame can expose white.
   - Keep existing safe-area padding and content positions unchanged.
   - Retain the mobile shell’s explicit top and bottom inset fills as route-level protection.

3. **Harden the native iOS container**
   - Set the native window, bridge view, and WebView backgrounds to the same dark purple so the area outside or behind web content cannot default to white.
   - Set the launch-screen background to the same colour, removing the white strip/flash before React starts.
   - Preserve full-screen layout under the status bar and the existing Dynamic Island avoidance.

4. **Keep Android system surfaces consistent**
   - Retain the configured Android WebView background and explicitly apply the dark system-bar colour with light icons where Android renders an opaque bar.
   - Ensure both gesture navigation and three-button navigation fall back to the app colour rather than white.

## Verification
- Check iPhone Dynamic Island and non-Dynamic-Island sizes on the login and authenticated mobile shells.
- Check Android gesture and three-button navigation layouts.
- Confirm top and bottom edges remain purple during startup, route loading, scrolling/overscroll, and app resume.
- Confirm no header, form, navigation, or page content has shifted.

## Native build steps
After pulling the changes, run `npm install`, then `npx cap sync`. Rebuild from Xcode for iOS; for Android, add the platform first with `npx cap add android` if it is not already present, then sync and rebuild in Android Studio.
