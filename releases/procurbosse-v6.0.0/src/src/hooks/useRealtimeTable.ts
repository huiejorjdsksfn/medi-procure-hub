import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  select?: string;
  order?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
}

export function useRealtimeTable<T = any>(table: string, options: Options = {}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      let query = (supabase as any).from(table).select(options.select || "*");
      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
      }
      if (options.filters) {
        Object.entries(options.filters).forEach(([k, v]) => { if (v !== undefined && v !== null) query = query.eq(k, v); });
      }
      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = (supabase as any).channel(`rt-${table}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
