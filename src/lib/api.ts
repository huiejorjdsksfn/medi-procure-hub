/**
 * ProcurBosse — Unified API Layer v5.8
 * Wraps Supabase with caching, error handling, audit trails, and security
 * Embu Level 5 Hospital · EL5 MediProcure
 */
import { supabase } from "@/integrations/supabase/client";
import { cache, CACHE_KEYS } from "./cache";

const db = supabase as any;

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
      const hit = cache.get<T>(cacheKey);
      if (hit !== null) return { data: hit, error: null, cached: true };
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
  delete: async (id: string) => {
    cache.invalidate(CACHE_KEYS.SUPPLIERS);
    return apiFetch(null, () => db.from("suppliers").delete().eq("id", id), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ITEMS / INVENTORY API
// ─────────────────────────────────────────────────────────────────────────────
export const itemsApi = {
  list: (filters?: { category?: string; low_stock?: boolean; limit?: number }) =>
    apiFetch(CACHE_KEYS.ITEMS, () => {
      let q = db.from("items").select("*").order("name");
      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      if (filters?.limit) q = q.limit(filters.limit);
      return q;
    }, 120),
  get: (id: string) => apiFetch(null,
    () => db.from("items").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.ITEMS);
    return apiFetch(null, () => db.from("items").insert(data).select().single(), 0);
  },
  update: async (id: string, data: any) => {
    cache.invalidate(CACHE_KEYS.ITEMS);
    return apiFetch(null, () => db.from("items").update(data).eq("id", id).select().single(), 0);
  },
  delete: async (id: string) => {
    cache.invalidate(CACHE_KEYS.ITEMS);
    return apiFetch(null, () => db.from("items").delete().eq("id", id), 0);
  },
  getLowStock: () => apiFetch("items_low_stock",
    () => db.from("items").select("*").lt("current_quantity", db.raw?.("reorder_level") || 0).limit(100), 60),
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUISITIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const requisitionsApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("requisitions").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.limit) q = q.limit(filters.limit);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("requisitions").select("*, requisition_items(*)").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.REQUISITIONS);
    return apiFetch(null, () => db.from("requisitions").insert(data).select().single(), 0);
  },
  update: async (id: string, data: any) => {
    cache.invalidate(CACHE_KEYS.REQUISITIONS);
    return apiFetch(null, () => db.from("requisitions").update(data).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE ORDERS API
// ─────────────────────────────────────────────────────────────────────────────
export const purchaseOrdersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.limit) q = q.limit(filters.limit);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("purchase_orders").select("*, suppliers(name), po_items(*)").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.PURCHASE_ORDERS);
    return apiFetch(null, () => db.from("purchase_orders").insert(data).select().single(), 0);
  },
  updateStatus: async (id: string, status: string, meta?: any) => {
    cache.invalidate(CACHE_KEYS.PURCHASE_ORDERS);
    return apiFetch(null, () => db.from("purchase_orders").update({ status, ...meta }).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GOODS RECEIVED (GRN) API
// ─────────────────────────────────────────────────────────────────────────────
export const goodsReceivedApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("goods_received").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.limit) q = q.limit(filters.limit);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("goods_received").select("*").eq("id", id).single()),
  create: async (data: any) =>
    apiFetch(null, () => db.from("goods_received").insert(data).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS API
// ─────────────────────────────────────────────────────────────────────────────
export const contractsApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("contracts").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.limit) q = q.limit(filters.limit);
      return q;
    }, 120),
  get: (id: string) => apiFetch(null,
    () => db.from("contracts").select("*").eq("id", id).single()),
  create: async (data: any) =>
    apiFetch(null, () => db.from("contracts").insert(data).select().single(), 0),
  update: async (id: string, data: any) =>
    apiFetch(null, () => db.from("contracts").update(data).eq("id", id).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// TENDERS API
// ─────────────────────────────────────────────────────────────────────────────
export const tendersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("tenders").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.limit) q = q.limit(filters.limit);
      return q;
    }, 120),
  get: (id: string) => apiFetch(null,
    () => db.from("tenders").select("*").eq("id", id).single()),
  create: async (data: any) =>
    apiFetch(null, () => db.from("tenders").insert(data).select().single(), 0),
  update: async (id: string, data: any) =>
    apiFetch(null, () => db.from("tenders").update(data).eq("id", id).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// BUDGETS API
// ─────────────────────────────────────────────────────────────────────────────
export const budgetsApi = {
  list: (filters?: { status?: string; financial_year?: string }) =>
    apiFetch(CACHE_KEYS.BUDGETS, () => {
      let q = db.from("budgets").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.financial_year) q = q.eq("financial_year", filters.financial_year);
      return q;
    }, 120),
  get: (id: string) => apiFetch(null,
    () => db.from("budgets").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.BUDGETS);
    return apiFetch(null, () => db.from("budgets").insert(data).select().single(), 0);
  },
  update: async (id: string, data: any) => {
    cache.invalidate(CACHE_KEYS.BUDGETS);
    return apiFetch(null, () => db.from("budgets").update(data).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS API
// ─────────────────────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => apiFetch(CACHE_KEYS.DEPARTMENTS,
    () => db.from("departments").select("*").order("name"), 300),
  get: (id: string) => apiFetch(null,
    () => db.from("departments").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.DEPARTMENTS);
    return apiFetch(null, () => db.from("departments").insert(data).select().single(), 0);
  },
  update: async (id: string, data: any) => {
    cache.invalidate(CACHE_KEYS.DEPARTMENTS);
    return apiFetch(null, () => db.from("departments").update(data).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT VOUCHERS API
// ─────────────────────────────────────────────────────────────────────────────
export const paymentVouchersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
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
// GL / CHART OF ACCOUNTS API
// ─────────────────────────────────────────────────────────────────────────────
export const glApi = {
  listAccounts: () => apiFetch(CACHE_KEYS.GL_ACCOUNTS,
    () => db.from("chart_of_accounts").select("*").order("account_code"), 300),
  listEntries: (filters?: { account_code?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("gl_entries").select("*").order("entry_date", { ascending: false });
      if (filters?.account_code) q = q.eq("account_code", filters.account_code);
      q = q.limit(filters?.limit || 200);
      return q;
    }, 60),
  listJournal: (limit = 100) => apiFetch(null,
    () => db.from("gl_journal").select("*").order("created_at", { ascending: false }).limit(limit), 60),
  createEntry: async (data: any) => {
    cache.invalidate(CACHE_KEYS.GL_ACCOUNTS);
    return apiFetch(null, () => db.from("gl_entries").insert(data).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FIXED ASSETS API
// ─────────────────────────────────────────────────────────────────────────────
export const fixedAssetsApi = {
  list: (filters?: { status?: string; category?: string }) =>
    apiFetch(null, () => {
      let q = db.from("fixed_assets").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      return q;
    }, 120),
  get: (id: string) => apiFetch(null,
    () => db.from("fixed_assets").select("*").eq("id", id).single()),
  create: async (data: any) =>
    apiFetch(null, () => db.from("fixed_assets").insert(data).select().single(), 0),
  update: async (id: string, data: any) =>
    apiFetch(null, () => db.from("fixed_assets").update(data).eq("id", id).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => apiFetch(null,
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
  create: async (data: { title?: string; message: string; category?: string; priority?: string; action_url?: string; action_label?: string }) => {
    return db.from("notifications").insert({ ...data, is_read: false, created_at: new Date().toISOString() });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS API
// ─────────────────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (filters?: { category?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("documents").select("*").order("created_at", { ascending: false });
      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      q = q.limit(filters?.limit || 200);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("documents").select("*").eq("id", id).single()),
  create: async (data: any) =>
    apiFetch(null, () => db.from("documents").insert(data).select().single(), 0),
  update: async (id: string, data: any) =>
    apiFetch(null, () => db.from("documents").update(data).eq("id", id).select().single(), 0),
  delete: async (id: string) =>
    apiFetch(null, () => db.from("documents").delete().eq("id", id), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// FACILITIES API
// ─────────────────────────────────────────────────────────────────────────────
export const facilitiesApi = {
  list: () => apiFetch(null,
    () => db.from("facilities").select("*").order("name"), 300),
  get: (id: string) => apiFetch(null,
    () => db.from("facilities").select("*").eq("id", id).single()),
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS & ROLES API
// ─────────────────────────────────────────────────────────────────────────────
export const usersApi = {
  listProfiles: () => apiFetch(CACHE_KEYS.USERS,
    () => db.from("profiles").select("*").order("full_name"), 120),
  getProfile: (id: string) => apiFetch(null,
    () => db.from("profiles").select("*").eq("id", id).single()),
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
  setRole: async (userId: string, role: string) =>
    db.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" }),
  removeRole: async (userId: string, role: string) =>
    db.from("user_roles").delete().eq("user_id", userId).eq("role", role),
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG API
// ─────────────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (filters?: { module?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("audit_log").select("*").order("created_at", { ascending: false });
      if (filters?.module && filters.module !== "all") q = q.eq("module", filters.module);
      q = q.limit(filters?.limit || 200);
      return q;
    }, 30),
};

// ─────────────────────────────────────────────────────────────────────────────
// ERP SYNC API
// ─────────────────────────────────────────────────────────────────────────────
export const erpSyncApi = {
  queueSync: async (syncType: string, direction: "push" | "pull", payload?: any) =>
    db.from("erp_sync_queue").insert({
      sync_type: syncType, direction, status: "pending",
      is_manual: true, gl_verified: false,
      payload: payload || {}, created_at: new Date().toISOString(),
    }),
  getPending: () => apiFetch(null,
    () => db.from("erp_sync_queue").select("*").eq("status", "pending")
      .order("created_at", { ascending: true }).limit(50), 30),
  markComplete: async (id: string, error?: string) =>
    db.from("erp_sync_queue").update({
      status: error ? "failed" : "completed",
      error_message: error,
      completed_at: new Date().toISOString(),
    }).eq("id", id),
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

// ─────────────────────────────────────────────────────────────────────────────
// BID EVALUATIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const bidEvaluationsApi = {
  list: (tenderId?: string) =>
    apiFetch(null, () => {
      let q = db.from("bid_evaluations").select("*").order("total_score", { ascending: false });
      if (tenderId) q = q.eq("tender_id", tenderId);
      return q;
    }, 60),
  create: async (data: any) =>
    apiFetch(null, () => db.from("bid_evaluations").insert(data).select().single(), 0),
  update: async (id: string, data: any) =>
    apiFetch(null, () => db.from("bid_evaluations").update(data).eq("id", id).select().single(), 0),
};

// ── Default export (all modules) ──────────────────────────────────────────────
export default {
  suppliers: suppliersApi,
  items: itemsApi,
  requisitions: requisitionsApi,
  purchaseOrders: purchaseOrdersApi,
  goodsReceived: goodsReceivedApi,
  contracts: contractsApi,
  tenders: tendersApi,
  budgets: budgetsApi,
  departments: departmentsApi,
  paymentVouchers: paymentVouchersApi,
  gl: glApi,
  fixedAssets: fixedAssetsApi,
  notifications: notificationsApi,
  documents: documentsApi,
  facilities: facilitiesApi,
  users: usersApi,
  audit: auditApi,
  erpSync: erpSyncApi,
  settings: settingsApi,
  bidEvaluations: bidEvaluationsApi,
  cache,
};
