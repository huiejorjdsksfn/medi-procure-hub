/**
 * ProcurBosse — MySQL Proxy Edge Function v2.0
 * Routes queries to MySQL server with Supabase as fallback
 * EL5 MediProcure · Embu Level 5 Hospital
 *
 * v2.0 — write guards:
 *  - Caller must be authenticated AND hold an admin/database_admin/
 *    webmaster role (checked server-side, not just via client RoleGuard).
 *  - Every connection defaults to read-only. A connection only permits
 *    INSERT/UPDATE/DELETE/MIGRATE/write-shaped RAW SQL when it's
 *    registered in `odbc_connections` with read_only = false; ad-hoc
 *    connections (no connection_id) can never write.
 *  - Table/column identifiers are validated against a strict allow-list
 *    pattern before being interpolated into SQL, closing the identifier
 *    injection gap that existed in v1.
 *  - Every write attempt (allowed or blocked) is logged to
 *    `odbc_access_log` for audit.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardedCall } from "../_shared/failover.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ALLOWED_ROLES = ["admin", "database_admin", "webmaster"];
const WRITE_ACTIONS = new Set(["INSERT", "UPDATE", "DELETE", "MIGRATE"]);
const READ_SQL_VERBS = new Set(["SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN"]);
const IDENT_RE = /^[A-Za-z0-9_]+$/;

function isWriteSQL(sql: string): boolean {
  const verb = (sql || "").trim().split(/\s+/)[0]?.toUpperCase() || "";
  return !READ_SQL_VERBS.has(verb);
}

function validIdent(name: unknown): name is string {
  return typeof name === "string" && IDENT_RE.test(name);
}

/** Verifies the caller's JWT and that their profile role is allowed to
 *  touch the legacy MySQL bridge at all (read or write). */
async function authorize(req: Request): Promise<{ userId: string; role: string } | null> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as any)?.role || "";
  if (!ALLOWED_ROLES.includes(role)) return null;
  return { userId: user.id, role };
}

async function logAccess(entry: {
  connection_id?: string | null; action: string; table_name?: string | null;
  allowed: boolean; blocked_reason?: string | null; sql_snippet?: string | null; requested_by: string;
}) {
  try { await sb.from("odbc_access_log").insert(entry as any); } catch { /* audit log must never block the request */ }
}

async function getMySQLConfig() {
  const keys = ["mysql_host","mysql_port","mysql_database","mysql_username","mysql_password","mysql_ssl","mysql_enabled"];
  const { data } = await sb.from("system_settings").select("key,value").in("key", keys);
  if (!data) return null;
  const s: Record<string,string> = Object.fromEntries((data as any[]).map((r:any) => [r.key, r.value]));
  if (s.mysql_enabled !== "true" || !s.mysql_host) return null;
  return {
    host:     s.mysql_host,
    port:     parseInt(s.mysql_port || "3306"),
    database: s.mysql_database || "mediprocure",
    user:     s.mysql_username || "root",
    password: s.mysql_password || "",
    ssl:      s.mysql_ssl === "true",
  };
}

