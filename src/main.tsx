import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import { logBundleLoadTime } from './lib/performanceMonitor'

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

logBundleLoadTime();

// ── Service worker ────────────────────────────────────────────────────────────
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com') ||
    (window.location.hostname.includes('lovable.app') &&
      window.location.hostname.startsWith('id-preview--')));

if ('serviceWorker' in navigator) {
  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
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
