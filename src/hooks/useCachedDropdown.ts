/**
 * useCachedDropdown — session cache + server-side paginated dropdown loader.
 * Supabase RLS is intentionally enforced by querying with the logged-in client;
 * callers never use service-role credentials, so only permitted options load.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { netEngine } from "@/lib/networkEngine";

type CacheEntry = { ts: number; rows: any[]; hasMore: boolean };
type FilterValue = string | number | boolean | null | undefined;

const CACHE = new Map<string, CacheEntry>();
const TTL = 30 * 60_000;
const DEFAULT_PAGE_SIZE = 75;

export function useCachedDropdown(opts: {
  table: string;
  select?: string;
  filter?: Record<string, FilterValue>;
  order?: string;
  pageSize?: number;
  search?: string;
  searchColumns?: string[];
}) {
  const { roles, user } = useAuth();
  const {
    table,
    select = "id,name",
    filter,
    order = "name",
    pageSize = DEFAULT_PAGE_SIZE,
    search = "",
    searchColumns = ["name"],
  } = opts;

  const roleKey = roles.slice().sort().join(",") || "anonymous";
  const filterKey = JSON.stringify(filter || {});
  const cacheKey = useMemo(
    () => `${user?.id || "anon"}|${roleKey}|${table}|${select}|${filterKey}|${order}|${pageSize}|${search}`,
    [user?.id, roleKey, table, select, filterKey, order, pageSize, search],
  );

  const cached = CACHE.get(cacheKey);
  const [rows, setRows] = useState<any[]>(() => cached?.rows || []);
  const [loading, setLoading] = useState(!cached);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? false);
  const [page, setPage] = useState(cached ? Math.ceil(cached.rows.length / pageSize) : 0);

  const buildQuery = useCallback((from: number, to: number) => {
    let q = (supabase as any).from(table).select(select).order(order).range(from, to);
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
      }
    }
    const trimmed = search.trim();
    if (trimmed && searchColumns.length) {
      const escaped = trimmed.replace(/[%_,]/g, "");
      q = q.or(searchColumns.map(col => `${col}.ilike.%${escaped}%`).join(","));
    }
    return q;
  }, [table, select, order, filterKey, search, searchColumns.join("|")]);

  const loadPage = useCallback(async (nextPage = 0, force = false) => {
    const existing = CACHE.get(cacheKey);
    if (!force && nextPage === 0 && existing && Date.now() - existing.ts < TTL) {
      setRows(existing.rows);
      setHasMore(existing.hasMore);
      setPage(Math.ceil(existing.rows.length / pageSize));
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = nextPage * pageSize;
    const to = from + pageSize - 1;
    // Per-table circuit breaker (one flaky table won't stall every dropdown
    // that references it) + adaptive timeout; first page is UI-blocking so
    // it jumps the queue, "load more" pagination stays background priority.
    const { data, error } = await netEngine.request(
      `dropdown:${table}`,
      () => buildQuery(from, to),
      { priority: nextPage === 0 ? "critical" : "background", label: `dropdown:${table}` }
    );
    if (error) {
      const fallback = existing?.rows || [];
      setRows(fallback);
      setHasMore(existing?.hasMore ?? false);
      setLoading(false);
      return;
    }

    const batch = data || [];
    const nextRows = nextPage === 0 ? batch : [...rows, ...batch];
    const more = batch.length === pageSize;
    CACHE.set(cacheKey, { ts: Date.now(), rows: nextRows, hasMore: more });
    setRows(nextRows);
    setHasMore(more);
    setPage(nextPage + 1);
    setLoading(false);
  }, [cacheKey, pageSize, buildQuery, rows]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  // Each mount gets its own channel even when cacheKey matches another mounted
  // instance (e.g. two components calling useDepartments()/useSuppliers() at
  // once) — two channels sharing the deterministic `cacheKey` name would mean
  // the second mount's `.on()` lands on an already-`subscribe()`d channel and
  // throws "cannot add `postgres_changes` callbacks ... after `subscribe()`."
  // The data CACHE above is still correctly shared/deduped by cacheKey; only
  // the realtime channel itself needs per-instance uniqueness.
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  useEffect(() => {
    const ch = (supabase as any)
      .channel(`dd-cache-${table}-${cacheKey}-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        CACHE.delete(cacheKey);
        loadPage(0, true);
      })
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [table, cacheKey, instanceId, loadPage]);

  return {
    rows,
    loading,
    hasMore,
    loadMore: () => hasMore && !loading ? loadPage(page) : Promise.resolve(),
    reload: () => loadPage(0, true),
  };
}

export function invalidateDropdownCache(table?: string) {
  if (!table) { CACHE.clear(); return; }
  for (const k of CACHE.keys()) if (k.includes(`|${table}|`)) CACHE.delete(k);
}
