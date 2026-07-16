/**
 * ProcurBosse — Page Cache v2.0
 * Caches last known page data to prevent blank screens on refresh.
 * Now backed by cacheBuckets (quota-safe eviction, byte-budgeted) instead
 * of raw localStorage.setItem, which silently stopped writing anything
 * once the quota filled — exactly the "under duress" scenario this
 * cache exists to protect against. Same public API as v1, so every
 * existing caller (RequisitionsPage, PurchaseOrdersPage, SuppliersPage,
 * ItemsPage, GlobalSearchBar, ...) keeps working unchanged.
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { cacheBuckets } from "./cacheBuckets";

const DEFAULT_TTL = Number.MAX_SAFE_INTEGER; // keep page data visible until explicit logout/cache clear

export const pageCache = {
  /** Store data for a page */
  set<T>(page: string, data: T, ttl = DEFAULT_TTL): void {
    cacheBuckets.set("page", page, data, ttl);
  },

  /** Get cached data if still fresh */
  get<T>(page: string): T | null {
    return cacheBuckets.get<T>("page", page);
  },

  /** Get cached data even if past TTL — last resort when there's
   *  nothing fresher to show (e.g. circuit breaker open, offline). */
  getStale<T>(page: string): T | null {
    const r = cacheBuckets.getStale<T>("page", page);
    return r ? r.value : null;
  },

  /** Clear a specific page cache */
  clear(page: string): void {
    cacheBuckets.clear("page", page);
  },

  /** Clear all page caches */
  clearAll(): void {
    cacheBuckets.clearBucket("page");
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
    const cached = pageCache.getStale<T>(page);
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
