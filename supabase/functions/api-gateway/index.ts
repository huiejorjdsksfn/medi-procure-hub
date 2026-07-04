/**
 * EL5 MediProcure — API Gateway v9.0 (failover router)
 * Central entry point that proxies requests to downstream Edge Function
 * processors with retry, per-service circuit breaking, and a health
 * snapshot endpoint. Replaces the v8.0 stub.
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardedCall, allCircuitStatuses } from "../_shared/failover.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Downstream processors this gateway is allowed to route to, each with its
// own retry/circuit-breaker budget appropriate to how flaky it tends to be.
const ROUTES: Record<string, { breaker: { failureThreshold: number; cooldownMs: number }; retry: { attempts: number; timeoutMs: number } }> = {
  "health-api":      { breaker: { failureThreshold: 5, cooldownMs: 15000 }, retry: { attempts: 2, timeoutMs: 8000 } },
  "notify-api":      { breaker: { failureThreshold: 4, cooldownMs: 30000 }, retry: { attempts: 3, timeoutMs: 15000 } },
  "search-api":      { breaker: { failureThreshold: 5, cooldownMs: 15000 }, retry: { attempts: 2, timeoutMs: 8000 } },
  "export-api":      { breaker: { failureThreshold: 5, cooldownMs: 20000 }, retry: { attempts: 2, timeoutMs: 20000 } },
  "audit-api":       { breaker: { failureThreshold: 5, cooldownMs: 15000 }, retry: { attempts: 2, timeoutMs: 8000 } },
  "bulk-ops":        { breaker: { failureThreshold: 3, cooldownMs: 30000 }, retry: { attempts: 2, timeoutMs: 25000 } },
  "concurrency-api": { breaker: { failureThreshold: 5, cooldownMs: 15000 }, retry: { attempts: 2, timeoutMs: 8000 } },
  "mysql-proxy":     { breaker: { failureThreshold: 3, cooldownMs: 30000 }, retry: { attempts: 2, timeoutMs: 12000 } },
  "mssql-import":    { breaker: { failureThreshold: 3, cooldownMs: 30000 }, retry: { attempts: 2, timeoutMs: 20000 } },
};

async function callFunction(fnName: string, body: unknown, authHeader: string | null) {
  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader ?? `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`${fnName} responded ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);

  // Health / circuit-breaker snapshot for dashboards
  if (req.method === "GET" && (url.searchParams.get("action") === "status" || url.pathname.endsWith("/status"))) {
    const circuits = await allCircuitStatuses(sb);
    return json({ status: "ok", version: "9.0.0", routes: Object.keys(ROUTES), circuits });
  }

  if (req.method === "GET") {
    return json({ status: "ok", version: "9.0.0", routes: Object.keys(ROUTES) });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const target = body?.route || url.searchParams.get("route");
    if (!target || !ROUTES[target]) {
      return json({ ok: false, error: `Unknown or missing route. Valid routes: ${Object.keys(ROUTES).join(", ")}` }, 400);
    }

    const cfg = ROUTES[target];
    const authHeader = req.headers.get("authorization");
    const payload = body?.payload ?? {};

    try {
      const result = await guardedCall(
        sb,
        `gateway:${target}`,
        () => callFunction(target, payload, authHeader),
        { retry: cfg.retry, breaker: cfg.breaker },
      );
      return json({ ok: true, route: target, data: result });
    } catch (err: any) {
      const circuitOpen = String(err?.message ?? "").startsWith("circuit_open:");
      return json(
        { ok: false, route: target, error: err?.message ?? "downstream call failed", circuit_open: circuitOpen },
        circuitOpen ? 503 : 502,
      );
    }
  } catch (e: any) {
    return json({ ok: false, error: e.message || "Internal gateway error" }, 500);
  }
});
