/**
 * EL5 MediProcure — SmartCache v1.0
 * Multi-layer caching: Memory → sessionStorage → localStorage → IndexedDB
 * Each layer has configurable TTLs and auto-promotion/demotion.
 *
 * Tiers:
 *  L1 — Memory (Map)         — fastest, lost on page refresh, ~400 entries
 *  L2 — sessionStorage       — survives tab navigation, lost on tab close
 *  L3 — localStorage         — persists across tabs, ~5MB per origin
 *  L4 — IndexedDB            — large payloads, binary data, unlimited size
 *
 * Usage:
 *   import { smartCache } from "@/lib/smartCache";
 *   await smartCache.set("suppliers", data, { ttl: 300, tier: "local" });
 *   const hit = await smartCache.get("suppliers");
 *
 * ProcurBosse · Embu Level 5 Hospital
 */

export type CacheTier = "memory" | "session" | "local" | "idb";

export interface SmartCacheOptions {
  ttl?: number;          // seconds (default 300 = 5 min)
  tier?: CacheTier;      // target write tier (default: "local")
  tags?: string[];       // for tag-based invalidation
}

interface CachePayload<T = unknown> {
  v: T;                  // value
  exp: number;           // expiry timestamp (ms)
  tags: string[];
}

// ── Prefixes ────────────────────────────────────────────────────────────────
const PFX_SS  = "el5_ss_v1_";   // sessionStorage prefix
const PFX_LS  = "el5_ls_v1_";   // localStorage prefix
const IDB_DB  = "el5_idb_v1";
const IDB_ST  = "cache";

// ── IndexedDB helpers ────────────────────────────────────────────────────────
let _idb: IDBDatabase | null = null;
function openIDB(): Promise<IDBDatabase> {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_ST)) db.createObjectStore(IDB_ST);
    };
    req.onsuccess = () => { _idb = req.result; res(req.result); };
    req.onerror   = () => rej(req.error);
  });
}

async function idbGet<T>(key: string): Promise<CachePayload<T> | null> {
  try {
    const db  = await openIDB();
    return new Promise((res) => {
      const tx  = db.transaction(IDB_ST, "readonly");
      const req = tx.objectStore(IDB_ST).get(key);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => res(null);
    });
  } catch { return null; }
}

async function idbSet<T>(key: string, payload: CachePayload<T>): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((res) => {
      const tx  = db.transaction(IDB_ST, "readwrite");
      const req = tx.objectStore(IDB_ST).put(payload, key);
      req.onsuccess = () => res();
      req.onerror   = () => res();
    });
  } catch {}
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((res) => {
      const tx = db.transaction(IDB_ST, "readwrite");
      tx.objectStore(IDB_ST).delete(key);
      tx.oncomplete = () => res();
    });
  } catch {}
}

async function idbKeys(): Promise<string[]> {
  try {
    const db = await openIDB();
    return new Promise((res) => {
      const tx  = db.transaction(IDB_ST, "readonly");
      const req = tx.objectStore(IDB_ST).getAllKeys();
      req.onsuccess = () => res(req.result as string[]);
      req.onerror   = () => res([]);
    });
  } catch { return []; }
}

// ── Storage helpers ──────────────────────────────────────────────────────────
function ssRead<T>(key: string): CachePayload<T> | null {
  try {
    const raw = sessionStorage.getItem(PFX_SS + key);
    return raw ? (JSON.parse(raw) as CachePayload<T>) : null;
  } catch { return null; }
}
function ssWrite<T>(key: string, p: CachePayload<T>): void {
  try { sessionStorage.setItem(PFX_SS + key, JSON.stringify(p)); } catch {}
}
function ssDelete(key: string): void {
  try { sessionStorage.removeItem(PFX_SS + key); } catch {}
}
function ssKeys(): string[] {
  try {
    return Object.keys(sessionStorage)
      .filter(k => k.startsWith(PFX_SS))
      .map(k => k.slice(PFX_SS.length));
  } catch { return []; }
}

function lsRead<T>(key: string): CachePayload<T> | null {
  try {
    const raw = localStorage.getItem(PFX_LS + key);
    return raw ? (JSON.parse(raw) as CachePayload<T>) : null;
  } catch { return null; }
}
function lsWrite<T>(key: string, p: CachePayload<T>): void {
  try { localStorage.setItem(PFX_LS + key, JSON.stringify(p)); } catch {}
}
function lsDelete(key: string): void {
  try { localStorage.removeItem(PFX_LS + key); } catch {}
}
function lsKeys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PFX_LS))
      .map(k => k.slice(PFX_LS.length));
  } catch { return []; }
}

// ── SmartCache class ─────────────────────────────────────────────────────────
class SmartCache {
  private mem = new Map<string, CachePayload<unknown>>();
  private readonly DEFAULT_TTL  = 300;   // 5 minutes
  private readonly DEFAULT_TIER: CacheTier = "local";

  // ── Write ──────────────────────────────────────────────────────────────────
  async set<T>(key: string, value: T, opts: SmartCacheOptions = {}): Promise<void> {
    const ttl  = (opts.ttl  ?? this.DEFAULT_TTL) * 1000;
    const tier = opts.tier  ?? this.DEFAULT_TIER;
    const tags = opts.tags  ?? [];
    const payload: CachePayload<T> = { v: value, exp: Date.now() + ttl, tags };

    // Always write to L1 memory
    this.mem.set(key, payload as CachePayload<unknown>);

    if (tier === "memory") return;
    if (tier === "session" || tier === "local" || tier === "idb") ssWrite(key, payload);
    if (tier === "local"   || tier === "idb")                      lsWrite(key, payload);
    if (tier === "idb")                                             await idbSet(key, payload);
  }

