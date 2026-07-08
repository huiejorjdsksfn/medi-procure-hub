/**
 * EL5 MediProcure — edgeone-stats edge function
 * Proxies EdgeOne Pages API so the API token stays server-side.
 *
 * GET  /edgeone-stats                              → overview (project + deployments + live health)
 * GET  /edgeone-stats?action=deployments           → list deployments (last 20)
 * GET  /edgeone-stats?action=deployment&id=<id>    → single deployment detail
 * GET  /edgeone-stats?action=domains               → domains attached to project
 * GET  /edgeone-stats?action=health                → live HTTP health check
 * POST /edgeone-stats?action=purge                 → CDN purge (redeploy latest)
 * POST /edgeone-stats?action=rollback&id=<id>      → redeploy a specific deployment
 * POST /edgeone-stats?action=cancel&id=<id>        → cancel an in-progress deployment
 *
 * EL5 MediProcure · Embu Level 5 Hospital
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const EO_TOKEN   = Deno.env.get("EDGEONE_API_TOKEN") ?? "";
const EO_PROJECT = Deno.env.get("EDGEONE_PROJECT")   ?? "procurbosse";
const EO_BASE    = "https://api.edgeone.ai/pages/v1";
const SITE_URL   = "https://procurbosse.edgeone.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function eoFetch(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${EO_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${EO_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: { raw: text } }; }
}

async function healthCheck() {
  const start = Date.now();
  try {
    const res = await fetch(SITE_URL, { method: "HEAD", redirect: "follow" });
    const latency = Date.now() - start;
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return {
      url: SITE_URL,
      status: res.status,
      ok: res.status === 200,
      latency_ms: latency,
      cache_control: headers["cache-control"] ?? null,
      cf_cache:      headers["eo-cache-status"] ?? headers["x-cache"] ?? null,
      server:        headers["server"] ?? null,
      via:           headers["via"] ?? null,
      age:           headers["age"] ?? null,
      checked_at:    new Date().toISOString(),
    };
  } catch (e: any) {
    return {
      url: SITE_URL,
      status: 0,
      ok: false,
      latency_ms: Date.now() - start,
      error: e.message,
      checked_at: new Date().toISOString(),
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get("action") ?? "overview";
    const id     = url.searchParams.get("id") ?? "";

    if (!EO_TOKEN) {
      return json({ error: "EDGEONE_API_TOKEN is not configured in edge function secrets" }, 500);
    }

    /* ── health check ────────────────────────────────────────── */
    if (action === "health") {
      const h = await healthCheck();
      return json({ health: h });
    }

    /* ── single deployment detail ───────────────────────────── */
    if (action === "deployment") {
      if (!id) return json({ error: "Missing ?id=<deployment_id>" }, 400);
      const res = await eoFetch(`/projects/${EO_PROJECT}/deployments/${id}`);
      if (!res.ok) return json({ error: "EdgeOne API error", detail: res.data }, 502);
      return json({ deployment: res.data });
    }

    /* ── domains list ───────────────────────────────────────── */
    if (action === "domains") {
      const res = await eoFetch(`/projects/${EO_PROJECT}/domains`);
      if (!res.ok) return json({ error: "EdgeOne API error", detail: res.data }, 502);
      const domains = res.data?.domains ?? res.data?.data ?? res.data ?? [];
      return json({ domains, project: EO_PROJECT });
    }

    /* ── rollback: redeploy a specific deployment ID ────────── */
    if (action === "rollback" && req.method === "POST") {
      if (!id) return json({ error: "Missing ?id=<deployment_id>" }, 400);
      const r = await eoFetch(`/projects/${EO_PROJECT}/deployments/${id}/retry`, "POST");
      return json({ action: "rollback", triggered: r.ok, deployment_id: id, result: r.data });
    }

    /* ── cancel an in-progress deployment ───────────────────── */
    if (action === "cancel" && req.method === "POST") {
      if (!id) return json({ error: "Missing ?id=<deployment_id>" }, 400);
      const r = await eoFetch(`/projects/${EO_PROJECT}/deployments/${id}/cancel`, "POST");
      return json({ action: "cancel", triggered: r.ok, deployment_id: id, result: r.data });
    }

    /* ── trigger purge / redeploy ────────────────────────────── */
    if (action === "purge" && req.method === "POST") {
      // Get latest deployment ID then retry/redeploy it
      const listRes = await eoFetch(`/projects/${EO_PROJECT}/deployments?limit=5`);
      if (!listRes.ok) {
        return json({ error: "Could not list deployments", detail: listRes.data }, 502);
      }
      const deployments = listRes.data?.deployments ?? listRes.data?.data ?? [];
      const latest = deployments[0];
      if (!latest?.id) {
        return json({ error: "No deployment found to redeploy" }, 404);
      }
      const retryRes = await eoFetch(
        `/projects/${EO_PROJECT}/deployments/${latest.id}/retry`,
        "POST",
      );
      return json({
        action: "purge",
        triggered: retryRes.ok,
        deployment_id: latest.id,
        result: retryRes.data,
      });
    }

    /* ── list deployments ────────────────────────────────────── */
    if (action === "deployments") {
      const res = await eoFetch(`/projects/${EO_PROJECT}/deployments?limit=20`);
      if (!res.ok) return json({ error: "EdgeOne API error", detail: res.data }, 502);
      const deployments = res.data?.deployments ?? res.data?.data ?? res.data ?? [];
      return json({ deployments, project: EO_PROJECT, fetched_at: new Date().toISOString() });
    }

    /* ── overview (project info + recent deployments + health) ── */
    const [projRes, deplRes, health] = await Promise.allSettled([
      eoFetch(`/projects/${EO_PROJECT}`),
      eoFetch(`/projects/${EO_PROJECT}/deployments?limit=10`),
      healthCheck(),
    ]);

    const project     = projRes.status === "fulfilled" && projRes.value.ok ? projRes.value.data : null;
    const deployRaw   = deplRes.status === "fulfilled" && deplRes.value.ok ? deplRes.value.data : null;
    const deployments = deployRaw?.deployments ?? deployRaw?.data ?? [];
    const healthData  = health.status === "fulfilled" ? health.value : { ok: false, error: "check failed" };

    // Compute quick stats from deployment list
    const total   = deployments.length;
    const success = deployments.filter((d: any) => d.status === "success" || d.status === "active" || d.status === "published").length;
    const failed  = deployments.filter((d: any) => d.status === "failed" || d.status === "error").length;
    const latest  = deployments[0] ?? null;

    return json({
      project,
      deployments,
      health: healthData,
      stats: { total, success, failed, latest_status: latest?.status ?? "unknown", latest_at: latest?.created_at ?? latest?.updated_at ?? null },
      project_name: EO_PROJECT,
      site_url: SITE_URL,
      fetched_at: new Date().toISOString(),
    });

  } catch (e: any) {
    return json({ error: e.message ?? "Internal error" }, 500);
  }
});
