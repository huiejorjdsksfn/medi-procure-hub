// SQL Server live connection test
// Performs DNS resolution + TCP connect + TDS PreLogin probe.
// Optionally attempts ODBC-style validation if an ODBC bridge URL is configured.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function tcpProbe(host: string, port: number, timeoutMs = 5000) {
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // @ts-ignore Deno.connect
    const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
    const latency = Math.round(performance.now() - t0);
    // Send a TDS Pre-Login packet (type 0x12).
    // Header: type, status, length(2), spid(2)=0, packet(1)=1, window(1)=0
    const payload = new Uint8Array([
      0x00, 0x00, 0x1a, 0x00, 0x06, 0x01, 0x00, 0x20,
      0x00, 0x01, 0x02, 0x00, 0x21, 0x00, 0x01, 0x03,
      0x00, 0x22, 0x00, 0x04, 0xff, 0x09, 0x00, 0x00,
      0x00, 0x00,
    ]);
    const len = 8 + payload.length;
    const header = new Uint8Array([0x12, 0x01, (len >> 8) & 0xff, len & 0xff, 0, 0, 1, 0]);
    const packet = new Uint8Array(header.length + payload.length);
    packet.set(header, 0); packet.set(payload, header.length);
    await conn.write(packet);
    const buf = new Uint8Array(512);
    const n = await Promise.race([
      conn.read(buf),
      new Promise<number>((_, rej) => setTimeout(() => rej(new Error("read_timeout")), timeoutMs)),
    ]);
    try { conn.close(); } catch { /**/ }
    const ok = (n ?? 0) > 0 && buf[0] === 0x04; // TDS response packet type
    return { ok, latency_ms: latency, bytes: n ?? 0, server_responded: ok };
  } catch (e: any) {
    return { ok: false, latency_ms: Math.round(performance.now() - t0), error: e?.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const host: string = (body.host || "").trim();
    const port: number = parseInt(body.port || "1433", 10) || 1433;
    const database: string = body.database || body.database_name || "";
    const username: string = body.username || "";
    const auth_mode: "sql" | "windows" | "azure_ad" = body.auth_mode || "sql";
    const encrypt: boolean = !!body.encrypt;

    if (!host) {
      return new Response(JSON.stringify({ ok: false, error: "host_required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stage 1: TCP + TDS PreLogin probe
    const probe = await tcpProbe(host, port);

    // Stage 2: optional ODBC bridge (on-prem agent that proxies real ODBC)
    let bridgeResult: any = null;
    const bridgeUrl = Deno.env.get("ODBC_BRIDGE_URL");
    const bridgeKey = Deno.env.get("ODBC_BRIDGE_KEY");
    if (probe.ok && bridgeUrl && bridgeKey && body.run_bridge !== false) {
      try {
        const r = await fetch(`${bridgeUrl.replace(/\/$/, "")}/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${bridgeKey}`,
          },
          body: JSON.stringify({
            driver: "ODBC Driver 18 for SQL Server",
            host, port, database, username,
            password: body.password || "",
            auth_mode, encrypt,
          }),
        });
        bridgeResult = await r.json().catch(() => ({ ok: false, error: "bridge_bad_json" }));
      } catch (e: any) {
        bridgeResult = { ok: false, error: e?.message || "bridge_unreachable" };
      }
    }

    return new Response(JSON.stringify({
      ok: probe.ok && (bridgeResult ? bridgeResult.ok !== false : true),
      stage_tcp: probe,
      stage_bridge: bridgeResult,
      message: probe.ok
        ? (bridgeResult?.ok === false
            ? `TCP reached but ODBC auth failed: ${bridgeResult.error || "auth_failed"}`
            : `SQL Server reachable on ${host}:${port} (${probe.latency_ms} ms)`)
        : `Cannot reach ${host}:${port} - ${probe.error || "unreachable"}`,
      tested_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});