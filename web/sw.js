/* EL5 MediProcure Service Worker v2.0
   Enables offline capability + install prompt
*/
const CACHE_V  = "mediprocure-v2";
const STATIC   = ["/", "/dashboard", "/manifest.json", "/favicon.png", "/logo.png", "/icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_V).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
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
  // Only cache GET requests; never cache Supabase API calls
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname.includes("supabase") || url.hostname.includes("ipify")) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_V).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("/")))
  );
});

self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
