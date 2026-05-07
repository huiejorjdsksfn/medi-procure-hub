/**
 * ProcurBosse v8.0 -- Health API Edge Function
 * System health, DB stats, concurrent session count
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const start = Date.now();

  const [profilesRes, sessionsRes, modulesRes, metricsRes] = await Promise.allSettled([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("live_session_stats").select("*").maybeSingle(),
    supabase.from("system_modules").select("module_id,is_enabled"),
    supabase.from("latest_system_metrics").select("*"),
  ]);

  const latencyMs = Date.now() - start;
  const sessions = sessionsRes.status === "fulfilled" ? sessionsRes.value.data : null;
  const metrics  = metricsRes.status === "fulfilled" ? metricsRes.value.data : [];

  const health = {
    status: latencyMs < 1000 ? "healthy" : latencyMs < 3000 ? "degraded" : "critical",
    version: "8.0.0",
    latency_ms: latencyMs,
    database: {
      connected: profilesRes.status === "fulfilled",
      profiles: profilesRes.status === "fulfilled" ? (profilesRes.value as any).count : 0,
    },
    sessions: {
      active_now: sessions?.active_now ?? 0,
      unique_users: sessions?.unique_users_now ?? 0,
      sessions_1h: sessions?.sessions_1h ?? 0,
      sessions_24h: sessions?.sessions_24h ?? 0,
    },
    modules: modulesRes.status === "fulfilled"
      ? { total: (modulesRes.value.data || []).length, enabled: (modulesRes.value.data || []).filter((m: any) => m.is_enabled).length }
      : { total: 0, enabled: 0 },
    system_metrics: (metrics as any[]).map((m: any) => ({
      hostname: m.hostname,
      cpu_percent: m.cpu_percent,
      ram_percent: m.ram_percent,
      disk_percent: m.disk_percent,
      reported_at: m.reported_at,
    })),
    checked_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(health), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
