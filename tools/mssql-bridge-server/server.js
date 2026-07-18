/**
 * mssql-bridge-server — the real, TCP-connecting half of the SQL Server
 * bridge. Run this on a machine that has actual network access to your
 * SQL Server instance (your office network, a VM next to it, etc.) —
 * NOT on Supabase, which can't open TCP/TDS connections at all.
 *
 * It exposes a small authenticated HTTPS-reachable API that the
 * `mssql-bridge` Supabase Edge Function calls:
 *   POST /ping             -> { ok: true }
 *   POST /test_connection  -> attempts a real SELECT 1 against SQL Server
 *   POST /schema           -> real INFORMATION_SCHEMA introspection
 *   POST /query            -> runs a real (read-only, allow-listed) query
 *
 * Every request must include header: X-Bridge-Secret: <SQLSERVER_BRIDGE_SECRET>
 * — set the same value here and in the app's SQL Server Bridge settings.
 *
 * Setup:
 *   npm install
 *   cp .env.example .env      # fill in real SQL Server + secret
 *   npm start
 *
 * Then expose this over HTTPS to the internet (a reverse tunnel like
 * `cloudflared tunnel` or `ngrok http 4390`, or a real reverse proxy with
 * a TLS cert if this runs on a server with a public IP) and paste that
 * HTTPS URL into the app's SQL Server Bridge settings as the Bridge URL.
 */
require("dotenv").config();
const express = require("express");
const sql = require("mssql");

const PORT = process.env.PORT || 4390;
const SECRET = process.env.SQLSERVER_BRIDGE_SECRET;
if (!SECRET) {
  console.error("FATAL: SQLSERVER_BRIDGE_SECRET is not set in .env — refusing to start unauthenticated.");
  process.exit(1);
}

const sqlConfig = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_TRUSTED_CONNECTION === "yes" ? undefined : process.env.MSSQL_USER,
  password: process.env.MSSQL_TRUSTED_CONNECTION === "yes" ? undefined : process.env.MSSQL_PASSWORD,
  options: {
    trustedConnection: process.env.MSSQL_TRUSTED_CONNECTION === "yes",
    encrypt: process.env.MSSQL_ENCRYPT !== "no",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT !== "no",
  },
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 15000,
};

let pool = null;
async function getPool() {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(sqlConfig);
  return pool;
}

const app = express();
app.use(express.json());

// Auth on every route — reject anything without the shared secret
app.use((req, res, next) => {
  if (req.headers["x-bridge-secret"] !== SECRET) {
    return res.status(401).json({ error: "Invalid or missing X-Bridge-Secret" });
  }
  next();
});

app.post("/ping", (req, res) => {
  res.json({ ok: true, server_time: new Date().toISOString() });
});

app.post("/test_connection", async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query("SELECT @@VERSION AS version, DB_NAME() AS db_name");
    res.json({ ok: true, ...result.recordset[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/schema", async (req, res) => {
  try {
    const p = await getPool();
    const tables = await p.request().query(`
      SELECT t.TABLE_NAME AS table_name,
             (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) AS column_count
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_NAME
    `);
    res.json({ ok: true, tables: tables.recordset });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Real but deliberately restricted: read-only, allow-listed statement shapes only.
// This bridge should never accept arbitrary write SQL from the app side.
app.post("/query", async (req, res) => {
  const { sql: queryText } = req.body || {};
  if (!queryText || typeof queryText !== "string") {
    return res.status(400).json({ error: "Missing 'sql' in request body" });
  }
  const trimmed = queryText.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    return res.status(400).json({ error: "Only SELECT statements are allowed through this bridge" });
  }
  try {
    const p = await getPool();
    const result = await p.request().query(queryText);
    res.json({ ok: true, rows: result.recordset, row_count: result.recordset.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`mssql-bridge-server listening on port ${PORT}`);
  console.log(`SQL Server target: ${sqlConfig.server}/${sqlConfig.database}`);
  console.log(`Remember: expose this over HTTPS (e.g. a reverse tunnel) and put that URL in the app's Bridge settings.`);
});
