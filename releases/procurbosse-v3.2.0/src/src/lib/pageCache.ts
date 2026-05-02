/**
 * ProcurBosse - Page Cache Engine v1.0
 * Caches last known page data to prevent blank screens on refresh
 * Uses localStorage with TTL per page
 * EL5 MediProcure - Embu Level 5 Hospital
 */

const PREFIX = "el5_page_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  ts: number;
  ttl: number;
}

export const pageCache = {
  /** Store data for a page */
  set<T>(page: string, data: T, ttl = DEFAULT_TTL): void {
    try {
      const entry: CacheEntry<T> = { data, ts: Date.now(), ttl };
      localStorage.setItem(PREFIX + page, JSON.stringify(entry));
    } catch {}
  },

  /** Get cached data if still fresh */
  get<T>(page: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + page);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.ts > entry.ttl) {
        localStorage.removeItem(PREFIX + page);
        return null;
      }
      return entry.data;
    } catch { return null; }
  },

  /** Clear a specific page cache */
  clear(page: string): void {
    try { localStorage.removeItem(PREFIX + page); } catch {}
  },

  /** Clear all page caches */
  clearAll(): void {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  /** Check if fresh data exists */
  has(page: string): boolean {
    return this.get(page) !== null;
  },
};

/** 
 * Supabase query with cache fallback
 * If query fails, returns cached data to prevent blank screen
 */
export async function cachedQuery<T>(
  page: string,
  queryFn: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<{ data: T | null; fromCache: boolean; error: any }> {
  try {
    const data = await queryFn();
    if (data !== null && data !== undefined) {
      pageCache.set(page, data, ttl);
    }
    return { data, fromCache: false, error: null };
  } catch (error) {
    const cached = pageCache.get<T>(page);
    if (cached !== null) {
      console.warn(`[PageCache] Using cached data for ${page} due to error:`, error);
      return { data: cached, fromCache: true, error };
    }
    return { data: null, fromCache: false, error };
  }
}

export default pageCache;

// Convenience aliases
export const clearPageCache = pageCache.clearAll.bind(pageCache);
export const clearSingleCache = pageCache.clear.bind(pageCache);
