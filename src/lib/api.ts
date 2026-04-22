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

// ═════════════════════════════════════════════════════════════════════════════
// ███████████████  22 NEW APIs — ProcurBosse v5.8 EXPANSION  ██████████████████
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// API 21 — CATEGORIES API
// ─────────────────────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: () => apiFetch(CACHE_KEYS.CATEGORIES,
    () => db.from("categories").select("*").order("name"), 300),
  get: (id: string) => apiFetch(null,
    () => db.from("categories").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.CATEGORIES);
    return apiFetch(null, () => db.from("categories").insert(data).select().single(), 0);
  },
  update: async (id: string, data: any) => {
    cache.invalidate(CACHE_KEYS.CATEGORIES);
    return apiFetch(null, () => db.from("categories").update(data).eq("id", id).select().single(), 0);
  },
  delete: async (id: string) => {
    cache.invalidate(CACHE_KEYS.CATEGORIES);
    return apiFetch(null, () => db.from("categories").delete().eq("id", id), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 22 — QUALITY INSPECTIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const qualityApi = {
  listInspections: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("inspections").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 60),
  getInspection: (id: string) => apiFetch(null,
    () => db.from("inspections").select("*, inspection_items(*)").eq("id", id).single()),
  createInspection: async (data: any) =>
    apiFetch(null, () => db.from("inspections").insert(data).select().single(), 0),
  updateInspection: async (id: string, data: any) =>
    apiFetch(null, () => db.from("inspections").update(data).eq("id", id).select().single(), 0),
  listNonConformances: (filters?: { status?: string; severity?: string }) =>
    apiFetch(null, () => {
      let q = db.from("non_conformance").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.severity) q = q.eq("severity", filters.severity);
      return q;
    }, 60),
  createNonConformance: async (data: any) =>
    apiFetch(null, () => db.from("non_conformance").insert(data).select().single(), 0),
  closeNonConformance: async (id: string, resolution: string) =>
    apiFetch(null, () => db.from("non_conformance").update({
      status: "closed", resolution, closed_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 23 — JOURNAL VOUCHERS API
// ─────────────────────────────────────────────────────────────────────────────
export const journalVouchersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("journal_vouchers").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("journal_vouchers").select("*, journal_voucher_lines(*)").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("journal_vouchers").insert(data).select().single(), 0);
  },
  post: async (id: string, userId: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("journal_vouchers").update({
      status: "posted", posted_by: userId, posted_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0);
  },
  reverse: async (id: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("journal_vouchers").update({
      status: "reversed", reversed_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 24 — RECEIPT VOUCHERS API
// ─────────────────────────────────────────────────────────────────────────────
export const receiptVouchersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("receipt_vouchers").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("receipt_vouchers").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("receipt_vouchers").insert(data).select().single(), 0);
  },
  confirm: async (id: string, userId: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("receipt_vouchers").update({
      status: "confirmed", confirmed_by: userId, confirmed_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 25 — PURCHASE VOUCHERS API
// ─────────────────────────────────────────────────────────────────────────────
export const purchaseVouchersApi = {
  list: (filters?: { status?: string; supplier_id?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("purchase_vouchers").select("*, suppliers(name)").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.supplier_id) q = q.eq("supplier_id", filters.supplier_id);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("purchase_vouchers").select("*, suppliers(name), purchase_voucher_lines(*)").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("purchase_vouchers").insert(data).select().single(), 0);
  },
  approve: async (id: string, userId: string) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("purchase_vouchers").update({
      status: "approved", approved_by: userId, approved_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 26 — SALES VOUCHERS API
// ─────────────────────────────────────────────────────────────────────────────
export const salesVouchersApi = {
  list: (filters?: { status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("sales_vouchers").select("*").order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("sales_vouchers").select("*").eq("id", id).single()),
  create: async (data: any) => {
    cache.invalidate(CACHE_KEYS.VOUCHERS);
    return apiFetch(null, () => db.from("sales_vouchers").insert(data).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 27 — PROCUREMENT PLANNING API
// ─────────────────────────────────────────────────────────────────────────────
export const procurementPlanApi = {
  list: (filters?: { financial_year?: string; status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("procurement_plans").select("*").order("created_at", { ascending: false });
      if (filters?.financial_year) q = q.eq("financial_year", filters.financial_year);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 120),
  get: (id: string) => apiFetch(null,
    () => db.from("procurement_plans").select("*, procurement_plan_items(*)").eq("id", id).single()),
  create: async (data: any) =>
    apiFetch(null, () => db.from("procurement_plans").insert(data).select().single(), 0),
  update: async (id: string, data: any) =>
    apiFetch(null, () => db.from("procurement_plans").update(data).eq("id", id).select().single(), 0),
  approve: async (id: string, userId: string) =>
    apiFetch(null, () => db.from("procurement_plans").update({
      status: "approved", approved_by: userId, approved_at: new Date().toISOString()
    }).eq("id", id).select().single(), 0),
  listItems: (planId: string) => apiFetch(null,
    () => db.from("procurement_plan_items").select("*").eq("plan_id", planId).order("created_at"), 60),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 28 — STOCK / INVENTORY MOVEMENTS API
// ─────────────────────────────────────────────────────────────────────────────
export const stockApi = {
  listMovements: (filters?: { item_id?: string; movement_type?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("stock_movements").select("*, items(name,unit_of_measure)").order("created_at", { ascending: false });
      if (filters?.item_id) q = q.eq("item_id", filters.item_id);
      if (filters?.movement_type) q = q.eq("movement_type", filters.movement_type);
      q = q.limit(filters?.limit || 200);
      return q;
    }, 60),
  recordMovement: async (data: {
    item_id: string; movement_type: "in" | "out" | "adjustment" | "transfer";
    quantity: number; reference?: string; notes?: string; facility_id?: string;
  }) => {
    cache.invalidate(CACHE_KEYS.ITEMS);
    return apiFetch(null, () => db.from("stock_movements").insert({
      ...data, movement_date: new Date().toISOString()
    }).select().single(), 0);
  },
  getItemBalance: (itemId: string) => apiFetch(`stock_balance_${itemId}`,
    () => db.from("items").select("current_quantity,reorder_level,unit_of_measure").eq("id", itemId).single(), 30),
  getLowStockItems: () => apiFetch("stock_low_stock",
    () => db.from("items").select("*").filter("current_quantity", "lte", "reorder_level").order("name").limit(100), 60),
  getCriticalItems: () => apiFetch("stock_critical",
    () => db.from("items").select("*").eq("current_quantity", 0).order("name").limit(50), 30),
  adjustStock: async (itemId: string, newQty: number, reason: string) => {
    cache.invalidate(CACHE_KEYS.ITEMS);
    cache.invalidate(`stock_balance_${itemId}`);
    return apiFetch(null, () => db.from("items").update({
      current_quantity: newQty, last_adjusted_at: new Date().toISOString(), adjustment_reason: reason
    }).eq("id", itemId).select().single(), 0);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 29 — ANALYTICS & DASHBOARD API
// ─────────────────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboardKPIs: () => apiFetch("analytics_kpis", async () => {
    const [reqs, pos, budgets, suppliers] = await Promise.all([
      db.from("requisitions").select("id,status,total_amount").order("created_at", { ascending: false }).limit(500),
      db.from("purchase_orders").select("id,status,total_amount").order("created_at", { ascending: false }).limit(500),
      db.from("budgets").select("id,total_amount,spent_amount,status"),
      db.from("suppliers").select("id,status"),
    ]);
    return {
      data: {
        requisitions: reqs.data || [],
        purchaseOrders: pos.data || [],
        budgets: budgets.data || [],
        suppliers: suppliers.data || [],
      },
      error: reqs.error || pos.error || budgets.error || suppliers.error,
    };
  }, 120),
  getSpendByCategory: (months = 6) => apiFetch(`spend_by_category_${months}`,
    () => db.from("purchase_orders")
      .select("category, total_amount")
      .gte("created_at", new Date(Date.now() - months * 30 * 86400000).toISOString())
      .eq("status", "completed"), 180),
  getMonthlySpend: (months = 12) => apiFetch(`monthly_spend_${months}`,
    () => db.from("purchase_orders")
      .select("created_at,total_amount,status")
      .gte("created_at", new Date(Date.now() - months * 30 * 86400000).toISOString())
      .order("created_at"), 180),
  getSupplierPerformance: () => apiFetch("supplier_performance",
    () => db.from("suppliers").select("id,name,rating,on_time_delivery_rate,quality_score,total_orders").order("rating", { ascending: false }).limit(20), 300),
  getRequisitionTrends: (days = 30) => apiFetch(`req_trends_${days}`,
    () => db.from("requisitions").select("created_at,status,total_amount")
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at"), 120),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 30 — REPORTS API
// ─────────────────────────────────────────────────────────────────────────────
export const reportsApi = {
  list: (filters?: { category?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("reports").select("*").order("created_at", { ascending: false });
      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 60),
  get: (id: string) => apiFetch(null,
    () => db.from("reports").select("*").eq("id", id).single()),
  save: async (data: { title: string; category: string; content: any; generated_by?: string }) =>
    apiFetch(null, () => db.from("reports").insert({
      ...data, generated_at: new Date().toISOString()
    }).select().single(), 0),
  delete: async (id: string) =>
    apiFetch(null, () => db.from("reports").delete().eq("id", id), 0),
  getScheduled: () => apiFetch("scheduled_reports",
    () => db.from("report_schedules").select("*").eq("is_active", true).order("next_run_at"), 300),
  schedule: async (data: { report_type: string; frequency: string; recipients: string[]; next_run_at: string }) =>
    apiFetch(null, () => db.from("report_schedules").insert({ ...data, is_active: true }).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 31 — AUDIT LOG WRITE API (complements read-only auditApi)
// ─────────────────────────────────────────────────────────────────────────────
export const auditWriteApi = {
  log: async (entry: {
    module: string; action: string; resource_type?: string; resource_id?: string;
    user_id?: string; user_email?: string; details?: any; ip_address?: string;
  }) => db.from("audit_log").insert({
    ...entry, created_at: new Date().toISOString(), severity: entry.details?.severity || "info"
  }),
  logBulk: async (entries: any[]) =>
    db.from("audit_log").insert(entries.map(e => ({ ...e, created_at: new Date().toISOString() }))),
  getByResource: (resourceType: string, resourceId: string) =>
    apiFetch(null, () => db.from("audit_log").select("*")
      .eq("resource_type", resourceType).eq("resource_id", resourceId)
      .order("created_at", { ascending: false }).limit(50), 30),
  getByUser: (userId: string, limit = 100) =>
    apiFetch(null, () => db.from("audit_log").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit), 30),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 32 — REALTIME SUBSCRIPTIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const realtimeApi = {
  subscribeToTable: (
    table: string,
    callback: (payload: any) => void,
    filter?: { column: string; value: string }
  ) => {
    let channel = db.channel(`realtime:${table}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table, ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}) },
      callback
    );
    channel.subscribe();
    return () => db.removeChannel(channel);
  },
  subscribeToNotifications: (userId: string, callback: (payload: any) => void) => {
    const channel = db.channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}` }, callback)
      .subscribe();
    return () => db.removeChannel(channel);
  },
  subscribeToRequisitions: (callback: (payload: any) => void) => {
    const channel = db.channel("requisitions:all")
      .on("postgres_changes", { event: "*", schema: "public", table: "requisitions" }, callback)
      .subscribe();
    return () => db.removeChannel(channel);
  },
  subscribeToPurchaseOrders: (callback: (payload: any) => void) => {
    const channel = db.channel("pos:all")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, callback)
      .subscribe();
    return () => db.removeChannel(channel);
  },
  subscribeToStock: (callback: (payload: any) => void) => {
    const channel = db.channel("stock:movements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stock_movements" }, callback)
      .subscribe();
    return () => db.removeChannel(channel);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API 33 — BATCH OPERATIONS API
// ─────────────────────────────────────────────────────────────────────────────
export const batchApi = {
  /** Run multiple Supabase operations in parallel and return all results */
  parallel: async <T extends Record<string, Promise<any>>>(ops: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
    const keys = Object.keys(ops) as (keyof T)[];
    const results = await Promise.all(keys.map(k => ops[k]));
    return Object.fromEntries(keys.map((k, i) => [k, results[i]])) as any;
  },
  /** Upsert many records in chunks (avoids payload limit) */
  upsertMany: async (table: string, records: any[], chunkSize = 50, conflictCol = "id") => {
    const errors: any[] = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await db.from(table).upsert(chunk, { onConflict: conflictCol });
      if (error) errors.push(error);
    }
    return { success: errors.length === 0, errors };
  },
  /** Delete multiple IDs at once */
  deleteMany: async (table: string, ids: string[]) =>
    db.from(table).delete().in("id", ids),
  /** Bulk status update */
  updateStatus: async (table: string, ids: string[], status: string, extra?: Record<string, any>) =>
    db.from(table).update({ status, ...extra, updated_at: new Date().toISOString() }).in("id", ids),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 34 — RECEPTION API (thin wrapper over ReceptionAPI for unified access)
// ─────────────────────────────────────────────────────────────────────────────
export const receptionApi = {
  listVisitors: (filters?: { status?: string; date?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("reception_visitors").select("*").order("check_in_time", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.date) q = q.gte("check_in_time", filters.date);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 30),
  checkIn: async (data: { full_name: string; phone?: string; purpose?: string; host_name?: string; host_department?: string }) =>
    apiFetch(null, () => db.from("reception_visitors").insert({
      ...data, status: "checked_in", check_in_time: new Date().toISOString()
    }).select().single(), 0),
  checkOut: async (id: string) =>
    apiFetch(null, () => db.from("reception_visitors").update({
      status: "checked_out", check_out_time: new Date().toISOString()
    }).eq("id", id).select().single(), 0),
  listAppointments: (filters?: { status?: string; date?: string }) =>
    apiFetch(null, () => {
      let q = db.from("reception_appointments").select("*").order("scheduled_time");
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.date) q = q.gte("scheduled_time", filters.date);
      return q;
    }, 30),
  createAppointment: async (data: any) =>
    apiFetch(null, () => db.from("reception_appointments").insert(data).select().single(), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 35 — TELEPHONY API (thin wrapper for unified access)
// ─────────────────────────────────────────────────────────────────────────────
export const telephonyApi = {
  listCalls: (filters?: { direction?: string; status?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("reception_calls").select("*").order("called_at", { ascending: false });
      if (filters?.direction) q = q.eq("direction", filters.direction);
      if (filters?.status) q = q.eq("status", filters.status);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 30),
  logCall: async (data: { caller_name?: string; caller_phone: string; direction: "inbound" | "outbound"; department?: string; duration_seconds?: number; notes?: string }) =>
    apiFetch(null, () => db.from("reception_calls").insert({
      ...data, called_at: new Date().toISOString(), status: "completed"
    }).select().single(), 0),
  getCallStats: () => apiFetch("telephony_stats",
    () => db.from("reception_calls").select("direction,status,duration_seconds")
      .gte("called_at", new Date(Date.now() - 30 * 86400000).toISOString()), 60),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 36 — BACKUP & RESTORE API
// ─────────────────────────────────────────────────────────────────────────────
export const backupApi = {
  listBackups: () => apiFetch("backup_list",
    () => db.from("backup_jobs").select("*").order("created_at", { ascending: false }).limit(50), 60),
  createBackupRecord: async (meta: { backup_type?: string; size_bytes?: number; storage_path?: string; tables?: string[] }) =>
    apiFetch(null, () => db.from("backup_jobs").insert({
      backup_type: meta.backup_type || "manual",
      size_bytes: meta.size_bytes,
      storage_path: meta.storage_path,
      tables: meta.tables,
      status: "completed",
      created_at: new Date().toISOString()
    }).select().single(), 0),
  getLastBackup: () => apiFetch("last_backup",
    () => db.from("backup_jobs").select("*").eq("status", "completed")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(), 120),
  exportTable: async (table: string, limit = 10000) =>
    apiFetch(null, () => db.from(table).select("*").limit(limit), 0),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 37 — IP ACCESS CONTROL API
// ─────────────────────────────────────────────────────────────────────────────
export const ipAccessApi = {
  listRules: () => apiFetch("ip_rules",
    () => db.from("ip_access_rules").select("*").order("created_at", { ascending: false }), 300),
  addRule: async (data: { ip_address: string; rule_type: "allow" | "block"; description?: string; expires_at?: string }) => {
    cache.invalidate("ip_rules");
    return apiFetch(null, () => db.from("ip_access_rules").insert(data).select().single(), 0);
  },
  removeRule: async (id: string) => {
    cache.invalidate("ip_rules");
    return apiFetch(null, () => db.from("ip_access_rules").delete().eq("id", id), 0);
  },
  checkIP: async (ip: string) => apiFetch(`ip_check_${ip}`,
    () => db.from("ip_access_rules").select("rule_type").eq("ip_address", ip).single(), 60),
  listAccessLog: (limit = 200) => apiFetch(null,
    () => db.from("ip_access_log").select("*").order("accessed_at", { ascending: false }).limit(limit), 30),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 38 — WEBMASTER / SYSTEM HEALTH API
// ─────────────────────────────────────────────────────────────────────────────
export const systemApi = {
  getHealth: () => apiFetch("system_health", async () => {
    const start = Date.now();
    const { error } = await db.from("system_settings").select("key").limit(1);
    const latency = Date.now() - start;
    return {
      data: {
        db_online: !error,
        db_latency_ms: latency,
        cache_stats: cache.stats(),
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }, 30),
  listBroadcasts: () => apiFetch("broadcasts",
    () => db.from("system_broadcasts").select("*").order("created_at", { ascending: false }).limit(20), 60),
  createBroadcast: async (data: { message: string; type: "info" | "warning" | "error"; expires_at?: string }) =>
    apiFetch(null, () => db.from("system_broadcasts").insert({
      ...data, is_active: true, created_at: new Date().toISOString()
    }).select().single(), 0),
  dismissBroadcast: async (id: string) => {
    cache.invalidate("broadcasts");
    return apiFetch(null, () => db.from("system_broadcasts").update({ is_active: false }).eq("id", id), 0);
  },
  getMetrics: () => apiFetch("system_metrics",
    () => db.from("system_metrics").select("*").order("recorded_at", { ascending: false }).limit(100), 60),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 39 — EMAIL / INBOX API
// ─────────────────────────────────────────────────────────────────────────────
export const emailApi = {
  listInbox: (filters?: { is_read?: boolean; category?: string; limit?: number }) =>
    apiFetch(null, () => {
      let q = db.from("email_messages").select("*").order("received_at", { ascending: false });
      if (filters?.is_read !== undefined) q = q.eq("is_read", filters.is_read);
      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      q = q.limit(filters?.limit || 100);
      return q;
    }, 30),
  get: (id: string) => apiFetch(null,
    () => db.from("email_messages").select("*").eq("id", id).single()),
  markRead: async (id: string) =>
    db.from("email_messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id),
  markAllRead: async () =>
    db.from("email_messages").update({ is_read: true }).eq("is_read", false),
  delete: async (id: string) =>
    apiFetch(null, () => db.from("email_messages").delete().eq("id", id), 0),
  getSentItems: (limit = 100) => apiFetch(null,
    () => db.from("email_messages").select("*").eq("direction", "outbound")
      .order("sent_at", { ascending: false }).limit(limit), 60),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 40 — SCANNER / BARCODE API
// ─────────────────────────────────────────────────────────────────────────────
export const scannerApi = {
  lookupBarcode: (barcode: string) => apiFetch(`barcode_${barcode}`,
    () => db.from("items").select("*").eq("barcode", barcode).single(), 300),
  lookupBatch: async (barcodes: string[]) => {
    const { data, error } = await db.from("items").select("*").in("barcode", barcodes);
    return { data, error: error?.message || null };
  },
  logScan: async (data: { barcode: string; item_id?: string; action: string; quantity?: number; location?: string }) =>
    db.from("scan_log").insert({ ...data, scanned_at: new Date().toISOString() }),
  getScanHistory: (limit = 100) => apiFetch(null,
    () => db.from("scan_log").select("*, items(name,unit_of_measure)")
      .order("scanned_at", { ascending: false }).limit(limit), 30),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 41 — SUPPLIER SCORING & PERFORMANCE API
// ─────────────────────────────────────────────────────────────────────────────
export const supplierPerformanceApi = {
  getScorecard: (supplierId: string) => apiFetch(`supplier_score_${supplierId}`,
    () => db.from("supplier_scorecards").select("*").eq("supplier_id", supplierId)
      .order("evaluation_date", { ascending: false }).limit(1).single(), 300),
  listScorecards: (limit = 50) => apiFetch("supplier_scorecards",
    () => db.from("supplier_scorecards").select("*, suppliers(name)").order("total_score", { ascending: false }).limit(limit), 300),
  submitEvaluation: async (data: {
    supplier_id: string; quality_score: number; delivery_score: number;
    pricing_score: number; compliance_score: number; evaluator_id: string; notes?: string;
  }) => {
    const total = (data.quality_score + data.delivery_score + data.pricing_score + data.compliance_score) / 4;
    cache.invalidate(`supplier_score_${data.supplier_id}`);
    cache.invalidate("supplier_scorecards");
    return apiFetch(null, () => db.from("supplier_scorecards").insert({
      ...data, total_score: total, evaluation_date: new Date().toISOString()
    }).select().single(), 0);
  },
  getTopSuppliers: (limit = 10) => apiFetch(`top_suppliers_${limit}`,
    () => db.from("suppliers").select("id,name,rating,on_time_delivery_rate,quality_score")
      .order("rating", { ascending: false }).limit(limit), 300),
};

// ─────────────────────────────────────────────────────────────────────────────
// API 42 — SEARCH API (cross-module full-text search)
// ─────────────────────────────────────────────────────────────────────────────
export const searchApi = {
  /** Search across multiple tables in parallel */
  global: async (query: string, limit = 10) => {
    if (!query || query.length < 2) return { data: {}, error: null };
    const q = `%${query}%`;
    const [items, suppliers, documents, requisitions] = await Promise.all([
      db.from("items").select("id,name,category,barcode").ilike("name", q).limit(limit),
      db.from("suppliers").select("id,name,contact_email,phone").ilike("name", q).limit(limit),
      db.from("documents").select("id,title,category,created_at").ilike("title", q).limit(limit),
      db.from("requisitions").select("id,requisition_number,status,total_amount").ilike("requisition_number", q).limit(limit),
    ]);
    return {
      data: {
        items: items.data || [],
        suppliers: suppliers.data || [],
        documents: documents.data || [],
        requisitions: requisitions.data || [],
      },
      error: null,
    };
  },
  /** Search within a single table by column */
  inTable: (table: string, column: string, query: string, limit = 50) =>
    apiFetch(null, () => db.from(table).select("*").ilike(column, `%${query}%`).limit(limit), 30),
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATED DEFAULT EXPORT (42 APIs total)
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  // Original 20
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
  // New 22
  categories: categoriesApi,
  quality: qualityApi,
  journalVouchers: journalVouchersApi,
  receiptVouchers: receiptVouchersApi,
  purchaseVouchers: purchaseVouchersApi,
  salesVouchers: salesVouchersApi,
  procurementPlan: procurementPlanApi,
  stock: stockApi,
  analytics: analyticsApi,
  reports: reportsApi,
  auditWrite: auditWriteApi,
  realtime: realtimeApi,
  batch: batchApi,
  reception: receptionApi,
  telephony: telephonyApi,
  backup: backupApi,
  ipAccess: ipAccessApi,
  system: systemApi,
  email: emailApi,
  scanner: scannerApi,
  supplierPerformance: supplierPerformanceApi,
  search: searchApi,
  cache,
};
