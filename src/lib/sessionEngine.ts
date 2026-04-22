/**
 * ProcurBosse — Session Persistence Engine v2.0
 * Prevents logout / access-denied on page refresh or token expiry
 * Uses IndexedDB + localStorage dual-store with background refresh
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

const DB_NAME  = "el5_session_v2";
const STORE    = "auth";
const KEY      = "current";
const TTL_MS   = 8 * 60 * 60 * 1000;   // 8 hours
const ROLE_TTL = 30 * 60 * 1000;        // 30 min role cache
const LS_KEY   = "el5_sess_v2";
const LS_ROLES = "el5_roles_v2";

export interface StoredSession {
  userId:    string;
  email:     string;
  profile:   any;
  roles:     string[];
  token:     string;
  expiresAt: number;
  rolesCachedAt: number;
}

/* ── IndexedDB helpers ─────────────────────────────────────────────────── */
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function idbGet(): Promise<StoredSession | null> {
  try {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => rej(req.error);
    });
  } catch { return null; }
}

async function idbSet(data: StoredSession): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).put(data, KEY);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  } catch {}
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((res) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => res();
    });
  } catch {}
}

/* ── Session Engine class ──────────────────────────────────────────────── */
class SessionEngine {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;

  /** Save session to both IndexedDB and localStorage */
  async save(data: StoredSession): Promise<void> {
    await idbSet(data);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ userId: data.userId, email: data.email, expiresAt: data.expiresAt }));
      localStorage.setItem(LS_ROLES, JSON.stringify({ roles: data.roles, profile: data.profile, cachedAt: data.rolesCachedAt }));
    } catch {}
  }

  /** Read session — IndexedDB first, localStorage fallback */
  async read(): Promise<StoredSession | null> {
    const idb = await idbGet();
    if (idb && Date.now() < idb.expiresAt) return idb;

    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(LS_KEY);
      const rc  = localStorage.getItem(LS_ROLES);
      if (!raw || !rc) return null;
      const sess  = JSON.parse(raw);
      const roles = JSON.parse(rc);
      if (Date.now() > sess.expiresAt) return null;
      return { ...sess, roles: roles.roles, profile: roles.profile, token: "", rolesCachedAt: roles.cachedAt };
    } catch { return null; }
  }

  /** Clear all stored session data */
  async clear(): Promise<void> {
    await idbClear();
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_ROLES);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  /** Read roles from cache (instant, no network) */
  readRolesCache(): { roles: string[]; profile: any } | null {
    try {
      const rc = localStorage.getItem(LS_ROLES);
      if (!rc) return null;
      const { roles, profile, cachedAt } = JSON.parse(rc);
      if (Date.now() - cachedAt > ROLE_TTL) return null;
      return { roles, profile };
    } catch { return null; }
  }

  /** Update roles cache only (no full session refresh) */
  async updateRoles(userId: string): Promise<{ roles: string[]; profile: any }> {
    const [pRes, rRes] = await Promise.allSettled([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const profile = pRes.status === "fulfilled" ? pRes.value.data : null;
    const roles   = rRes.status === "fulfilled"
      ? (rRes.value.data as any[] || []).map((r: any) => r.role)
      : [];

    // Write to localStorage
    try {
      localStorage.setItem(LS_ROLES, JSON.stringify({ roles, profile, cachedAt: Date.now() }));
    } catch {}

    // Update IndexedDB
    const stored = await idbGet();
    if (stored) await idbSet({ ...stored, roles, profile, rolesCachedAt: Date.now() });

    return { roles, profile };
  }

  /** Start background token refresh (every 45 min) */
  startRefresh(userId: string): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(async () => {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          const stored = await idbGet();
          if (stored) {
            await this.save({
              ...stored,
              token:     data.session.access_token,
              expiresAt: Date.now() + TTL_MS,
            });
          }
        }
      } catch {}
      this.refreshing = false;
    }, 45 * 60 * 1000);
  }

  /** Build a StoredSession from Supabase auth data */
  async buildFromAuth(userId: string, email: string, token: string): Promise<StoredSession> {
    const { roles, profile } = await this.updateRoles(userId);
    return {
      userId, email, profile, roles, token,
      expiresAt:     Date.now() + TTL_MS,
      rolesCachedAt: Date.now(),
    };
  }
}

export const sessionEngine = new SessionEngine();
