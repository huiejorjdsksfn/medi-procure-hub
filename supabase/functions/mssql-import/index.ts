// mssql-import — live SQL Server onboarding import helper
// Uses the same on-prem ODBC-bridge contract as mssql-test (POST {bridgeUrl}/...)
// since Deno edge functions cannot load a native ODBC/TDS driver directly.
// A bridge agent (a small on-prem service with a real ODBC driver) must be
// deployed at the client site and configured with ODBC_BRIDGE_URL / ODBC_BRIDGE_KEY
// for this to do live work. If no bridge is configured, every action returns
// bridge_not_configured so the UI can fall back to CSV/XLSX upload instead.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnInfo {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  auth_mode?: "sql" | "windows" | "azure_ad";
  encrypt?: boolean;
}

async function callBridge(path: string, body: Record<string, unknown>, timeoutMs = 15000) {
  const bridgeUrl = Deno.env.get("ODBC_BRIDGE_URL");
  const bridgeKey = Deno.env.get("ODBC_BRIDGE_KEY");
  if (!bridgeUrl || !bridgeKey) {
    return { ok: false, error: "bridge_not_configured" as const };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${bridgeUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${bridgeKey}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await r.json().catch(() => ({ ok: false, error: "bridge_bad_json" }));
    return json;
  } catch (e: any) {
    return { ok: false, error: e?.message || "bridge_unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action: "SCHEMA" | "PREVIEW" | "ROWS" = body.action;
    const conn: ConnInfo = {
      host: (body.host || "").trim(),
      port: parseInt(body.port || "1433", 10) || 1433,
      database: body.database || body.database_name || "",
      username: body.username || "",
      password: body.password || "",
      auth_mode: body.auth_mode || "sql",
      encrypt: !!body.encrypt,
    };

    if (!conn.host || !conn.database) {
      return new Response(JSON.stringify({ ok: false, error: "host_and_database_required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    if (action === "SCHEMA") {
      // Expected bridge contract: POST /schema -> { ok, tables: [{name, row_count}] }
      result = await callBridge("/schema", { driver: "ODBC Driver 18 for SQL Server", ...conn });
    } else if (action === "PREVIEW") {
      const table: string = body.table;
      if (!table) return new Response(JSON.stringify({ ok: false, error: "table_required" }), { status: 400, headers: corsHeaders });
      // Expected bridge contract: POST /preview -> { ok, columns: string[], rows: any[][] }
      result = await callBridge("/preview", { driver: "ODBC Driver 18 for SQL Server", ...conn, table, limit: 20 });
    } else if (action === "ROWS") {
      const table: string = body.table;
      const offset: number = parseInt(body.offset || "0", 10) || 0;
      const limit: number = Math.min(parseInt(body.limit || "500", 10) || 500, 2000);
      if (!table) return new Response(JSON.stringify({ ok: false, error: "table_required" }), { status: 400, headers: corsHeaders });
      // Expected bridge contract: POST /rows -> { ok, columns: string[], rows: any[][], has_more: boolean }
      result = await callBridge("/rows", { driver: "ODBC Driver 18 for SQL Server", ...conn, table, offset, limit });
    } else {
      return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
