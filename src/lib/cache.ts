/**
 * ProcurBosse — Client-side Cache Layer v5.8
 * In-memory LRU cache with TTL support for ERP performance
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

class ERPCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 200, defaultTTLSeconds = 60) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = [...this.store.entries()].sort((a, b) => a[1].hits - b[1].hits)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL),
      hits: 0,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    entry.hits++;
    return entry.value as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) { this.store.clear(); return; }
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) this.store.delete(key);
    }
  }

  stats() {
    let valid = 0, expired = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      now > entry.expiresAt ? expired++ : valid++;
    }
    return { total: this.store.size, valid, expired, maxSize: this.maxSize };
  }
}

export const cache = new ERPCache(300, 120);

// Cache keys registry
export const CACHE_KEYS = {
  SUPPLIERS:       "suppliers",
  ITEMS:           "items",
  DEPARTMENTS:     "departments",
  CATEGORIES:      "categories",
  PURCHASE_ORDERS: "purchase_orders",
  REQUISITIONS:    "requisitions",
  USERS:           "users",
  SETTINGS:        "settings",
  BUDGETS:         "budgets",
  GL_ACCOUNTS:     "gl_accounts",
  NOTIFICATIONS:   "notifications",
  VOUCHERS:        "vouchers",
};

// Helper: fetch with cache
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 120
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const result = await fetcher();
  cache.set(key, result, ttlSeconds);
  return result;
}
