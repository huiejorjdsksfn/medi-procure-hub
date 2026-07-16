/**
 * useDashboardKPI — React Query-backed replacement for the Dashboard's old
 * useEffect+useState fetch.
 *
 * WHY THIS MATTERS FOR LOAD SPEED:
 * The Dashboard is the single most-visited page in the app (it's the
 * landing page after every login and every "back to dashboard" click), and
 * it was firing 11 separate Supabase queries from scratch on every single
 * mount — with zero caching. Navigate away and back 10 seconds later? All
 * 11 queries re-run, every time, forever.
 *
 * The app already ships a fully-configured QueryClient (staleTime 60s,
 * gcTime 10min — see App.tsx) but nothing in the whole codebase actually
 * used it. This hook is the first real consumer: within the 30s staleTime
 * window below, revisiting the Dashboard is instant (served from cache,
 * zero network calls) instead of re-running 11 queries. This is the
 * reusable pattern intended to be extended to other heavy list/report pages.
 */
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/client";

export interface DashboardKPI {
  requisitions: number;
  pendingPOs: number;
  totalPOValue: number;
  grnCount: number;
  suppliers: number;
  vouchers: number;
  payments: number;
  receipts: number;
  budgetTotal: number;
  budgetSpent: number;
  inventory: number;
  contracts: number;
  tenders: number;
}

export interface DashboardData {
  kpi: DashboardKPI;
  activity: any[];
}

const EMPTY_KPI: DashboardKPI = {
  requisitions: 0, pendingPOs: 0, totalPOValue: 0, grnCount: 0, suppliers: 0,
  vouchers: 0, payments: 0, receipts: 0, budgetTotal: 0, budgetSpent: 0,
  inventory: 0, contracts: 0, tenders: 0,
};

async function fetchDashboardData(): Promise<DashboardData> {
  const [rqR, poR, grnR, supR, pvR, rcpR, budR, invR, conR, tenR] = await Promise.allSettled([
    db.from("requisitions").select("id", { count: "exact", head: true }),
    db.from("purchase_orders").select("id,total_amount,status").eq("status", "pending"),
    db.from("goods_received").select("id", { count: "exact", head: true }),
    db.from("suppliers").select("id", { count: "exact", head: true }),
    db.from("payment_vouchers").select("id,total_amount").eq("status", "draft"),
    db.from("receipt_vouchers").select("id", { count: "exact", head: true }),
    db.from("budgets").select("total_budget,spent"),
    db.from("items").select("id", { count: "exact", head: true }),
    db.from("contracts").select("id", { count: "exact", head: true }),
    db.from("tenders").select("id", { count: "exact", head: true }),
  ]);

  const g = (r: any, field?: string) =>
    r.status === "fulfilled" ? (field ? r.value.data?.reduce((s: number, x: any) => s + (x[field] || 0), 0) : r.value.count || 0) : 0;

  const kpi: DashboardKPI = {
    requisitions: g(rqR),
    pendingPOs:   poR.status === "fulfilled" ? (poR.value.data?.length || 0) : 0,
    totalPOValue: g(poR, "total_amount"),
    grnCount:     g(grnR),
    suppliers:    g(supR),
    vouchers:     pvR.status === "fulfilled" ? (pvR.value.data?.length || 0) : 0,
    payments:     g(pvR, "total_amount"),
    receipts:     g(rcpR),
    budgetTotal:  budR.status === "fulfilled" ? (budR.value.data?.reduce((s: number, b: any) => s + (b.total_budget || 0), 0) || 0) : 0,
    budgetSpent:  budR.status === "fulfilled" ? (budR.value.data?.reduce((s: number, b: any) => s + (b.spent || 0), 0) || 0) : 0,
    inventory:    g(invR),
    contracts:    g(conR),
    tenders:      g(tenR),
  };

  const { data: acts } = await db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8);

  return { kpi, activity: acts || [] };
}

export function useDashboardKPI() {
  const query = useQuery({
    queryKey: ["dashboard-kpi"],
    queryFn: fetchDashboardData,
    staleTime: 30_000,   // revisits within 30s are served instantly from cache, no network calls
    gcTime: 5 * 60_000,  // keep it around for 5 min so back/forward nav is instant even after staleness
  });

  return {
    kpi: query.data?.kpi ?? EMPTY_KPI,
    activity: query.data?.activity ?? [],
    loading: query.isLoading, // true only on the very first, uncached load
    refetch: query.refetch,
  };
}
