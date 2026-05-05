/* ╔══════════════════════════════════════════════════════════════╗
   ║  ProcurBosse Service Worker v5.8.0                          ║
   ║  EL5 MediProcure · Embu Level 5 Hospital                    ║
   ║  Offline login · Asset caching · Queue sync                 ║
   ╚══════════════════════════════════════════════════════════════╝ */

const CACHE_VERSION  = "procurbosse-v583-20260503";   // bump this to force refresh
const ASSETS_CACHE   = "procurbosse-assets-v583";
const PAGES_CACHE    = "procurbosse-pages-v583";

// Critical assets to pre-cache on install
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.png",
  "/logo.png",
  "/icon.png",
];

// ── INSTALL: pre-cache shell ───────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(ASSETS_CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))  // fail-open
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clear old caches ────────────────────────────────────────────
self.addEventListener("activate", e => {
  const CURRENT = new Set([ASSETS_CACHE, PAGES_CACHE]);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !CURRENT.has(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: network-first with offline fallback ────────────────────────────
self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept Supabase, analytics, or external API calls
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.io") ||
    url.hostname.includes("ipify.org")   ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("bunny.net")
  ) return;

  // Assets (hashed filenames) — cache-first
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(ASSETS_CACHE).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation — network-first, fallback to cached index.html
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(PAGES_CACHE).then(c => c.put(new Request("/index.html"), clone));
          }
          return res;
        })
        .catch(() =>
          caches.match("/index.html").then(r =>
            r || new Response("<h1>Offline</h1><p>Please connect to the internet and reload.</p>",
              { headers: { "Content-Type": "text/html" } })
          )
        )
    );
    return;
  }

  // Everything else — network with cache fallback
  e.respondWith(
    fetch(request).catch(() => caches.match(request).then(r => r || Response.error()))
  );
});

// ── MESSAGES ──────────────────────────────────────────────────────────────
self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data?.type === "CLEAR_CACHE") {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
