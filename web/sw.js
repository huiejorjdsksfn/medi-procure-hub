/**
 * ProcurBosse Service Worker v22.5 NUCLEAR
 * CACHE BUSTER — clears all old caches and unregisters immediately
 * Forces browser to load fresh from network always
 */
const CACHE_VERSION = 'pb-v22-5-' + Date.now();

// On install — activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate — delete ALL old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        console.log('[SW] Deleting cache:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      console.log('[SW] All caches cleared');
      return self.clients.claim();
    }).then(() => {
      // Tell all clients to reload
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// Fetch — ALWAYS go to network, never use cache
self.addEventListener('fetch', event => {
  // Skip non-GET and non-http requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .catch(() => {
        // Offline fallback — return cached if available
        return caches.match(event.request);
      })
  );
});
