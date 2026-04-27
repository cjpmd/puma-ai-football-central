import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detect Lovable preview / iframe contexts where Service Worker registration
// fails with "Failed to access storage" and produces a blank screen.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname.includes('lovable.app') &&
      window.location.hostname.startsWith('id-preview--'));

if ('serviceWorker' in navigator) {
  if (isInIframe || isPreviewHost) {
    // Clean up any previously registered SW that may be serving stale assets
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  } else {
    // Register the PWA service worker only in real top-level browser contexts
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { type: 'module' })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
