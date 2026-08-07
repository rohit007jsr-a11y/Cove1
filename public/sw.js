// Service Worker for Cove - WhatsApp-style Offline & PWA Caching Strategy

const CACHE_NAME = 'cove-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
];

// Install Event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Dynamic WhatsApp-style caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip WebSocket connections and dynamic hot-reload connections
  if (url.pathname.startsWith('/ws') || url.pathname.includes('hmr') || url.pathname.includes('vite')) {
    return;
  }

  // Skip cross-origin non-http extension requests
  if (!event.request.url.startsWith('http')) return;

  // WhatsApp-Style Cache-First Strategy for Media, Avatars, and Attachments
  const isMediaOrAvatar = 
    url.pathname.includes('/storage/v1/object/public/') || 
    url.pathname.includes('/api/upload') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|mp3|wav|mp4|pdf|docx|xls|xlsx|zip)$/i) ||
    url.host.includes('googleusercontent.com') || // Google auth profile pictures
    url.host.includes('avatars.githubusercontent.com'); // GitHub auth profile pictures

  if (isMediaOrAvatar) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache instantly, but fetch in background to verify freshness (Stale-While-Revalidate)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
            })
            .catch(() => { /* ignore offline background fetch failures */ });
          return cachedResponse;
        }

        // Cache miss: fetch from network, cache, and return
        return fetch(event.request)
          .then((networkResponse) => {
            // Note: status === 0 is for opaque cross-origin resources
            if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback or placeholder
            console.log('[SW] Failed to fetch media offline:', event.request.url);
          });
      })
    );
    return;
  }

  // Network-First with Cache Fallback for HTML, JS, CSS, and other dynamic assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to offline cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML page request and offline, return cached index.html
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Push Event - Listen for incoming Web Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  if (!event.data) {
    console.warn('[SW] Push event has no data payload.');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'Cove Message';
    const options = {
      body: data.body || '',
      icon: data.senderAvatar || '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.chatId || 'cove-general-tag', // Collapses multiple notifications from the same chat
      renotify: true,
      vibrate: [100, 50, 100],
      data: {
        chatId: data.chatId,
        groupId: data.groupId,
        senderId: data.senderId,
        type: data.type,
      },
      actions: [
        { action: 'open', title: 'Open Chat' },
        { action: 'close', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
    // Fallback simple text notification
    event.waitUntil(
      self.registration.showNotification('New Cove Message', {
        body: event.data.text(),
        badge: '/favicon.ico',
      })
    );
  }
});

// Notification Click Event - Focus existing tab or open a new one and jump to chat
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const appUrl = new URL('/', self.location.origin).href;
  const targetData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Search for an existing open window/tab of the app
      for (const client of windowClients) {
        if (client.url === appUrl || client.url.startsWith(appUrl)) {
          if ('focus' in client) {
            client.focus();
          }
          // Notify the active React app about the navigation request
          if (client.postMessage) {
            client.postMessage({
              type: 'NAVIGATE_TO_CHAT',
              chatId: targetData.chatId,
              groupId: targetData.groupId,
              senderId: targetData.senderId,
            });
          }
          return;
        }
      }

      // 2. If no window is open, open a new one with a query parameter
      if (self.clients.openWindow) {
        let destination = appUrl;
        if (targetData.chatId) {
          destination += `?jumpChatId=${encodeURIComponent(targetData.chatId)}`;
        }
        return self.clients.openWindow(destination);
      }
    })
  );
});

