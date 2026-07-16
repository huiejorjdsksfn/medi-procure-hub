/**
 * ProcurBosse — Cache Buckets v1.0
 * A single, persistent (localStorage-backed), quota-safe cache layer
 * shared by every "load fast even under duress" consumer in the app
 * (page snapshots, dropdown reference data, dashboard tiles, document
 * metadata). Replaces two previously-separate, weaker caches:
 *   - pageCache.ts's raw localStorage.setItem with no eviction — a full
 *     quota silently no-ops every future write via its try/catch
 *   - useCachedDropdown's plain in-memory Map — wiped on every reload,
 *     so a refresh during a flaky connection means every dropdown on
 *     the page blocks on the network again from zero
 *
 * Design:
 *   - Named buckets, each with its own TTL and byte budget, so one
 *     heavy bucket (e.g. a big requisitions list) can't starve or evict
 *     a small one (e.g. departments) it has nothing to do with.
 *   - get() returns fresh-only; getStale() returns the value even past
 *     TTL, for "show something instead of a blank screen" fallback
 *     when the network/circuit breaker won't cooperate.
 *   - set() never throws. On QuotaExceededError it evicts the globally
 *     oldest entries first (across all buckets) and retries once, then
 *     gives up silently rather than crashing the write path.
 *   - Proactively self-trims in the background so it rarely hits the
 *     hard quota in the first place.
 */

export type BucketName = "page" | "dropdown" | "dashboard" | "document-meta" | "search" | "misc";

interface Entry<T> { v: T; ts: number; ttl: number; }

const PREFIX = "el5_cache_v1:";
const MAX_TOTAL_BYTES = 2_000_000; // ~2MB soft budget for our prefix, well under typical 5-10MB quota

const BUCKET_TTL: Record<BucketName, number> = {
  page: Number.MAX_SAFE_INTEGER,     // kept until explicit clear/eviction, matches prior pageCache behavior
  dropdown: 30 * 60_000,             // 30 min — reference data changes rarely
  dashboard: 5 * 60_000,             // 5 min — KPI tiles should feel current
  "document-meta": 15 * 60_000,
  search: 10 * 60_000,
  misc: 10 * 60_000,
};

function storageKey(bucket: BucketName, key: string): string {
  return `${PREFIX}${bucket}:${key}`;
}

function allEntries(): { key: string; ts: number; size: number }[] {
  const out: { key: string; ts: number; size: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as Entry<unknown>;
        out.push({ key: k, ts: parsed.ts || 0, size: raw.length });
      } catch {
        out.push({ key: k, ts: 0, size: raw.length }); // corrupt entry — treat as oldest, evict first
      }
    }
  } catch { /* localStorage unavailable (SSR, privacy mode) */ }
  return out;
}

/** Evict the globally oldest N of our entries, across all buckets. */
function evictOldest(n: number): void {
  const entries = allEntries().sort((a, b) => a.ts - b.ts);
  for (const e of entries.slice(0, n)) {
    try { localStorage.removeItem(e.key); } catch { /* nothing more we can do */ }
  }
}

/** Proactive self-trim: if our footprint is over budget, evict oldest
 *  entries until back under it. Cheap enough to run opportunistically
 *  on writes rather than needing a timer. */
function trimIfOverBudget(): void {
  const entries = allEntries();
  let total = entries.reduce((sum, e) => sum + e.size, 0);
  if (total <= MAX_TOTAL_BYTES) return;
  const sorted = entries.sort((a, b) => a.ts - b.ts);
  for (const e of sorted) {
    if (total <= MAX_TOTAL_BYTES) break;
    try { localStorage.removeItem(e.key); total -= e.size; } catch { break; }
  }
}

