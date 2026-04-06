/**
 * ProcurBosse — Unified API Layer v5.8
 * Wraps Supabase with caching, error handling, audit trails, and security
 * Embu Level 5 Hospital · EL5 MediProcure
 */
import { supabase } from "@/integrations/supabase/client";
import { cache, CACHE_KEYS } from "./cache";

// ── Rate limiting (simple in-memory) ─────────────────────────────────────────
const rateLimits = new Map<string, number[]>();
function checkRateLimit(key: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const hits = (rateLimits.get(key) || []).filter(t => now - t < 60000);
  hits.push(now);
  rateLimits.set(key, hits);
  return hits.length <= maxPerMinute;
}

// ── Base API response type ────────────────────────────────────────────────────
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  cached?: boolean;
}

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch<T>(
  cacheKey: string | null,
  fetcher: () => Promise<{ data: any; error: any }>,
  ttl = 120
): Promise<ApiResult<T>> {
  try {
    if (cacheKey) {
      const cached = cache.get<T>(cacheKey);
      if (cached !== null) return { data: cached, error: null, cached: true };
    }
    const { data, error } = await fetcher();
    if (error) throw error;
    if (cacheKey && data) cache.set(cacheKey, data, ttl);
    return { data, error: null };
  } catch (err: any) {
    console.error(`[API] Error:`, err);
    return { data: null, error: err?.message || "Unknown error" };
  }
}

const db = supabase as any;

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIERS API
// ─────────────────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: () => apiFetch(CACHE_KEYS.SUPPLIERS,
    () => db.from("suppliers").select("*").order("name").limit(500), 180),
  get: (id: string) => apiFetch(null,
    () => db.from("suppliers").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.SUPPLIERS);
    return apiFetch(null, () => db.from("suppliers").insert(data).select().single(), 0);
  },
  update: async (id: string, data: any) => {
    cache.invalidate(CACHE_KEYS.SUPPLIERS);
    return apiFetch(null, () => db.from("suppliers").update(data).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE ORDERS API
// ─────────────────────────────────────────────────────────────────────────────
export const purchaseOrdersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null,
      () => {
        let q = db.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false });
        if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
        if (filters?.limit) q = q.limit(filters.limit);
        return q;
      }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("purchase_orders").select("*, suppliers(name), po_items(*)").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate("purchase_orders");
    return apiFetch(null, () => db.from("purchase_orders").insert(data).select().single(), 0);
  },
  updateStatus: async (id: string, status: string, meta?: any) => {
    cache.invalidate("purchase_orders");
    return apiFetch(null, () => db.from("purchase_orders").update({ status, ...meta }).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT VOUCHERS API
// ─────────────────────────────────────────────────────────────────────────────
export const paymentVouchersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null,
      () => {
        let q = db.from("payment_vouchers").select("*").order("created_at", { ascending: false });
        if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
        if (filters?.limit) q = q.limit(filters.limit);
        return q;
      }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("payment_vouchers").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("payment_vouchers").insert(data).select().single(), 0);
  },
  approve: async (id: string, userId: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("payment_vouchers").update({
      status: "approved", approved_by: userId, approved_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0);
  },
  reject: async (id: string, reason?: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("payment_vouchers").update({
      status: "rejected", rejection_reason: reason
    }).eq("id", id).select().single(), 0);
  },
  markPaid: async (id: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("payment_vouchers").update({
      status: "paid", paid_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (userId?: string) => apiFetch(null,
    () => db.from("notifications").select("*").is("dismissed_at", null)
      .order("created_at", { ascending: false }).limit(100), 30),
  markRead: async (id: string) => {
    cache.invalidate(CACHE_KEYS.NOTIFICATIONS);
    return db.from("notifications").update({ is_read: true }).eq("id", id);
  },
  markAllRead: async () => {
    cache.invalidate(CACHE_KEYS.NOTIFICATIONS);
    return db.from("notifications").update({ is_read: true }).eq("is_read", false);
  },
  create: async (data: {
    title?: string; message: string; category?: string;
    priority?: string; action_url?: string; action_label?: string;
  }) => {
    return db.from("notifications").insert({ ...data, is_read: false, created_at: new Date().toISOString() });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS & ROLES API
// ─────────────────────────────────────────────────────────────────────────────
export const usersApi = {
  ensureAdminRole: async (email: string) => {
    try {
      const { data: user } = await db.from("profiles").select("id").eq("email", email).single();
      if (user) {
        await db.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
        await db.from("user_roles").upsert({ user_id: user.id, role: "database_admin" }, { onConflict: "user_id,role" });
      }
    } catch { /* silent */ }
  },
  getRoles: (userId: string) => apiFetch(null,
    () => db.from("user_roles").select("role").eq("user_id", userId), 300),
  setRole: async (userId: string, role: string) => {
    return db.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ERP SYNC API
// ─────────────────────────────────────────────────────────────────────────────
export const erpSyncApi = {
  queueSync: async (syncType: string, direction: "push" | "pull", payload?: any) => {
    return db.from("erp_sync_queue").insert({
      sync_type: syncType, direction, status: "pending",
      is_manual: true, gl_verified: false,
      payload: payload || {}, created_at: new Date().toISOString(),
    });
  },
  getPending: () => apiFetch(null,
    () => db.from("erp_sync_queue").select("*").eq("status", "pending")
      .order("created_at", { ascending: true }).limit(50), 30),
  markComplete: async (id: string, error?: string) => {
    return db.from("erp_sync_queue").update({
      status: error ? "failed" : "completed",
      error_message: error,
      completed_at: new Date().toISOString(),
    }).eq("id", id);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS API
// ─────────────────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: (key: string) => apiFetch(`setting_${key}`,
    () => db.from("system_settings").select("value").eq("key", key).single(), 600),
  set: async (key: string, value: string, category = "general") => {
    cache.invalidate(`setting_${key}`);
    return db.from("system_settings").upsert({ key, value, category }, { onConflict: "key" });
  },
  getSmtp: async () => {
    const keys = ["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled","resend_api_key"];
    const { data } = await db.from("system_settings").select("key,value").in("key", keys);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { cfg[r.key] = r.value; });
    return cfg;
  },
};

export default {
  suppliers: suppliersApi,
  purchaseOrders: purchaseOrdersApi,
  paymentVouchers: paymentVouchersApi,
  notifications: notificationsApi,
  users: usersApi,
  erpSync: erpSyncApi,
  settings: settingsApi,
  cache,
};
