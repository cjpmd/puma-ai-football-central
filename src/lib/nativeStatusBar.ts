import { Capacitor } from '@capacitor/core';

const APP_BACKGROUND = '#120823';

/**
 * Native-only status bar setup.
 *
 * The web view already paints `#120823` behind the safe-area insets, but on
 * Android the system status bar is drawn by the OS and stays black unless we
 * explicitly overlay the web view and tint it. Light icons keep the clock and
 * signal readable on the dark purple wallpaper.
 *
 * Web builds are a no-op: the `theme-color` meta tag covers browsers/PWAs.
 */
export async function setupNativeStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      // Ignored when overlaying, but set for devices/OS versions that still
      // render an opaque bar.
      await StatusBar.setBackgroundColor({ color: APP_BACKGROUND });
    }
  } catch (error) {
    console.warn('[statusBar] setup skipped', error);
  }
}
