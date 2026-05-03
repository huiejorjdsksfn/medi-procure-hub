/**
 * ProcurBosse Offline Engine v5.8.0
 * Handles: offline login, credential cache, queue sync, status detection
 */

const DB_NAME   = "procurbosse_offline";
const DB_VER    = 3;
const STORES    = ["credentials","queue","pages","settings","last_sync"];

// ── IndexedDB helpers ──────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "key" }); });
    };
    req.onsuccess  = (e: any) => res(e.target.result);
    req.onerror    = ()       => rej(req.error);
  });
}

async function idbGet(store: string, key: string): Promise<any> {
  const db  = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result?.value ?? null);
    req.onerror   = () => rej(req.error);
  });
}

async function idbSet(store: string, key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, "readwrite");
    tx.objectStore(store).put({ key, value, updated: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ── Offline credential cache ───────────────────────────────────────────────
export async function cacheCredentials(email: string, passwordHash: string, roles: string[], profile: any) {
  await idbSet("credentials", email.toLowerCase(), { email, passwordHash, roles, profile, cached: Date.now() });
}

export async function getCachedCredential(email: string) {
  return idbGet("credentials", email.toLowerCase());
}

// Simple hash — not for security, just identity check
export async function hashPassword(password: string): Promise<string> {
  if (typeof crypto.subtle === "undefined") return btoa(password + "_procurbosse");
  const enc  = new TextEncoder().encode(password + "_procurbosse_salt_el5");
  const buf  = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyOfflineLogin(email: string, password: string): Promise<{ ok: boolean; roles: string[]; profile: any } | null> {
  const cred = await getCachedCredential(email);
  if (!cred) return null;
  const hash = await hashPassword(password);
  if (hash !== cred.passwordHash) return null;
  return { ok: true, roles: cred.roles || [], profile: cred.profile || {} };
}

// ── Offline queue ──────────────────────────────────────────────────────────
export interface QueueItem {
  id:         string;
  action:     string;  // "insert" | "update" | "delete"
  table:      string;
  data:       any;
  queued_at:  number;
  retries:    number;
}

export async function enqueue(action: string, table: string, data: any): Promise<string> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await idbSet("queue", id, { id, action, table, data, queued_at: Date.now(), retries: 0 });
  return id;
}

export async function getQueue(): Promise<QueueItem[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = () => res((req.result || []).map((r: any) => r.value));
    req.onerror   = () => rej(req.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(id);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ── Network status ─────────────────────────────────────────────────────────
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onNetworkChange(cb: (online: boolean) => void): () => void {
  const on  = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online",  on);
  window.addEventListener("offline", off);
  return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
}

// ── Settings cache ─────────────────────────────────────────────────────────
export async function cacheSettings(settings: Record<string, any>) {
  await idbSet("settings", "main", settings);
}

export async function getCachedSettings(): Promise<Record<string, any> | null> {
  return idbGet("settings", "main");
}

export async function setLastSync(table: string) {
  await idbSet("last_sync", table, new Date().toISOString());
}

export async function getLastSync(table: string): Promise<string | null> {
  return idbGet("last_sync", table);
}
