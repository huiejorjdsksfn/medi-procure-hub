/**
 * ProcurBosse — MySQL Proxy Edge Function v1.0
 * Routes queries to MySQL server with Supabase as fallback
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

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
  let sql = `SELECT ${select === "*" ? "*" : select} FROM \`${table}\``;
  const where: string[] = [];
  for (const f of (filters || [])) {
    if (f.type === "eq")  where.push(`\`${f.col}\` = ${JSON.stringify(f.val)}`);
    if (f.type === "in")  where.push(`\`${f.col}\` IN (${f.vals.map((v:any)=>JSON.stringify(v)).join(",")})`);
    if (f.type === "lt")  where.push(`\`${f.col}\` < ${JSON.stringify(f.val)}`);
    if (f.type === "gte") where.push(`\`${f.col}\` >= ${JSON.stringify(f.val)}`);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  if (order) sql += ` ORDER BY \`${order.col}\` ${order.ascending ? "ASC" : "DESC"}`;
  if (limit) sql += ` LIMIT ${limit}`;
  return sql;
}

async function execMySQL(config: any, sql: string, params?: any[]): Promise<any> {
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { action, table, select, filters, order, limit, single, data, sql } = body;

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

    let result: any;

    if (action === "SELECT") {
      const q = buildSelect(table, select || "*", filters || [], order, limit, single);
      const rows = await execMySQL(config, q);
      result = { rows: single ? (Array.isArray(rows) ? rows[0] : rows) : rows };
    } else if (action === "RAW" && sql) {
      const rows = await execMySQL(config, sql);
      result = { rows };
    } else if (action === "INSERT") {
      const cols = Object.keys(data);
      const vals = Object.values(data);
      const q = `INSERT INTO \`${table}\` (\`${cols.join("`,`")}\`) VALUES (${cols.map(()=>"?").join(",")})`;
      const res = await execMySQL(config, q, vals) as any;
      result = { result: { id: res.insertId, affectedRows: res.affectedRows } };
    } else if (action === "UPDATE") {
      const sets = Object.keys(data).map(k=>`\`${k}\`=?`).join(",");
      const vals = [...Object.values(data)];
      let q = `UPDATE \`${table}\` SET ${sets}`;
      const where: string[] = [];
      for (const f of (filters||[])) {
        if (f.type==="eq") { where.push(`\`${f.col}\`=?`); vals.push(f.val); }
      }
      if (where.length) q += ` WHERE ${where.join(" AND ")}`;
      const res = await execMySQL(config, q, vals) as any;
      result = { result: { affectedRows: res.affectedRows } };
    } else if (action === "DELETE") {
      let q = `DELETE FROM \`${table}\``;
      const vals: any[] = [];
      const where: string[] = [];
      for (const f of (filters||[])) {
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
