/// <reference lib="webworker" />
import { logger } from '@/lib/logger';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Use the precache manifest injected by workbox
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches
cleanupOutdatedCaches();

// Handle skip waiting message from PWAUpdatePrompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Claim clients immediately
clientsClaim();

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
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5 // 5 minutes — auth state can change frequently
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
