/**
 * EL5 MediProcure — Service Worker v4.0
 * High-throughput caching for 100+ concurrent users
 *
 * Strategy matrix:
 *  Static assets (JS/CSS/fonts/images)  → Cache-first, 30-day TTL
 *  HTML shell / navigation              → Network-first, fallback to cache
 *  Supabase API / Edge functions        → Network-first, 150 ms race, cache fallback
 *  Everything else                      → Stale-while-revalidate
 */

const CACHE_VERSION  = "el5-procure-v4";
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE  = `${CACHE_VERSION}-runtime`;
const API_CACHE      = `${CACHE_VERSION}-api`;

const STATIC_ASSETS  = ["/", "/index.html"];

const THIRTY_DAYS    = 30 * 24 * 60 * 60;   // seconds
const ONE_HOUR       = 60 * 60;
const FIVE_MIN       = 5 * 60;
const API_RACE_MS    = 150;   // serve cache if network exceeds 150 ms

/* ── Install — precache shell ────────────────────────────────── */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate — delete stale caches ─────────────────────────── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith("el5-procure-") && k !== STATIC_CACHE
                        && k !== RUNTIME_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch — strategy router ─────────────────────────────────── */
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin (except Supabase), and chrome-extension
  if (request.method !== "GET")         return;
  if (url.protocol === "chrome-extension:") return;

  // Supabase REST / storage API → network-race
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in")) {
    // Don't cache auth, realtime, or write-like requests
    if (url.pathname.includes("/auth/") || url.pathname.includes("/realtime/") ||
        url.searchParams.has("select") === false) return;
    event.respondWith(networkRace(request, API_CACHE, FIVE_MIN));
    return;
  }

  // Static assets (JS/CSS/woff2/png/svg)
  if (/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|ico|webp)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, THIRTY_DAYS));
    return;
  }

  // HTML / SPA navigation
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Everything else → SWR
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, ONE_HOUR));
});

/* ── Strategy implementations ────────────────────────────────── */

async function cacheFirst(req, cacheName, maxAgeS) {
  const cached = await caches.match(req, { ignoreSearch: false });
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.status === 200) {
    const cache = await caches.open(cacheName);
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", `public, max-age=${maxAgeS}`);
    cache.put(req, new Response(res.clone().body, { status: res.status, headers }));
  }
  return res;
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const c = await caches.open(cacheName);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response("<html><body>Offline</body></html>",
      { headers: { "Content-Type": "text/html" } });
  }
}

/**
 * Network-race: start network fetch AND a timer.
 * If network responds within API_RACE_MS → use it.
 * If cache is faster (or network is slow) → serve cache + revalidate background.
 */
async function networkRace(req, cacheName, ttlS) {
  const cached = await caches.match(req);

  const networkPromise = fetch(req).then(res => {
    if (res && res.status === 200) {
      caches.open(cacheName).then(c => c.put(req, res.clone()));
    }
    return res;
  });

  if (!cached) return networkPromise;

  return new Promise(resolve => {
    let raceWon = false;
    const timer = setTimeout(() => {
      if (!raceWon) { raceWon = true; resolve(cached); }
    }, API_RACE_MS);

    networkPromise.then(res => {
      clearTimeout(timer);
      if (!raceWon) { raceWon = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (!raceWon) { raceWon = true; resolve(cached); }
    });
  });
}

async function staleWhileRevalidate(req, cacheName, ttlS) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || fetchPromise;
}
