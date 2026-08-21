/// <reference lib="webworker" />
import { logger } from '@/lib/logger';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Use the precache manifest injected by workbox
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches
cleanupOutdatedCaches();

// No skipWaiting on install: a worker that activates the moment it installs
// takes over mid-session and reloads the page under the user, and it makes
// PWAUpdatePrompt unreachable because there is never a waiting worker for it
// to find. The update now waits for the user to accept it via the message
// below (or for every tab to close).

// Handle skip waiting message from PWAUpdatePrompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Claim clients immediately
clientsClaim();

// Serve the cached app shell for navigations that miss the network, so an
// offline reload of a deep link (/calendar, /players/123) resolves instead of
// failing — the router takes over from there.  Requests for files (anything
// with an extension) and Supabase calls are left alone.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  })
);

// Cache Supabase REST/Storage GET responses only.
// Auth endpoints and all non-GET requests are excluded:
// - POST/PATCH/DELETE mutations cannot be stored in the Cache API
// - Intercepting auth token requests (/auth/v1/) blocks session refresh on mobile
//   and causes "FetchEvent.respondWith received an error: no-response"
registerRoute(
  ({ url, request }) =>
    /^https:\/\/.*\.supabase\.co\/.*/i.test(url.href) &&
    !url.pathname.startsWith('/auth/') &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: 'supabase-cache',
    // Fall back to cache after 3s rather than hanging on a network that is
    // technically connected but going nowhere — the pitch-side case this
    // cache exists for.
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        // 24h: the network is still tried first on every request, so this only
        // bounds how stale a fallback may be when the network fails. At 5m the
        // cache had almost always expired by the time it was needed.
        maxAgeSeconds: 60 * 60 * 24
      }),
      new CacheableResponsePlugin({
        statuses: [200]
      })
    ]
  })
);

// ============ Push Notification Handling ============

// Handle push events - iOS-compatible simplified handler
self.addEventListener('push', (event) => {
  logger.log('[SW] Push event received');
  
  let title = 'Origin Sports';
  let body = 'You have a new notification';
  let notificationData = {};
  
  if (event.data) {
    try {
      const payload = event.data.json();
      logger.log('[SW] Push payload received');
      title = payload.title || title;
      body = payload.body || body;
      notificationData = payload.data || {};
    } catch (e) {
      // Fallback to text if JSON parsing fails
      const text = event.data.text();
      if (text) body = text;
    }
  }
  
  // iOS-compatible minimal notification options
  // iOS doesn't support: actions, renotify, requireInteraction, badge
  const options: NotificationOptions = {
    body: body,
    icon: '/pwa-icons/icon-192x192.png',
    tag: 'origin-sports-notification',
    data: notificationData
  };
  
  logger.log('[SW] Showing notification:', title);
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  logger.log('[SW] Notification click:', event.action, event.notification.data);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Determine URL to open
  let url = '/dashboard';
  const notificationData = event.notification.data;
  
  if (notificationData?.eventId) {
    url = `/calendar?event=${notificationData.eventId}`;
  } else if (notificationData?.type === 'availability_request') {
    url = '/calendar';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  logger.log('[SW] Notification closed');
});

logger.log('[SW] Service worker loaded with push notification support');
