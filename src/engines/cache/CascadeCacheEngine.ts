/** EL5 MediProcure v5.8 — Multi-Layer Cascade Cache Engine */
interface CacheEntry<T = unknown> { value: T; expiry: number; hitCount: number; }
export interface CacheOptions { ttl?: number; priority?: string; }
export interface CacheMetrics { hits: number; misses: number; hitRate: number; totalKeys: number; }

class L1Memory {
  private store = new Map<string, CacheEntry>();
  metrics: CacheMetrics = { hits: 0, misses: 0, hitRate: 0, totalKeys: 0 };
  get<T>(key: string): T | null {
    const e = this.store.get(key) as CacheEntry<T> | undefined;
    if (!e || e.expiry < Date.now()) { this.metrics.misses++; return null; }
    e.hitCount++; this.metrics.hits++;
    this.metrics.hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses);
    return e.value;
  }
  set<T>(key: string, value: T, ttlMs = 60000): void {
    if (this.store.size > 1000) [...this.store.keys()].slice(0, 200).forEach(k => this.store.delete(k));
    this.store.set(key, { value, expiry: Date.now() + ttlMs, hitCount: 0 });
    this.metrics.totalKeys = this.store.size;
  }
  delete(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

class L2Session {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(`el5_${key}`);
      if (!raw) return null;
      const e: CacheEntry<T> = JSON.parse(raw);
      if (e.expiry < Date.now()) { sessionStorage.removeItem(`el5_${key}`); return null; }
      return e.value;
    } catch { return null; }
  }
  set<T>(key: string, value: T, ttlMs = 300000): void {
    try { sessionStorage.setItem(`el5_${key}`, JSON.stringify({ value, expiry: Date.now() + ttlMs, hitCount: 0 })); } catch { /**/ }
  }
  delete(key: string): void { try { sessionStorage.removeItem(`el5_${key}`); } catch { /**/ } }
}

export class CascadeCacheEngine {
  private l1 = new L1Memory();
  private l2 = new L2Session();

  get<T>(key: string): T | null {
    const v1 = this.l1.get<T>(key);
    if (v1 !== null) return v1;
    const v2 = this.l2.get<T>(key);
    if (v2 !== null) { this.l1.set(key, v2); return v2; }
    return null;
  }
  set<T>(key: string, value: T, options?: CacheOptions): void {
    const ms = (options?.ttl || 60) * 1000;
    this.l1.set(key, value, ms);
    this.l2.set(key, value, Math.max(ms, 300000));
  }
  delete(key: string): void { this.l1.delete(key); this.l2.delete(key); }
  getMetrics(): CacheMetrics { return this.l1.metrics; }
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    this.set(key, value, options);
    return value;
  }
}
export const cacheEngine = new CascadeCacheEngine();
