/**
 * EL5 MediProcure — Service Worker v5.0
 * ProcurBosse v12.0.0 · Embu Level 5 Hospital
 * Strategy: Cache-first static, Network-first API/data, SWR for pages
 */

const APP_VERSION    = "12.0.0";
const CACHE_VERSION  = "el5-procure-v5";
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE  = `${CACHE_VERSION}-runtime`;
const API_CACHE      = `${CACHE_VERSION}-api`;
const IMAGE_CACHE    = `${CACHE_VERSION}-images`;

const MAX_RUNTIME_ENTRIES = 120;
const MAX_IMAGE_ENTRIES   = 60;
const API_CACHE_TTL_MS    = 30_000;   // 30 s — stale-while-revalidate window

// Static shell — always cache-first
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/logo.png",
];

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

  // Supabase API / edge functions — network-first, short cache
  if (url.hostname.includes("supabase.co") || url.hostname.includes("functions.supabase")) {
    event.respondWith(networkFirstAPI(request));
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

async function networkFirstAPI(request) {
  const cacheKey = new Request(request.url);
  try {
    const net = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (net.ok) {
      const cache = await caches.open(API_CACHE);
      // Store with timestamp header for TTL check
      const headers = new Headers(net.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const stored = new Response(await net.clone().blob(), { headers });
      cache.put(cacheKey, stored);
    }
    return net;
  } catch {
    const cached = await caches.match(cacheKey, { cacheName: API_CACHE });
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("x-sw-cached-at") || "0");
      if (Date.now() - cachedAt < API_CACHE_TTL_MS) return cached;
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

// ── Message handler — skip waiting, clear cache ───────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "VERSION", version: APP_VERSION, cache: CACHE_VERSION });
  }
});
