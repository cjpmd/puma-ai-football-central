/// <reference lib="webworker" />
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

// Claim clients immediately
self.skipWaiting();
clientsClaim();

// Cache Supabase API calls
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 // 24 hours
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// ============ Push Notification Handling ============

// Handle push events - iOS-compatible simplified handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let title = 'Puma-AI';
  let body = 'You have a new notification';
  let notificationData = {};
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Push payload received');
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
    tag: 'puma-ai-notification',
    data: notificationData
  };
  
  console.log('[SW] Showing notification:', title);
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action, event.notification.data);
  
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
  console.log('[SW] Notification closed');
});

console.log('[SW] Service worker loaded with push notification support');