  // ── Read ───────────────────────────────────────────────────────────────────
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // L1 — memory
    const m = this.mem.get(key) as CachePayload<T> | undefined;
    if (m && now < m.exp) return m.v;
    if (m) this.mem.delete(key);

    // L2 — sessionStorage
    const ss = ssRead<T>(key);
    if (ss) {
      if (now < ss.exp) {
        this.mem.set(key, ss as CachePayload<unknown>); // promote to L1
        return ss.v;
      }
      ssDelete(key);
    }

    // L3 — localStorage
    const ls = lsRead<T>(key);
    if (ls) {
      if (now < ls.exp) {
        this.mem.set(key, ls as CachePayload<unknown>); // promote to L1
        ssWrite(key, ls);                               // promote to L2
        return ls.v;
      }
      lsDelete(key);
    }

    // L4 — IndexedDB
    const idb = await idbGet<T>(key);
    if (idb) {
      if (now < idb.exp) {
        this.mem.set(key, idb as CachePayload<unknown>);
        ssWrite(key, idb);
        lsWrite(key, idb);
        return idb.v;
      }
      await idbDelete(key);
    }

    return null;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async delete(key: string): Promise<void> {
    this.mem.delete(key);
    ssDelete(key);
    lsDelete(key);
    await idbDelete(key);
  }

  // ── Tag invalidation ───────────────────────────────────────────────────────
  async invalidateTag(tag: string): Promise<void> {
    // L1
    for (const [k, v] of this.mem.entries()) {
      if (v.tags.includes(tag)) this.mem.delete(k);
    }
    // L2 + L3
    const allKeys = new Set([...ssKeys(), ...lsKeys()]);
    for (const k of allKeys) {
      const p = ssRead(k) || lsRead(k);
      if (p?.tags.includes(tag)) { ssDelete(k); lsDelete(k); }
    }
    // L4
    const idbKs = await idbKeys();
    for (const k of idbKs) {
      const p = await idbGet(k);
      if (p?.tags.includes(tag)) await idbDelete(k);
    }
  }

  // ── Clear all ──────────────────────────────────────────────────────────────
  async clearAll(): Promise<void> {
    this.mem.clear();
    ssKeys().forEach(ssDelete);
    lsKeys().forEach(lsDelete);
    const idbKs = await idbKeys();
    await Promise.all(idbKs.map(idbDelete));
  }

  // ── Sweep expired ──────────────────────────────────────────────────────────
  async sweep(): Promise<void> {
    const now = Date.now();
    for (const [k, v] of this.mem.entries()) {
      if (now > v.exp) this.mem.delete(k);
    }
    ssKeys().forEach(k => { const p = ssRead(k); if (!p || now > p.exp) ssDelete(k); });
    lsKeys().forEach(k => { const p = lsRead(k); if (!p || now > p.exp) lsDelete(k); });
    const idbKs = await idbKeys();
    await Promise.all(idbKs.map(async k => {
      const p = await idbGet(k);
      if (!p || now > p.exp) await idbDelete(k);
    }));
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  async stats() {
    return {
      memory:  this.mem.size,
      session: ssKeys().length,
      local:   lsKeys().length,
      idb:     (await idbKeys()).length,
    };
  }

  // ── Fetch-with-cache helper ────────────────────────────────────────────────
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts: SmartCacheOptions = {},
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const result = await fetcher();
    await this.set(key, result, opts);
    return result;
  }
}

export const smartCache = new SmartCache();

// Auto-sweep every 10 minutes
if (typeof window !== "undefined") {
  setInterval(() => smartCache.sweep(), 10 * 60 * 1000);
}

// ── Cookie utilities (enhanced) ──────────────────────────────────────────────
export const cookieUtils = {
  /**
   * Write a cookie with full options
   * @param name   cookie name
   * @param value  cookie value (will be JSON-encoded if object)
   * @param maxAge seconds until expiry
   * @param opts   path, domain, sameSite, secure
   */
  set(
    name: string,
    value: unknown,
    maxAge = 3600,
    opts: { path?: string; sameSite?: "Strict" | "Lax" | "None"; secure?: boolean } = {},
  ): void {
    const encoded  = typeof value === "string" ? value : encodeURIComponent(JSON.stringify(value));
    const path     = opts.path     ?? "/";
    const sameSite = opts.sameSite ?? "Lax";
    const secure   = (opts.secure ?? location.protocol === "https:") ? "; Secure" : "";
    document.cookie = `${name}=${encoded}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}${secure}`;
  },

  get<T = string>(name: string): T | null {
    const prefix = `${name}=`;
    const part   = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(prefix));
    if (!part) return null;
    const raw = part.slice(prefix.length);
    try { return JSON.parse(decodeURIComponent(raw)) as T; } catch { return raw as unknown as T; }
  },

  delete(name: string, path = "/"): void {
    document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
  },

  /** Write all ERP app-level cookies in one call */
  writeAppCookies(userId: string, role: string, facility: string): void {
    const base = { sameSite: "Lax" as const };
    this.set("el5_uid",      userId,   8 * 3600, base);
    this.set("el5_role",     role,     8 * 3600, base);
    this.set("el5_facility", facility, 8 * 3600, base);
    this.set("el5_ts",       Date.now(), 8 * 3600, base);
    this.set("el5_pwa",      "1",       365 * 24 * 3600, base); // PWA install tracking
  },

  clearAppCookies(): void {
    ["el5_uid", "el5_role", "el5_facility", "el5_ts"].forEach(n => this.delete(n));
  },
};
