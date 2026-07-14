/**
 * EL5 MediProcure — Service Worker v6.0
 * ProcurBosse v12.2.0 · Embu Level 5 Hospital
 * Strategy: Cache-first static, Network-first API/data, SWR for pages
 *
 * v6.0 additions over v5.0:
 *  - Per-origin circuit breaker for API fetches: after repeated failures,
 *    skip straight to cache instead of waiting out another timeout — the
 *    SW equivalent of the app-level networkEngine circuit breaker (this
 *    runs in an isolated worker context so it can't import that module
 *    directly; this is a small compatible re-implementation).
 *  - Background Sync registration: when a fetch fails while offline, the
 *    SW registers a 'sync' event so the browser retries automatically
 *    (even if the tab is closed), instead of relying solely on the
 *    foreground 'online' listener in main.tsx.
 *  - Push notification handling stub, ready for approval alerts.
 *  - Adaptive stale-serving: API cache TTL extends automatically while
 *    the breaker is open, so the UI keeps working through a real outage
 *    instead of flashing "offline" on every 30s refresh.
 */

const APP_VERSION    = "12.2.0";
const CACHE_VERSION  = "el5-procure-v6";
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE  = `${CACHE_VERSION}-runtime`;
const API_CACHE      = `${CACHE_VERSION}-api`;
const IMAGE_CACHE    = `${CACHE_VERSION}-images`;

const MAX_RUNTIME_ENTRIES = 120;
const MAX_IMAGE_ENTRIES   = 60;
const API_CACHE_TTL_MS      = 30_000;    // normal stale-while-revalidate window
const API_CACHE_TTL_MS_DEGRADED = 5 * 60_000; // extended TTL while circuit is open

const SYNC_TAG = "el5-offline-mutations";

// Static shell — always cache-first
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/logo.png",
];

// ── Lightweight per-origin circuit breaker (SW-local) ──────────────────────────
const FAILURE_THRESHOLD = 4;
const COOLDOWN_MS = 15_000;
const breakers = new Map(); // origin -> { failures, openedAt, state }

function breakerFor(origin) {
  let b = breakers.get(origin);
  if (!b) { b = { failures: 0, openedAt: 0, state: "closed" }; breakers.set(origin, b); }
  return b;
}
function breakerCanRequest(origin) {
  const b = breakerFor(origin);
  if (b.state === "closed") return true;
  if (b.state === "open") {
    if (Date.now() - b.openedAt >= COOLDOWN_MS) { b.state = "half-open"; return true; }
    return false;
  }
  return true; // half-open probe
}
function breakerRecordSuccess(origin) {
  const b = breakerFor(origin);
  b.failures = 0;
  b.state = "closed";
}
function breakerRecordFailure(origin) {
  const b = breakerFor(origin);
  if (b.state === "half-open") { b.state = "open"; b.openedAt = Date.now(); return; }
  b.failures++;
  if (b.failures >= FAILURE_THRESHOLD) { b.state = "open"; b.openedAt = Date.now(); }
}
function breakerIsOpen(origin) {
  return breakerFor(origin).state === "open";
}

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — prune old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET, chrome-extension, or Supabase auth calls
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/auth/")) return;

  // Navigate requests — SPA shell
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }

  // Supabase API / edge functions — network-first, short cache, circuit breaker
  if (url.hostname.includes("supabase.co") || url.hostname.includes("functions.supabase")) {
    event.respondWith(networkFirstAPI(request, url.origin));
    return;
  }

  // Images — cache-first with LRU eviction
  if (request.destination === "image") {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  // JS/CSS/fonts — stale-while-revalidate
  if (["script", "style", "font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  // Default — network with runtime cache fallback
  event.respondWith(networkFirstRuntime(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function networkFirstWithShellFallback(request) {
  try {
    const net = await fetch(request, { signal: AbortSignal.timeout(4000) });
    if (net.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    const cached = await caches.match(request) || await caches.match("/index.html");
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirstAPI(request, origin) {
  const cacheKey = new Request(request.url);

  // Circuit open — skip the network attempt entirely and go straight to
  // (possibly stale-extended) cache. Saves a doomed round trip on every
  // poll during a real outage.
  if (!breakerCanRequest(origin)) {
    const cached = await caches.match(cacheKey, { cacheName: API_CACHE });
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline", circuitOpen: true }), {
      status: 503, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const net = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (net.ok) {
      breakerRecordSuccess(origin);
      const cache = await caches.open(API_CACHE);
      const headers = new Headers(net.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const stored = new Response(await net.clone().blob(), { headers });
      cache.put(cacheKey, stored);
    } else {
      breakerRecordFailure(origin);
    }
    return net;
  } catch (err) {
    breakerRecordFailure(origin);
    // A failed API request while offline is exactly what Background Sync
    // is for — register so the browser retries this automatically later,
    // even if the tab gets closed in the meantime.
    if ("sync" in self.registration) {
      try { await self.registration.sync.register(SYNC_TAG); } catch { /* unsupported */ }
    }
    const cached = await caches.match(cacheKey, { cacheName: API_CACHE });
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("x-sw-cached-at") || "0");
      const ttl = breakerIsOpen(origin) ? API_CACHE_TTL_MS_DEGRADED : API_CACHE_TTL_MS;
      if (Date.now() - cachedAt < ttl) return cached;
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirstImage(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const net = await fetch(request);
    if (net.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      await evictLRU(cache, MAX_IMAGE_ENTRIES);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(async (net) => {
    if (net.ok) {
      await evictLRU(cache, maxEntries);
      cache.put(request, net.clone());
    }
    return net;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstRuntime(request) {
  try {
    const net = await fetch(request, { signal: AbortSignal.timeout(5000) });
    if (net.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await evictLRU(cache, MAX_RUNTIME_ENTRIES);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    return (await caches.match(request)) || new Response("Offline", { status: 503 });
  }
}

async function evictLRU(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    await cache.delete(keys[0]);
  }
}

// ── Background Sync — replay queued mutations even if the tab is closed ───────
// The SW itself doesn't hold Supabase credentials, so it can't replay
// mutations directly; instead it wakes every open client and asks the app
// (which already has an authenticated client) to flush its offline queue.
self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "REPLAY_OFFLINE_QUEUE" }));
    })
  );
});

// ── Push notifications — stub, ready for approval alerts ──────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "EL5 MediProcure", body: event.data.text() }; }
  const title = payload.title || "EL5 MediProcure";
  const options = {
    body: payload.body || "",
    icon: "/icon.png",
    badge: "/favicon.ico",
    data: { url: payload.url || "/" },
    tag: payload.tag || "el5-notification",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// ── Message handler — skip waiting, clear cache, report breaker state ─────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "VERSION", version: APP_VERSION, cache: CACHE_VERSION });
  }
  if (event.data?.type === "GET_BREAKER_STATE") {
    const snapshot = {};
    breakers.forEach((v, k) => { snapshot[k] = v.state; });
    event.source?.postMessage({ type: "BREAKER_STATE", breakers: snapshot });
  }
});
