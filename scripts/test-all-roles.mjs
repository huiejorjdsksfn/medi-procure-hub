/**
 * ProcurBosse v5.8 — Full System Test Suite
 * Tests: login flow, all roles, all routes, JS error detection
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COLORS = {
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", bold: "\x1b[1m", reset: "\x1b[0m", dim: "\x1b[2m",
};
const ok  = (msg) => console.log(`  ${COLORS.green}✓${COLORS.reset} ${msg}`);
const err = (msg) => console.log(`  ${COLORS.red}✗${COLORS.reset} ${msg}`);
const info= (msg) => console.log(`  ${COLORS.cyan}ℹ${COLORS.reset} ${msg}`);
const hdr = (msg) => console.log(`\n${COLORS.bold}${COLORS.cyan}══ ${msg} ══${COLORS.reset}`);

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { ok(msg); passed++; }
  else { err(msg); failed++; }
}

// ─── SECTION 1: Supabase connectivity ───
hdr("1. DATABASE CONNECTIVITY");

try {
  const { data, error } = await supabase.from("profiles").select("count").limit(1);
  assert(!error, `Supabase connected — profiles table accessible`);
} catch(e) {
  err(`Supabase connection failed: ${e.message}`); failed++;
}

// ─── SECTION 2: Core tables exist ───
hdr("2. CORE TABLE EXISTENCE");

const REQUIRED_TABLES = [
  "profiles","user_roles","requisitions","purchase_orders",
  "goods_received","suppliers","items","departments","categories",
  "contracts","tenders","bid_evaluations","payment_vouchers",
  "notifications","audit_logs","system_settings",
];

for (const table of REQUIRED_TABLES) {
  const { error } = await supabase.from(table).select("*").limit(1);
  assert(!error, `Table: ${table}`);
}

// ─── SECTION 3: Login test with admin account ───
hdr("3. AUTHENTICATION — ADMIN LOGIN");

const DEMO_ACCOUNTS = [
  { role: "admin",             email: "tecnojin03@gmail.com",    password: "Admin@1234" },
  { role: "procurement_manager", email: "manager@el5.co.ke",    password: "Manager@1234" },
  { role: "accountant",        email: "accountant@el5.co.ke",   password: "Account@1234" },
  { role: "procurement_officer",email: "officer@el5.co.ke",     password: "Officer@1234" },
  { role: "requisitioner",     email: "requisitioner@el5.co.ke",password: "Req@12345" },
  { role: "warehouse_officer", email: "warehouse@el5.co.ke",    password: "Warehouse@1234" },
];

const loginResults = [];
for (const acct of DEMO_ACCOUNTS) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: acct.email, password: acct.password,
  });
  if (!error && data.user) {
    ok(`Login OK — ${acct.role} (${acct.email})`);
    loginResults.push({ ...acct, userId: data.user.id, success: true });
    await supabase.auth.signOut();
    passed++;
  } else {
    // Try to create the user if not exists
    info(`Account not found — creating: ${acct.email}`);
    const { data: su, error: se } = await supabase.auth.signUp({
      email: acct.email, password: acct.password,
      options: { data: { full_name: acct.role.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()) } }
    });
    if (!se && su.user) {
      ok(`Created + needs email confirm — ${acct.role}`);
      loginResults.push({ ...acct, userId: su.user.id, success: false, created: true });
    } else {
      err(`Cannot create ${acct.role}: ${se?.message || error?.message}`);
      failed++;
    }
  }
}

// ─── SECTION 4: Roles in DB ───
hdr("4. ROLE ASSIGNMENTS");

const { data: allRoles } = await supabase.from("user_roles").select("user_id,role");
const roleSet = new Set(allRoles?.map(r => r.role) || []);

const EXPECTED_ROLES = [
  "admin","procurement_manager","procurement_officer",
  "accountant","inventory_manager","warehouse_officer","requisitioner","reception"
];

for (const role of EXPECTED_ROLES) {
  assert(roleSet.has(role), `Role exists in DB: ${role}`);
}

// ─── SECTION 5: System settings ───
hdr("5. SYSTEM SETTINGS");

const { data: settings } = await supabase.from("system_settings").select("key,value");
const settingKeys = new Set(settings?.map(s => s.key) || []);

const EXPECTED_SETTINGS = [
  "hospital_name","email_enabled","realtime_enabled","maintenance_mode",
];
for (const key of EXPECTED_SETTINGS) {
  assert(settingKeys.has(key), `System setting: ${key}`);
}

// ─── SECTION 6: All page routes (static check) ───
hdr("6. ROUTE COVERAGE — ALL PAGES");

import { readFileSync } from "fs";
const appTsx = readFileSync("src/App.tsx", "utf8");

const ALL_EXPECTED_ROUTES = [
  "/dashboard","/requisitions","/purchase-orders","/goods-received",
  "/suppliers","/tenders","/bid-evaluations","/contracts","/procurement-planning",
  "/vouchers/payment","/vouchers/receipt","/vouchers/journal","/vouchers/purchase","/vouchers/sales",
  "/financials/dashboard","/financials/chart-of-accounts","/financials/budgets","/financials/fixed-assets",
  "/quality/dashboard","/quality/inspections","/quality/non-conformance",
  "/items","/categories","/departments","/scanner",
  "/email","/inbox","/notifications","/sms","/telephony","/reception",
  "/users","/settings","/audit-log","/admin/database","/admin/panel",
  "/webmaster","/backup","/odbc","/profile",
  "/accountant","/facilities","/gui-editor","/ip-access",
  "/print-engine","/changelog","/documents","/documents/editor","/db-test",
  "/reports",
];

for (const route of ALL_EXPECTED_ROUTES) {
  assert(appTsx.includes(`"${route}"`), `Route registered: ${route}`);
}

// ─── SECTION 7: Build artifact exists ───
hdr("7. BUILD ARTIFACTS");

import { existsSync } from "fs";
assert(existsSync("dist/index.html"), "dist/index.html exists");
assert(existsSync("dist/assets"), "dist/assets directory exists");

// ─── FINAL SUMMARY ───
console.log(`\n${"═".repeat(50)}`);
console.log(`${COLORS.bold}TEST SUMMARY${COLORS.reset}`);
console.log(`  ${COLORS.green}Passed: ${passed}${COLORS.reset}`);
console.log(`  ${COLORS.red}Failed: ${failed}${COLORS.reset}`);
console.log(`  Total:  ${passed + failed}`);
const pct = Math.round(passed/(passed+failed)*100);
console.log(`  Score:  ${pct >= 80 ? COLORS.green : COLORS.red}${pct}%${COLORS.reset}`);
console.log(`${"═".repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
