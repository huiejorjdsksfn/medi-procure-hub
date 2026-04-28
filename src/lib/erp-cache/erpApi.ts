/**
 * ERP API Layer — All Supabase queries with multi-layer cache
 * Every fetch: try cache first → DB → stale fallback
 * EL5 MediProcure — Embu Level 5 Hospital
 */
import ERPCache from "./index";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// TTLs in milliseconds
const TTL = {
  short:   2 * 60_000,   // 2 min — KPIs, notifications
  medium:  5 * 60_000,   // 5 min — most lists
  long:   30 * 60_000,   // 30 min — reference data (suppliers, items, categories)
  session: 60 * 60_000,  // 1 hr — user profile, roles
};

// ─── Generic cached query ─────────────────────────────────────────────────────
async function cachedFetch<T>(
  key:     string,
  fetchFn: () => Promise<{data:T|null;error:any}>,
  ttl:     number,
  tag?:    string
): Promise<T|null> {
  return ERPCache.getOrFetch<T>(
    key,
    async () => {
      const { data, error } = await fetchFn();
      if (error) throw error;
      return data as T;
    },
    ttl,
    tag
  ).then(r => r.data);
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export async function fetchKPIs(facilityId?: string): Promise<Record<string,number>|null> {
  const key = `kpis:${facilityId||"all"}`;
  return cachedFetch(key, async () => {
    const [r,p,pv,i,s,g,c,n,ls,t] = await Promise.allSettled([
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
      db.from("payment_vouchers").select("id",{count:"exact",head:true}).eq("status","pending"),
      db.from("items").select("id",{count:"exact",head:true}),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
      db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
      db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
      db.from("tenders").select("id",{count:"exact",head:true}).eq("status","open"),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
    return { data:{reqs:v(r),pos:v(p),pvs:v(pv),items:v(i),suppliers:v(s),grn:v(g),contracts:v(c),unread:v(n),lowStock:v(ls),tenders:v(t)}, error:null };
  }, TTL.short, "kpis");
}

// ─── Requisitions ─────────────────────────────────────────────────────────────
export async function fetchRequisitions(status?:string):Promise<any[]|null> {
  const key=`requisitions:${status||"all"}`;
  return cachedFetch(key, ()=>db.from("requisitions").select("*,requisition_items(count)").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "requisitions");
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export async function fetchPurchaseOrders(status?:string):Promise<any[]|null> {
  const key=`purchase_orders:${status||"all"}`;
  return cachedFetch(key, ()=>db.from("purchase_orders").select("*,suppliers(name,email,phone)").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "purchase_orders");
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
export async function fetchSuppliers():Promise<any[]|null> {
  return cachedFetch("suppliers:all", ()=>db.from("suppliers").select("*").order("name").then((r:any)=>r), TTL.long, "suppliers");
}
export async function fetchSuppliersLite():Promise<any[]|null> {
  return cachedFetch("suppliers:lite", ()=>db.from("suppliers").select("id,name,email,phone,status").order("name").then((r:any)=>r), TTL.long, "suppliers");
}

// ─── Items / Inventory ────────────────────────────────────────────────────────
export async function fetchItems():Promise<any[]|null> {
  return cachedFetch("items:all", ()=>db.from("items").select("*").order("name").then((r:any)=>r), TTL.medium, "items");
}
export async function fetchLowStockItems():Promise<any[]|null> {
  return cachedFetch("items:low_stock", ()=>db.from("items").select("*").lt("current_quantity",5).order("current_quantity").then((r:any)=>r), TTL.short, "items");
}
export async function fetchCategories():Promise<any[]|null> {
  return cachedFetch("categories:all", ()=>db.from("item_categories").select("*").order("name").then((r:any)=>r), TTL.long, "categories");
}
export async function fetchDepartments():Promise<any[]|null> {
  return cachedFetch("departments:all", ()=>db.from("departments").select("*").order("name").then((r:any)=>r), TTL.long, "departments");
}

// ─── Tenders ──────────────────────────────────────────────────────────────────
export async function fetchTenders(status?:string):Promise<any[]|null> {
  const key=`tenders:${status||"all"}`;
  return cachedFetch(key, ()=>db.from("tenders").select("*").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "tenders");
}

// ─── Contracts ────────────────────────────────────────────────────────────────
export async function fetchContracts():Promise<any[]|null> {
  return cachedFetch("contracts:all", ()=>db.from("contracts").select("*,suppliers(name)").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "contracts");
}

// ─── Goods Received ───────────────────────────────────────────────────────────
export async function fetchGoodsReceived():Promise<any[]|null> {
  return cachedFetch("grn:all", ()=>db.from("goods_received").select("*,goods_received_items(*)").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "grn");
}

// ─── Vouchers ────────────────────────────────────────────────────────────────
export async function fetchPaymentVouchers():Promise<any[]|null> {
  return cachedFetch("payment_vouchers:all", ()=>db.from("payment_vouchers").select("*").order("created_at",{ascending:false}).limit(200).then((r:any)=>r), TTL.medium, "vouchers");
}
export async function fetchReceiptVouchers():Promise<any[]|null> {
  return cachedFetch("receipt_vouchers:all", ()=>db.from("receipt_vouchers").select("*").order("created_at",{ascending:false}).limit(200).then((r:any)=>r), TTL.medium, "vouchers");
}
export async function fetchJournalVouchers():Promise<any[]|null> {
  return cachedFetch("journal_vouchers:all", ()=>db.from("journal_vouchers").select("*").order("created_at",{ascending:false}).limit(200).then((r:any)=>r), TTL.medium, "vouchers");
}

// ─── Financials ───────────────────────────────────────────────────────────────
export async function fetchBudgets():Promise<any[]|null> {
  return cachedFetch("budgets:all", ()=>db.from("budgets").select("*").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "financials");
}
export async function fetchChartOfAccounts():Promise<any[]|null> {
  return cachedFetch("coa:all", ()=>db.from("chart_of_accounts").select("*").order("account_code").then((r:any)=>r), TTL.long, "financials");
}
export async function fetchFixedAssets():Promise<any[]|null> {
  return cachedFetch("fixed_assets:all", ()=>db.from("fixed_assets").select("*").order("created_at",{ascending:false}).then((r:any)=>r), TTL.medium, "financials");
}

// ─── Users & Profiles ─────────────────────────────────────────────────────────
export async function fetchUsers():Promise<any[]|null> {
  return cachedFetch("users:all", ()=>db.from("profiles").select("*").order("full_name").then((r:any)=>r), TTL.medium, "users");
}
export async function fetchUserProfile(userId:string):Promise<any|null> {
  return cachedFetch(`profile:${userId}`, ()=>db.from("profiles").select("*").eq("id",userId).single().then((r:any)=>r), TTL.session, "users");
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function fetchNotifications(userId:string):Promise<any[]|null> {
  return cachedFetch(`notifications:${userId}`, ()=>db.from("notifications").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(50).then((r:any)=>r), TTL.short, "notifications");
}

// ─── System Settings ──────────────────────────────────────────────────────────
export async function fetchSystemSettings():Promise<Record<string,string>|null> {
  return ERPCache.getOrFetch("system_settings", async () => {
    const {data,error} = await db.from("system_settings").select("key,value");
    if(error) throw error;
    return Object.fromEntries((data||[]).map((r:any)=>[r.key,r.value]));
  }, TTL.long, "settings").then(r=>r.data);
}

// ─── Cache invalidation helpers ───────────────────────────────────────────────
export const invalidate = {
  async requisitions() { await ERPCache.delPrefix("requisitions"); await ERPCache.del("kpis:all"); },
  async purchaseOrders(){ await ERPCache.delPrefix("purchase_orders"); await ERPCache.del("kpis:all"); },
  async suppliers()    { await ERPCache.delPrefix("suppliers"); },
  async items()        { await ERPCache.delPrefix("items"); },
  async tenders()      { await ERPCache.delPrefix("tenders"); await ERPCache.del("kpis:all"); },
  async contracts()    { await ERPCache.delPrefix("contracts"); await ERPCache.del("kpis:all"); },
  async grn()          { await ERPCache.delPrefix("grn"); await ERPCache.del("kpis:all"); },
  async vouchers()     { await ERPCache.delPrefix("payment_vouchers"); await ERPCache.delPrefix("receipt_vouchers"); await ERPCache.delPrefix("journal_vouchers"); },
  async financials()   { await ERPCache.delPrefix("budgets"); await ERPCache.delPrefix("coa"); await ERPCache.delPrefix("fixed_assets"); },
  async users()        { await ERPCache.delPrefix("users"); await ERPCache.delPrefix("profile"); },
  async notifications(){ await ERPCache.delPrefix("notifications"); },
  async all()          { await ERPCache.clearAll(); },
};

export default ERPCache;
