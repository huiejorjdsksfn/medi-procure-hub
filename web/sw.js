/* EL5 MediProcure Service Worker v3.0
   FIXED: Never cache navigation/HTML — only assets
   Root cause of 404-on-refresh: old SW cached SPA routes which returned 404
*/
const CACHE_V = "mediprocure-v3";
// Only pre-cache actual static assets, NEVER html pages or SPA routes
const PRECACHE = [
  "/manifest.json",
  "/favicon.png",
  "/logo.png",
  "/icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_V)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Never intercept Supabase, external APIs
  if (url.hostname.includes("supabase") || url.hostname.includes("ipify")) return;

  // CRITICAL: Never cache or intercept navigation requests (HTML page loads)
  // Let the browser/EdgeOne handle these directly so SPA routing works
  if (e.request.mode === "navigate") return;

  // For assets: cache-first strategy
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_V).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // All other requests: network only, no caching
});

self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
