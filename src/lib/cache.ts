/**
 * EL5 MediProcure — High-Throughput Cache Engine v6.0
 *
 * Designed to serve 100+ concurrent users with sub-millisecond response
 * for cached data and no DB thundering-herd on cold misses.
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  L1 In-Memory LRU  →  0 ms  (Map.get)                  │
 *  │  L2 Singleflight   →  1 DB call for N concurrent misses │
 *  │  L3 SWR            →  stale served instantly + bg flush  │
 *  └─────────────────────────────────────────────────────────┘
 *
 * Key properties at 100 req/s burst:
 *  • Cache hit          → 0 ms, 0 DB calls
 *  • Stale SWR          → 0 ms, 1 background refresh
 *  • 100 concurrent miss→ 1 DB call (singleflight dedup)
 *  • Memory safety      → LRU eviction at 800 entries
 */

interface CacheEntry<T = any> {
  value:     T;
  expiresAt: number;    // hard expiry — entry deleted
  staleAt:   number;    // soft expiry — SWR refresh triggered
  hits:      number;
  createdAt: number;
  tags:      string[];
}

const MAX_ENTRIES  = 800;
const PRUNE_BATCH  = 120;
const SWR_FACTOR   = 0.5;   // refresh when 50 % of TTL has elapsed

class HighThroughputCache {
  private store    = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<any>>();   // singleflight registry

  // Metrics
  private _hits    = 0;
  private _misses  = 0;
  private _swr     = 0;
  private _deduped = 0;

  /* ──────────────────────────────────────────────── primitives ── */

  set<T>(key: string, value: T, ttlSeconds = 120, tags: string[] = []): void {
    if (this.store.size >= MAX_ENTRIES) this._evict();
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1_000,
      staleAt:   now + ttlSeconds * SWR_FACTOR * 1_000,
      hits:      0,
      createdAt: now,
      tags,
    });
  }

  get<T>(key: string): T | null {
    const e = this.store.get(key);
    if (!e)                       { this._misses++; return null; }
    if (Date.now() > e.expiresAt) { this.store.delete(key); this._misses++; return null; }
    e.hits++;
    this._hits++;
    return e.value as T;
  }

  has(key: string): boolean {
    const e = this.store.get(key);
    if (!e) return false;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return false; }
    return true;
  }

  invalidate(keyOrPrefix?: string, tag?: string): void {
    if (!keyOrPrefix && !tag) { this.store.clear(); return; }
    for (const [k, e] of this.store) {
      if ((keyOrPrefix && k.includes(keyOrPrefix)) || (tag && e.tags.includes(tag)))
        this.store.delete(k);
    }
  }

  invalidateByTag(tag: string): void {
    for (const [k, e] of this.store)
      if (e.tags.includes(tag)) this.store.delete(k);
  }

  /* ──────────────────────────────────────────── singleflight + SWR ── */

  /**
   * The primary call used by api.ts.
   *
   * Sequence:
   *  1. L1 hot hit   → return immediately (0 ms)
   *  2. SWR hit      → return stale + fire 1 background refresh
   *  3. Inflight hit  → wait for the in-progress promise (dedup)
   *  4. Cold miss    → fetch, cache, return
   *
   * At 100 req/s all hitting key K simultaneously:
   *   - First caller fires the fetcher → stored in `inflight`
   *   - Callers 2–100 see the inflight entry → all await the same Promise
   *   - Result is cached once; all 100 callers resolve together
   *   → 1 DB round-trip, 100 responses
   */
  async fetch<T>(
    key:      string,
    fetcher:  () => Promise<T>,
    ttlS    = 120,
    useSWR  = true,
  ): Promise<T> {
    const e   = this.store.get(key);
    const now = Date.now();

    // L1 fresh hit
    if (e && now < e.staleAt) {
      e.hits++; this._hits++;
      return e.value as T;
    }

    // SWR: stale but not expired — serve immediately + refresh in background
    if (useSWR && e && now < e.expiresAt) {
      e.hits++; this._swr++;
      this._bgFetch(key, fetcher, ttlS);
      return e.value as T;
    }

    // Miss → singleflight
    this._misses++;
    return this._singleflight(key, fetcher, ttlS);
  }

  private _singleflight<T>(key: string, fetcher: () => Promise<T>, ttlS: number): Promise<T> {
    const live = this.inflight.get(key);
    if (live) { this._deduped++; return live; }

    const p = fetcher()
      .then(data => { this.set(key, data, ttlS); return data; })
      .finally(()  => { this.inflight.delete(key); });

    this.inflight.set(key, p);
    return p;
  }

  private _bgFetch<T>(key: string, fetcher: () => Promise<T>, ttlS: number): void {
    if (this.inflight.has(key)) return;
    this._singleflight(key, fetcher, ttlS).catch(() => {/* silent — stale still served */});
  }

  /* ────────────────────────────────────────────────── prefetch ── */

  /** Queue a background prefetch during idle time (unchanged public API). */
  prefetch(key: string, fetcher: () => Promise<any>, ttl = 120): void {
    if (this.has(key)) return;
    // Use requestIdleCallback when available; fall back to microtask
    const run = () => this._singleflight(key, fetcher, ttl).catch(() => {});
    if (typeof requestIdleCallback !== "undefined") requestIdleCallback(run);
    else Promise.resolve().then(run);
  }

  /** Warm multiple keys in parallel (Promise.allSettled — never throws). */
  async warm(entries: Record<string, { fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    await Promise.allSettled(
      Object.entries(entries).map(([k, { fetcher, ttl }]) =>
        this.fetch(k, fetcher, ttl ?? 120)
      )
    );
  }

  /* ────────────────────────────────────────────────── LRU evict ── */

  private _evict(): void {
    const now = Date.now();
    // Pass 1: remove hard-expired
    for (const [k, e] of this.store)
      if (now > e.expiresAt) this.store.delete(k);
    if (this.store.size < MAX_ENTRIES) return;
    // Pass 2: evict least-hit, oldest
    const sorted = [...this.store.entries()]
      .sort(([, a], [, b]) => a.hits - b.hits || a.createdAt - b.createdAt);
    sorted.slice(0, PRUNE_BATCH).forEach(([k]) => this.store.delete(k));
  }

  /** Auto-sweep every 5 minutes to free expired entries. */
  private _startSweep() {
    if (typeof window === "undefined") return;
    setInterval(() => {
      const now = Date.now();
      for (const [k, e] of this.store)
        if (now > e.expiresAt) this.store.delete(k);
    }, 5 * 60 * 1_000);
  }

  /* ─────────────────────────────────────────────── diagnostics ── */

  stats() {
    const total = this._hits + this._misses;
    return {
      entries:    this.store.size,
      inFlight:   this.inflight.size,
      hits:       this._hits,
      swrHits:    this._swr,
      misses:     this._misses,
      deduped:    this._deduped,
      hitRate:    total ? `${((this._hits + this._swr) / total * 100).toFixed(1)}%` : "0%",
      maxEntries: MAX_ENTRIES,
    };
  }
}

