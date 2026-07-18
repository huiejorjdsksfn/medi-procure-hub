#!/usr/bin/env node
/**
 * check-schema-drift.mjs — guards against the bug class that broke GRN
 * saves on 2026-07-18 ("Could not find the 'inspection_done' column"): a
 * hardcoded insert/update/upsert payload key that doesn't exist as a real
 * column on the target table, so PostgREST rejects every write silently
 * behind a generic schema-cache error.
 *
 * This is a static, regex-based check (not a full JS/TS parser), so it
 * WILL flag false positives for keys nested inside legitimate jsonb
 * columns (details/metadata/value_json/etc.) or matched inside template-
 * literal strings. It is intentionally a WARNING, not a hard CI failure —
 * every flagged line should be read, not blindly "fixed". Re-run and
 * review after any change touching Supabase read/write calls.
 *
 * Compares against scripts/schema-snapshot.json, a periodically-refreshed
 * export of `information_schema.columns` for the live project. Regenerate
 * it (via Supabase MCP or the SQL below) whenever the schema changes:
 *
 *   select table_name, string_agg(column_name, ',' order by column_name)
 *   from information_schema.columns where table_schema='public'
 *   group by table_name order by table_name;
 *
 * Usage: node scripts/check-schema-drift.mjs
 * Always exits 0 (advisory) — read the output, don't just gate on it.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
const SNAPSHOT_PATH = path.join(process.cwd(), "scripts", "schema-snapshot.json");

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
const tableCols = {};
for (const [table, cols] of Object.entries(snapshot.tables)) {
  tableCols[table] = new Set(cols.split(","));
}

const NOISE = new Set([
  "if","else","return","true","false","null","undefined","new","await","async",
  "function","const","let","var","typeof","in","of","this","case","break",
  "error","data","JSON","Date","Number","String","Boolean","Array","Object",
  "Math","console","log","map","filter","reduce","find","forEach","then","catch",
]);

let flagged = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) checkFile(full);
  }
}

function findCalls(text, method) {
  const results = [];
  const re = new RegExp(`\\.${method}\\(\\s*\\{`, "g");
  let m;
  while ((m = re.exec(text))) {
    const start = re.lastIndex - 1;
    let depth = 0, i = start;
    while (i < text.length) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") { depth--; if (depth === 0) break; }
      i++;
    }
    if (depth !== 0) continue;
    const payload = text.slice(start, i + 1);
    const window = text.slice(Math.max(0, m.index - 500), m.index);
    const tblMatches = [...window.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)/g)];
    if (!tblMatches.length) continue;
    const table = tblMatches[tblMatches.length - 1][1];
    const keys = new Set(
      [...payload.matchAll(/(?<![.\w])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)]
        .map(x => x[1])
        .filter(k => !NOISE.has(k))
    );
    const hasSpread = payload.includes("...");
    const lineNo = text.slice(0, m.index).split("\n").length;
    results.push({ table, keys, hasSpread, lineNo });
  }
  return results;
}

function checkFile(file) {
  const text = fs.readFileSync(file, "utf8");
  for (const method of ["insert", "update", "upsert"]) {
    for (const { table, keys, hasSpread, lineNo } of findCalls(text, method)) {
      const realCols = tableCols[table];
      if (!realCols) continue;
      const bad = [...keys].filter(k => !realCols.has(k)).sort();
      if (bad.length) {
        flagged.push({ file: path.relative(SRC, file), lineNo, method, table, bad, hasSpread });
      }
    }
  }
}

walk(SRC);

if (flagged.length) {
  console.log(`Schema drift check — ${flagged.length} candidate(s) to review (expect false positives from nested jsonb keys / template-literal strings):\n`);
  for (const f of flagged) {
    const note = f.hasSpread ? " [has ...spread too]" : "";
    console.log(`  ${f.file}:${f.lineNo}  .${f.method}("${f.table}")  BAD KEYS: ${f.bad.join(", ")}${note}`);
  }
} else {
  console.log("Schema drift check — no candidates found.");
}
process.exit(0);