export const cacheBuckets = {
  /** Store a value. Never throws — on quota pressure it evicts the
   *  globally oldest entries and retries once, then gives up quietly. */
  set<T>(bucket: BucketName, key: string, value: T, ttlOverrideMs?: number): void {
    const entry: Entry<T> = { v: value, ts: Date.now(), ttl: ttlOverrideMs ?? BUCKET_TTL[bucket] };
    const str = JSON.stringify(entry);
    try {
      localStorage.setItem(storageKey(bucket, key), str);
    } catch {
      evictOldest(15);
      try { localStorage.setItem(storageKey(bucket, key), str); } catch { /* give up silently */ }
    }
    trimIfOverBudget();
  },

  /** Fresh-only read — returns null once past the bucket's TTL. */
  get<T>(bucket: BucketName, key: string): T | null {
    try {
      const raw = localStorage.getItem(storageKey(bucket, key));
      if (!raw) return null;
      const entry: Entry<T> = JSON.parse(raw);
      if (Number.isFinite(entry.ttl) && Date.now() - entry.ts > entry.ttl) return null;
      return entry.v;
    } catch { return null; }
  },

  /** Stale-tolerant read — returns the value even if past TTL, for
   *  "something is better than a blank screen" fallback when the
   *  network/circuit breaker won't serve a fresh copy. Returns null
   *  only if nothing was ever cached. */
  getStale<T>(bucket: BucketName, key: string): { value: T; isStale: boolean } | null {
    try {
      const raw = localStorage.getItem(storageKey(bucket, key));
      if (!raw) return null;
      const entry: Entry<T> = JSON.parse(raw);
      const isStale = Number.isFinite(entry.ttl) && Date.now() - entry.ts > entry.ttl;
      return { value: entry.v, isStale };
    } catch { return null; }
  },

  ageMs(bucket: BucketName, key: string): number | null {
    try {
      const raw = localStorage.getItem(storageKey(bucket, key));
      if (!raw) return null;
      const entry: Entry<unknown> = JSON.parse(raw);
      return Date.now() - entry.ts;
    } catch { return null; }
  },

  clear(bucket: BucketName, key: string): void {
    try { localStorage.removeItem(storageKey(bucket, key)); } catch {}
  },

  /** List the (unprefixed) keys currently stored in one bucket — used
   *  for targeted invalidation sweeps (e.g. "clear every dropdown cache
   *  entry that mentions this table") without nuking the whole bucket. */
  keysInBucket(bucket: BucketName): string[] {
    const p = `${PREFIX}${bucket}:`;
    try {
      return Object.keys(localStorage).filter(k => k.startsWith(p)).map(k => k.slice(p.length));
    } catch { return []; }
  },

  /** Clear every key in one bucket (e.g. on logout, or a table-wide
   *  realtime invalidation). */
  clearBucket(bucket: BucketName): void {
    try {
      const p = `${PREFIX}${bucket}:`;
      Object.keys(localStorage).filter(k => k.startsWith(p)).forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  /** Clear everything this layer owns — used on logout. */
  clearAll(): void {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  /** Debug/health snapshot — bucket counts and total bytes, for a
   *  future ops panel alongside netEngine.health(). */
  stats(): { bucket: string; count: number; bytes: number }[] {
    const byBucket = new Map<string, { count: number; bytes: number }>();
    for (const e of allEntries()) {
      const bucket = e.key.slice(PREFIX.length).split(":")[0] || "misc";
      const cur = byBucket.get(bucket) || { count: 0, bytes: 0 };
      cur.count++; cur.bytes += e.size;
      byBucket.set(bucket, cur);
    }
    return Array.from(byBucket.entries()).map(([bucket, v]) => ({ bucket, ...v }));
  },
};

/**
 * Stale-while-revalidate wrapper: returns cached data (even if stale)
 * immediately when present, and always kicks off a background refresh.
 * Callers get an instant paint from cache plus a fresh copy the moment
 * the network responds — the core "fast even under duress" behavior.
 */
export async function staleWhileRevalidate<T>(
  bucket: BucketName,
  key: string,
  fetcher: () => Promise<T>,
  opts: { ttlOverrideMs?: number; onFresh?: (data: T) => void } = {}
): Promise<{ data: T | null; fromCache: boolean; isStale: boolean; error: any }> {
  const cached = cacheBuckets.getStale<T>(bucket, key);

  const refresh = async () => {
    try {
      const fresh = await fetcher();
      cacheBuckets.set(bucket, key, fresh, opts.ttlOverrideMs);
      opts.onFresh?.(fresh);
      return { data: fresh, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  if (cached) {
    // Return cached immediately; refresh in the background without
    // blocking the caller. Errors during background refresh are
    // swallowed here — the caller already has data to show.
    refresh().catch(() => {});
    return { data: cached.value, fromCache: true, isStale: cached.isStale, error: null };
  }

  // Nothing cached at all — this one call has to wait on the network.
  const { data, error } = await refresh();
  return { data, fromCache: false, isStale: false, error };
}

export default cacheBuckets;