// Build MySQL SELECT query
function buildSelect(table: string, select: string, filters: any[], order: any, limit: number | null, single: boolean): string {
  if (!validIdent(table)) throw new Error(`invalid_table_identifier: ${table}`);
  const cols = select === "*" ? "*" : select.split(",").map((c: string) => c.trim());
  if (Array.isArray(cols) && !cols.every((c: string) => c === "*" || validIdent(c))) {
    throw new Error("invalid_select_identifier");
  }
  let sql = `SELECT ${select === "*" ? "*" : select} FROM \`${table}\``;
  const where: string[] = [];
  for (const f of (filters || [])) {
    if (!validIdent(f.col)) throw new Error(`invalid_filter_identifier: ${f.col}`);
    if (f.type === "eq")  where.push(`\`${f.col}\` = ${JSON.stringify(f.val)}`);
    if (f.type === "in")  where.push(`\`${f.col}\` IN (${f.vals.map((v:any)=>JSON.stringify(v)).join(",")})`);
    if (f.type === "lt")  where.push(`\`${f.col}\` < ${JSON.stringify(f.val)}`);
    if (f.type === "gte") where.push(`\`${f.col}\` >= ${JSON.stringify(f.val)}`);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  if (order) {
    if (!validIdent(order.col)) throw new Error(`invalid_order_identifier: ${order.col}`);
    sql += ` ORDER BY \`${order.col}\` ${order.ascending ? "ASC" : "DESC"}`;
  }
  if (limit) sql += ` LIMIT ${limit}`;
  return sql;
}

async function execMySQLOnce(config: any, sql: string, params?: any[]): Promise<any> {
  // Use mysql2 via npm CDN (Deno compatible)
  const mysql = await import("https://esm.sh/mysql2@3.9.1/promise");
  const conn = await mysql.createConnection({
    host: config.host, port: config.port,
    database: config.database, user: config.user, password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 5000,
  });
  try {
    const [rows] = await conn.execute(sql, params || []);
    return rows;
  } finally {
    await conn.end().catch(()=>{});
  }
}

// Wrapped with retry (transient connection drops) + circuit breaker (so a
// dead MySQL host fails fast instead of hanging every request for 5s+).
async function execMySQL(config: any, sql: string, params?: any[]): Promise<any> {
  return guardedCall(sb, "mysql-proxy", () => execMySQLOnce(config, sql, params), {
    retry: { attempts: 3, baseDelayMs: 250, maxDelayMs: 3000, timeoutMs: 10000 },
    breaker: { failureThreshold: 4, cooldownMs: 30000, halfOpenSuccesses: 1 },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = await authorize(req);
    if (!auth) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden: admin/database_admin/webmaster role required" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, table, select, filters, order, limit, single, data, sql, connection_id } = body;

    // Ping / health check
    if (action === "PING") {
      const config = await getMySQLConfig();
      if (!config) return new Response(JSON.stringify({ ok: false, reason: "MySQL not configured" }), { headers: { ...cors, "Content-Type": "application/json" } });
      try {
        await execMySQL(config, "SELECT 1");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
      } catch(e:any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    const config = await getMySQLConfig();
    if (!config) {
      return new Response(JSON.stringify({ ok: false, error: "MySQL not configured — using Supabase" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Write guard ──────────────────────────────────────────────────
    // Every connection is read-only by default. A registered connection
    // (connection_id present) only permits writes when an admin has
    // explicitly flipped odbc_connections.read_only to false. Ad-hoc
    // connections (no connection_id) can never write, since there's no
    // registry entry to have authorized it.
    const wantsWrite = WRITE_ACTIONS.has(action) || (action === "RAW" && isWriteSQL(sql || ""));
    if (wantsWrite) {
      let readOnly = true;
      let connName: string | null = null;
      if (connection_id) {
        const { data: conn } = await sb.from("external_connections").select("read_only,name").eq("id", connection_id).maybeSingle();
        if (conn) { readOnly = (conn as any).read_only !== false; connName = (conn as any).name; }
      }
      if (readOnly) {
        await logAccess({
          connection_id: connection_id || null, action, table_name: table || null,
          allowed: false, blocked_reason: connection_id ? "connection_marked_read_only" : "no_connection_id_ad_hoc_write_blocked",
          sql_snippet: (sql || `${action} ${table || ""}`).slice(0, 500), requested_by: auth.userId,
        });
        return new Response(JSON.stringify({
          ok: false,
          error: connection_id
            ? `read_only_connection: "${connName || connection_id}" is read-only. An admin must set read_only=false on this connection in the ODBC registry before writes are permitted.`
            : "read_only_by_default: ad-hoc connections (no connection_id) cannot write. Register the connection first and have an admin explicitly mark it writable.",
        }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }
      await logAccess({
        connection_id: connection_id || null, action, table_name: table || null,
        allowed: true, sql_snippet: (sql || `${action} ${table || ""}`).slice(0, 500), requested_by: auth.userId,
      });
    }

    let result: any;

    if (action === "SELECT") {
      const q = buildSelect(table, select || "*", filters || [], order, limit, single);
      const rows = await execMySQL(config, q);
      result = { rows: single ? (Array.isArray(rows) ? rows[0] : rows) : rows };
    } else if (action === "RAW" && sql) {
      const rows = await execMySQL(config, sql);
      result = { rows };
    } else if (action === "INSERT") {
      if (!validIdent(table)) throw new Error(`invalid_table_identifier: ${table}`);
      const cols = Object.keys(data);
      if (!cols.every(validIdent)) throw new Error("invalid_column_identifier");
      const vals = Object.values(data);
      const q = `INSERT INTO \`${table}\` (\`${cols.join("`,`")}\`) VALUES (${cols.map(()=>"?").join(",")})`;
      const res = await execMySQL(config, q, vals) as any;
      result = { result: { id: res.insertId, affectedRows: res.affectedRows } };
    } else if (action === "UPDATE") {
      if (!validIdent(table)) throw new Error(`invalid_table_identifier: ${table}`);
      if (!Object.keys(data).every(validIdent)) throw new Error("invalid_column_identifier");
      const sets = Object.keys(data).map(k=>`\`${k}\`=?`).join(",");
      const vals = [...Object.values(data)];
      let q = `UPDATE \`${table}\` SET ${sets}`;
      const where: string[] = [];
      for (const f of (filters||[])) {
        if (!validIdent(f.col)) throw new Error(`invalid_filter_identifier: ${f.col}`);
        if (f.type==="eq") { where.push(`\`${f.col}\`=?`); vals.push(f.val); }
      }
      if (where.length) q += ` WHERE ${where.join(" AND ")}`;
      const res = await execMySQL(config, q, vals) as any;
      result = { result: { affectedRows: res.affectedRows } };
    } else if (action === "DELETE") {
      if (!validIdent(table)) throw new Error(`invalid_table_identifier: ${table}`);
      let q = `DELETE FROM \`${table}\``;
      const vals: any[] = [];
      const where: string[] = [];
      for (const f of (filters||[])) {
        if (!validIdent(f.col)) throw new Error(`invalid_filter_identifier: ${f.col}`);
        if (f.type==="eq") { where.push(`\`${f.col}\`=?`); vals.push(f.val); }
      }
      if (where.length) q += ` WHERE ${where.join(" AND ")}`;
      const res = await execMySQL(config, q, vals) as any;
      result = { result: { affectedRows: res.affectedRows } };
    } else if (action === "SCHEMA") {
      const rows = await execMySQL(config, `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${config.database}'`);
      result = { rows };
    } else if (action === "MIGRATE") {
      // Run migration SQL
      const stmts = (sql as string).split(";").map((s:string)=>s.trim()).filter(Boolean);
      const results: any[] = [];
      for (const stmt of stmts) {
        try { await execMySQL(config, stmt); results.push({ sql:stmt.slice(0,60), ok:true }); }
        catch(e:any) { results.push({ sql:stmt.slice(0,60), ok:false, error:e.message }); }
      }
      result = { results };
    }

    return new Response(JSON.stringify({ ok: true, ...result }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch(e:any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