/* Singleton */
export const cache = new HighThroughputCache();

/* Cache key constants */
export const CACHE_KEYS = {
  SUPPLIERS:      "suppliers_list",
  ITEMS:          "items_list",
  REQUISITIONS:   "requisitions_list",
  PURCHASE_ORDERS:"purchase_orders_list",
  DEPARTMENTS:    "departments_list",
  CATEGORIES:     "categories_list",
  BUDGETS:        "budgets_list",
  VOUCHERS:       "vouchers_list",
  GL_ACCOUNTS:    "gl_accounts",
  NOTIFICATIONS:  "notifications_list",
  USERS:          "users_list",
  FACILITIES:     "facilities_list",
  SETTINGS:       "settings_",
  STAMPS:         "stamps_cfg_",
  ANALYTICS:      "analytics_kpis",
  APPROVAL_QUEUE: "approval_queue_list",
} as const;

/**
 * createBatcher — micro-batch multiple key lookups made in the same tick
 * into a single bulk DB call.
 *
 * Usage:
 *   const getUser = createBatcher(async (ids) => {
 *     const { data } = await db.from("profiles").select("*").in("id", ids);
 *     return new Map(data.map(u => [u.id, u]));
 *   });
 *   // 50 components each call getUser(id) → 1 DB query
 */
export function createBatcher<K, V>(
  batchFn: (keys: K[]) => Promise<Map<K, V>>,
  delayMs = 8,
): (key: K) => Promise<V> {
  const queue:  K[]  = [];
  const res:    Array<(v: V)     => void> = [];
  const rej:    Array<(e: any)   => void> = [];
  let timer:  ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    const ks = queue.splice(0), rs = res.splice(0), rj = rej.splice(0);
    timer = null;
    batchFn(ks)
      .then(map => ks.forEach((k, i) => {
        const v = map.get(k);
        v !== undefined ? rs[i](v) : rj[i](new Error(`Key not found: ${String(k)}`));
      }))
      .catch(e => rj.forEach(r => r(e)));
  };

  return (key: K) => new Promise<V>((resolve, reject) => {
    queue.push(key); res.push(resolve); rej.push(reject);
    if (!timer) timer = setTimeout(flush, delayMs);
  });
}
