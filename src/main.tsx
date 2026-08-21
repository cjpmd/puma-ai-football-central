import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import { logBundleLoadTime } from './lib/performanceMonitor'
import { setupNativeStatusBar } from './lib/nativeStatusBar'

// ── Sentry error tracking ─────────────────────────────────────────────────────
// DSN is injected via VITE_SENTRY_DSN env var.  If unset, Sentry initialises
// in no-op mode so the app still runs without tracking (dev / preview builds).
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  environment: import.meta.env.MODE,
  // Only enable in production — keeps dev console clean
  enabled: import.meta.env.PROD,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all text/inputs to avoid capturing PII (player names, etc.)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Performance: sample 20% of transactions, 100% of errors
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  // Flag slow renders > 1 s
  tracePropagationTargets: [/supabase\.co/],
  beforeSend(event) {
    // Strip auth tokens from breadcrumbs before sending
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    return event;
  },
});

// ── Global async error capture ────────────────────────────────────────────────
// Promise rejections outside React (fire-and-forget calls, event handlers)
// never reach an ErrorBoundary; without this they are silently dropped.
window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason);
  Sentry.captureException(event.reason ?? new Error('Unhandled promise rejection'), {
    mechanism: { type: 'onunhandledrejection', handled: false },
  });
});

window.addEventListener('error', (event) => {
  // Resource-load errors have no error object; skip those, Sentry's own
  // instrumentation covers script errors with stack traces.
  if (event.error) {
    Sentry.captureException(event.error, {
      mechanism: { type: 'onerror', handled: false },
    });
  }
});

logBundleLoadTime();

void setupNativeStatusBar();

// ── Service worker ────────────────────────────────────────────────────────────
// Native builds serve their web assets from the app bundle, so a service worker
// adds nothing there: on iOS it never runs at all, and on Android it duplicates
// the bundled assets in WebView storage and can serve the previous version's
// precache over the new bundle after a store update. Register on the web only.
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com') ||
    (window.location.hostname.includes('lovable.app') &&
      window.location.hostname.startsWith('id-preview--')));

const isNative = Capacitor.isNativePlatform();

/**
 * Remove any service worker and Cache Storage this origin still holds.
 *
 * Existing Android installs already registered one, so shipping the gate alone
 * would leave that worker in place forever. Runs on every native launch rather
 * than behind a "done" flag: with nothing to remove it is two no-op lookups,
 * and it self-heals if a cleanup is ever interrupted midway.
 */
const removeServiceWorkerAndCaches = async () => {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Nothing actionable — the app runs fine from the bundle either way
  }
};

if ('serviceWorker' in navigator) {
  if (isNative || isInIframe || isPreviewHost) {
    void removeServiceWorkerAndCaches();
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { type: 'module' })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
