/**
 * ProcurBosse — Client-side Cache Layer v5.9
 * LRU cache with TTL, prefetch queue, tag-based invalidation & warm-up
 * Embu Level 5 Hospital · EL5 MediProcure
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
  tags: string[];
}

class ERPCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;
  private prefetchQueue: Array<{ key: string; fetcher: () => Promise<any>; ttl: number }> = [];
  private prefetchRunning = false;
  private hitCount = 0;
  private missCount = 0;

  constructor(maxSize = 400, defaultTTLSeconds = 120) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLSeconds * 1000;
    // Auto-sweep expired entries every 5 min
    if (typeof window !== "undefined") {
      setInterval(() => this.sweep(), 5 * 60 * 1000);
    }
  }

  set<T>(key: string, value: T, ttlSeconds?: number, tags: string[] = []): void {
    if (this.store.size >= this.maxSize) this.evict();
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTTL),
      hits: 0,
      createdAt: Date.now(),
      tags,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) { this.missCount++; return null; }
    if (Date.now() > entry.expiresAt) { this.store.delete(key); this.missCount++; return null; }
    entry.hits++;
    this.hitCount++;
    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return false; }
    return true;
  }

  /** Invalidate by key prefix or tag */
  invalidate(pattern?: string, tag?: string): void {
    if (!pattern && !tag) { this.store.clear(); return; }
    for (const [key, entry] of this.store.entries()) {
      const matchesPattern = pattern && key.includes(pattern);
      const matchesTag = tag && entry.tags.includes(tag);
      if (matchesPattern || matchesTag) this.store.delete(key);
    }
  }

  /** Remove all entries with a specific tag */
  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) this.store.delete(key);
    }
  }

  /** Queue a background prefetch (runs during idle time) */
  prefetch(key: string, fetcher: () => Promise<any>, ttl = 120): void {
    if (this.has(key)) return; // Already cached
    this.prefetchQueue.push({ key, fetcher, ttl });
    this.drainPrefetchQueue();
  }

  private async drainPrefetchQueue(): Promise<void> {
    if (this.prefetchRunning || this.prefetchQueue.length === 0) return;
    this.prefetchRunning = true;
    const run = () => {
      if (this.prefetchQueue.length === 0) { this.prefetchRunning = false; return; }
      const task = this.prefetchQueue.shift()!;
      if (!this.has(task.key)) {
        task.fetcher().then(value => {
          if (value && !value.error) this.set(task.key, value, task.ttl);
        }).catch(() => {}).finally(run);
      } else {
        run();
      }
    };
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run);
    } else {
      setTimeout(run, 100);
    }
  }

  /** Evict: remove least recently used */
  private evict(): void {
    const now = Date.now();
    // First, remove expired
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) { this.store.delete(key); if (this.store.size < this.maxSize) return; }
    }
    // Then LRU (lowest hits + oldest)
    const sorted = [...this.store.entries()].sort((a, b) => {
      const aScore = a[1].hits + (now - a[1].createdAt) / 1000;
      const bScore = b[1].hits + (now - b[1].createdAt) / 1000;
      return aScore - bScore;
    });
    const toRemove = Math.ceil(this.maxSize * 0.1); // Evict 10%
    sorted.slice(0, toRemove).forEach(([key]) => this.store.delete(key));
  }

  /** Remove all expired entries */
  sweep(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) { this.store.delete(key); removed++; }
    }
    return removed;
  }

  stats() {
    let valid = 0, expired = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      now > entry.expiresAt ? expired++ : valid++;
    }
    const total = this.hitCount + this.missCount;
    return {
      total: this.store.size,
      valid,
      expired,
      maxSize: this.maxSize,
      hitRate: total > 0 ? `${Math.round((this.hitCount / total) * 100)}%` : "n/a",
      hits: this.hitCount,
      misses: this.missCount,
      prefetchQueueLen: this.prefetchQueue.length,
    };
  }

  /** Warm up the cache with a list of keys */
  async warmUp(tasks: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    await Promise.allSettled(
      tasks.map(async ({ key, fetcher, ttl }) => {
        if (!this.has(key)) {
          try {
            const value = await fetcher();
            if (value) this.set(key, value, ttl ?? 120);
          } catch { /* silent */ }
        }
      })
    );
  }
}

export const cache = new ERPCache(400, 120);

// Cache keys registry (expanded v5.9)
export const CACHE_KEYS = {
  SUPPLIERS:         "suppliers",
  ITEMS:             "items",
  DEPARTMENTS:       "departments",
  CATEGORIES:        "categories",
  PURCHASE_ORDERS:   "purchase_orders",
  REQUISITIONS:      "requisitions",
  USERS:             "users",
  SETTINGS:          "settings",
  BUDGETS:           "budgets",
  GL_ACCOUNTS:       "gl_accounts",
  NOTIFICATIONS:     "notifications",
  VOUCHERS:          "vouchers",
  CONTRACTS:         "contracts",
  TENDERS:           "tenders",
  FACILITIES:        "facilities",
  FIXED_ASSETS:      "fixed_assets",
  DOCUMENTS:         "documents",
  ANALYTICS:         "analytics",
  REPORTS:           "reports",
  INSPECTIONS:       "inspections",
  PROCUREMENT_PLANS: "procurement_plans",
  STOCK_MOVEMENTS:   "stock_movements",
  AUDIT_LOG:         "audit_log",
  BROADCASTS:        "broadcasts",
  IP_RULES:          "ip_rules",
};

// Helper: fetch with cache
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 120,
  tags: string[] = []
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const result = await fetcher();
  cache.set(key, result, ttlSeconds, tags);
  return result;
}

// Helper: fetch with cache + stale-while-revalidate
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 120,
  staleTTL = 300
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    // Revalidate in background after TTL but serve stale within staleTTL
    cache.prefetch(key + "_revalidate", async () => {
      const fresh = await fetcher();
      cache.set(key, fresh, ttlSeconds);
      return fresh;
    }, ttlSeconds);
    return cached;
  }
  const result = await fetcher();
  cache.set(key, result, staleTTL);
  return result;
}
