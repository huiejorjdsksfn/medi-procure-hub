/* EL5 MediProcure Service Worker v3.0
   Strategies: Cache-first (assets), Network-first (pages), SWR (API)
   ProcurBosse · Embu Level 5 Hospital
*/
const CACHE_STATIC  = "el5-static-v3";
const CACHE_PAGES   = "el5-pages-v3";
const CACHE_IMAGES  = "el5-images-v3";
const CACHE_FONTS   = "el5-fonts-v3";
const ALL_CACHES    = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, CACHE_FONTS];

const STATIC_ASSETS = [
  "/", "/dashboard", "/manifest.json", "/favicon.png", "/logo.png", "/icon.png",
  "/404.html",
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Helpers ────────────────────────────────────────────────────────────────
function isImage(url) {
  return /\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(url.pathname);
}
function isFont(url) {
  return /\.(woff2?|ttf|eot)(\?.*)?$/i.test(url.pathname) || url.hostname.includes("fonts.");
}
function isAsset(url) {
  return /\.(js|css|wasm)(\?.*)?$/i.test(url.pathname);
}
function isSupabase(url) {
  return url.hostname.includes("supabase") || url.hostname.includes("ipify");
}
function isNavigation(req) {
  return req.mode === "navigate";
}

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Never intercept Supabase / external API calls
  if (isSupabase(url)) return;

  // Font: cache-first, 1 year
  if (isFont(url)) {
    e.respondWith(cacheFirst(e.request, CACHE_FONTS, 365 * 24 * 3600));
    return;
  }

  // JS/CSS assets (hashed): cache-first, 1 week
  if (isAsset(url)) {
    e.respondWith(cacheFirst(e.request, CACHE_STATIC, 7 * 24 * 3600));
    return;
  }

  // Images: cache-first, 3 days
  if (isImage(url)) {
    e.respondWith(cacheFirst(e.request, CACHE_IMAGES, 3 * 24 * 3600));
    return;
  }

  // Navigation (HTML pages): network-first with cache fallback
  if (isNavigation(e.request)) {
    e.respondWith(networkFirst(e.request, CACHE_PAGES));
    return;
  }

  // Everything else: stale-while-revalidate
  e.respondWith(staleWhileRevalidate(e.request, CACHE_PAGES));
});

/** Cache-first: serve from cache, fallback to network + cache */
async function cacheFirst(req, cacheName, maxAgeS) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res   = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      // Clone before consuming
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}

/** Network-first: try network, fallback to cache */
async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req) || await caches.match("/");
    return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/html" } });
  }
}

/** Stale-While-Revalidate */
async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || await fetchPromise || new Response("Offline", { status: 503 });
}

// ── Messages ───────────────────────────────────────────────────────────────
self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING")   self.skipWaiting();
  if (e.data?.type === "CLEAR_CACHE")    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
  if (e.data?.type === "CACHE_URLS" && Array.isArray(e.data.urls)) {
    caches.open(CACHE_PAGES).then(c => c.addAll(e.data.urls)).catch(() => {});
  }
});

// ── Background Sync (keepalive ping) ──────────────────────────────────────
self.addEventListener("sync", e => {
  if (e.tag === "el5-keepalive") {
    e.waitUntil(
      fetch("https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {})
    );
  }
});
