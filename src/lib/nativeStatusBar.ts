import { Capacitor } from '@capacitor/core';

const APP_BACKGROUND = '#120823';
let nativeStatusBarInitialized = false;

async function applyNativeStatusBar(): Promise<void> {
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setOverlaysWebView({ overlay: true });
  await StatusBar.setStyle({ style: Style.Light });

  if (Capacitor.getPlatform() === 'android') {
    // Used by Android versions or navigation modes that still render an
    // opaque system bar rather than the overlaid WebView background.
    await StatusBar.setBackgroundColor({ color: APP_BACKGROUND });
  }
}

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
  if (!Capacitor.isNativePlatform() || nativeStatusBarInitialized) return;
  nativeStatusBarInitialized = true;

  try {
    await applyNativeStatusBar();

    // iOS and Android can restore their default system-bar appearance when
    // returning from the background. Reapply our appearance on every resume.
    const { App } = await import('@capacitor/app');
    await App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      void applyNativeStatusBar().catch((error) => {
        console.warn('[statusBar] resume setup skipped', error);
      });
    });
  } catch (error) {
    console.warn('[statusBar] setup skipped', error);
  }
}
