// Dedicated Push Notification Service Worker
// Separate from the main PWA service worker for stable push subscription

self.addEventListener('install', (event) => {
  console.log('[SW-Push] Installing push service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-Push] Activating push service worker...');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW-Push] Push event received:', {
    hasData: !!event.data,
    dataType: event.data ? typeof event.data : null,
  });

  let data = {
    title: 'Puma-AI',
    body: 'You have a new notification',
    icon: '/pwa-icons/icon-192x192.png',
    badge: '/pwa-icons/badge-72x72.png',
    url: '/dashboard',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      console.log('[SW-Push] Push payload:', payload);
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || payload.data?.url || data.url,
        eventId: payload.data?.eventId || payload.eventId,
      };
    }
  } catch (e) {
    console.log('[SW-Push] Error parsing push data:', e);
    try {
      if (event.data) data.body = event.data.text();
    } catch (_) {
      // ignore
    }
  }

  // iOS-compatible notification options
  // iOS doesn't support: actions, renotify, requireInteraction
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: 'puma-ai-notification-' + Date.now(),
    data: { url: data.url, eventId: data.eventId },
  };

  console.log('[SW-Push] Showing notification:', data.title, options);

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(data.title, options);
        console.log('[SW-Push] Notification displayed successfully');
        
        // Notify open windows (for debugging)
        const windowClients = await self.clients.matchAll({ 
          type: 'window', 
          includeUncontrolled: true 
        });
        windowClients.forEach((client) => {
          client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
        });
      } catch (err) {
        console.error('[SW-Push] Failed to display notification:', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW-Push] Notification clicked:', event);

  event.notification.close();

  // Determine URL to open
  let urlToOpen = event.notification.data?.url || '/dashboard';
  
  if (event.notification.data?.eventId) {
    urlToOpen = `/calendar?event=${event.notification.data.eventId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus an existing window
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW-Push] Notification closed');
});

console.log('[SW-Push] Service worker loaded with push notification support');
