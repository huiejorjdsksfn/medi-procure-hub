// updated
export const APP_VERSION = "11.10.0";
export const BUILD_DATE   = new Date().toISOString().slice(0,10);
export const HOSPITAL     = "Embu Level 5 Hospital";
export const SYSTEM_NAME  = "EL5 MediProcure";
export const APP_NAME     = "ProcurBosse";
export const SUPABASE_REF = "yvjfehnzbzjliizjvuhq";
export const TWILIO_SMS   = "+16812972643";
export const TWILIO_WA    = "+14155238886";
export const TWILIO_MG    = "REDACTED_TWILIO_MESSAGING_SID";
export const TWILIO_VA    = "REDACTED_TWILIO_VERIFY_SID";
export const WA_CODE      = "join bad-machine";
/** @deprecated Credentials live in Supabase secrets only; never hardcode. */
export const TWILIO_ACCT  = "";
/** @deprecated Credentials live in Supabase secrets only; never hardcode. */
export const TWILIO_AUTH  = "";

export const CURRENT_VERSION = APP_VERSION;

export interface ReleaseEntry {
  version: string;
  date: string;
  status: "stable" | "lts" | "beta" | "deprecated";
  highlights: string[];
  codename?: string;
  dbMigrations: number;
  bugsFixed: number;
  engines: string[];
  modules: string[];
}

export const RELEASES: ReleaseEntry[] = [
  { version: "11.10.0", date: "2026-06-20",  status: "stable", codename: "Schema Reconciliation",
    highlights: [
      "Fix: budgets missing description/total_budget/spent/remaining/vote_head columns (same duplicate-CREATE-TABLE root cause as prior fixes) — migration adds them + back-fills from the columns that DO exist",
      "Fix: fixed_assets missing annual_depreciation + 7 other columns (four competing CREATE TABLE migrations existed for this one table)",
      "Fix: gl_entries missing narration/fiscal_year/period/posted_by_name columns",
      "Fix: gl_entries.posted_by is a UUID foreign key but the code was writing a name/email string into it — would have thrown 'invalid input syntax for type uuid' on first real post. Now writes user.id to posted_by and the display name to the new posted_by_name column; UI and CSV export updated to match",
      "Fix: lib/api.ts glApi.listEntries ordered by 'entry_date' and filtered by 'account_code' — neither column has ever existed on the live gl_entries table. Now orders by created_at and filters by gl_account",
      "Fix: 'invalid input syntax for type numeric: \"\"' — root-caused to {...form} spreads sending empty-string form fields straight into numeric/date database columns. Fixed across 7 forms: PurchaseVouchersPage (tax_rate/due_date), SalesVouchersPage (tax_rate/due_date), FixedAssetsPage (purchase_date/warranty_expiry), ProcurementPlanningPage (start_date/end_date), ContractsPage (start_date/end_date), TendersPage (opening_date/closing_date/bid_bond_amount), NonConformancePage (target_date), ItemsPage (expiry_date)",
      "types.ts brought back in sync with the real live schema for budgets, fixed_assets, and gl_entries (the gl_entries types had drifted to model a schema that was never actually deployed)",
      "Rebuilt dist/ and web/ deployment bundles",
      "Verified zero TypeScript errors and a clean production build after every change",
      "Version bump 11.9.0 -> 11.10.0",
    ],
    dbMigrations: 1, bugsFixed: 9,
    engines: ["SchemaCache"],
    modules: ["Finance","Vouchers","Procurement","Quality","Inventory"] },
  { version: "11.9.0", date: "2026-06-20",  status: "stable", codename: "Full Coverage",
    highlights: [
      "Exhaustive button audit: zero genuinely dead onClick handlers remain anywhere in the app (1100+ handlers verified, no-op/empty/console.log-only patterns scanned, bare function refs checked against definitions)",
      "Orphaned-page audit: found 6 fully-built pages with zero routes (unreachable by any user) — SystemReportPage, EnterpriseDashboardPage, TrackingApprovalPage, PrintEnginePage, DatabaseAdminPage, CommunicationsPage",
      "Routed the 4 genuinely unique ones: /dashboard/enterprise, /reports/system-utilization, /reports/print-engine, /tracking-approval — each now has a discoverable nav link, not just a URL",
      "Skipped routing DatabaseAdminPage and CommunicationsPage — confirmed legacy duplicates already superseded by the actively-maintained AdminDatabasePage and SMSPage; adding routes for these would have created confusing duplicate functionality",
      "Updated role-access matrix (sessionCookie.ts) so the new /tracking-approval route is actually reachable by procurement_manager, procurement_officer, inventory_manager, warehouse_officer, and requisitioner roles, not just admins",
      "Rebuilt both dist/ and web/ deployment bundles to include the newly-routed pages",
      "Verified zero TypeScript errors and a clean production build after every change",
      "Version bump 11.8.0 -> 11.9.0",
    ],
    dbMigrations: 0, bugsFixed: 6,
    engines: ["Routing","Navigation"],
    modules: ["Dashboard","Reports","Procurement"] },
  { version: "11.8.0", date: "2026-06-20",  status: "stable", codename: "Security Patch",
    highlights: [
      "Security: npm audit fix resolved 35 of 42 vulnerabilities (4 critical -> 0) — affected axios, react-router, react-router-dom, ws, lodash, rollup, tar, and others",
      "Security: replaced abandoned/vulnerable 'xlsx' npm package (frozen at 0.18.5, prototype pollution + ReDoS, no fix on npm) with '@e965/xlsx' — an automated npm mirror of the patched SheetJS 0.20.x releases, across all 24 files that import it",
      "Security: PDF.js text-extraction hardened (isEvalSupported/disableAutoFetch/disableStream/disableFontFace) against GHSA-wgrm-67xf-hhpq without the breaking v4+ .mjs worker migration",
      "Rebuilt and re-committed the web/ deployment bundle so no stale vulnerable xlsx code remains in the tracked build output",
      "Runtime fix: PrintEnginePage — a single malformed saved template could throw inside a .then() and silently break the entire template list; now guarded per-template with a safe fallback",
      "Runtime fix: structuredCloneSafe (conflict resolver) hardened against non-serializable values instead of throwing",
      "Verified zero TypeScript errors and a clean production build (3445 modules) after every change",
      "Version bump 11.7.0 -> 11.8.0",
    ],
    dbMigrations: 0, bugsFixed: 4,
    engines: ["Security","BuildPipeline"],
    modules: ["Dependencies","Documents","Reports"] },
  { version: "11.7.0", date: "2026-06-19",  status: "stable", codename: "Button Audit",
    highlights: [
      "Fix: purchase_vouchers missing 'expense_account' & 'tax_rate' columns (schema cache error) — duplicate conflicting CREATE TABLE IF NOT EXISTS migrations resolved",
      "Fix: sales_vouchers missing 'tax_rate', 'patient_number', 'department_id' columns — same root cause as purchase_vouchers",
      "Heavily audited 1100+ onClick handlers app-wide via static analysis — found and fixed 8 genuinely dead/broken buttons",
      "PaymentVouchersPage: 'Refresh' toolbar button called nonexistent fetchData() — now correctly calls fetchVouchers()",
      "PaymentVouchersPage, FacilitiesPage, QualityDashboardPage: dead 'Print'/'Export' toolbar buttons wired to window.print() / CSV export",
      "BackupPage: 'Verify Last Backup' and 'Save Schedule' buttons now functional (were no-ops)",
      "WhatsAppPage: Quick-broadcast 'Load' buttons now fetch real recipient phone numbers by role/department/supplier instead of doing nothing",
      "TelephonyPage: Voicemail 'Play' button now actually plays audio (HTML5 Audio, play/pause toggle, marks as listened)",
      "EnterpriseDashboardPage: sidebar + top tab strips were fully inert — now stateful with active highlighting and 'coming soon' toast for unbuilt sections",
      "TrackingApprovalPage: 9-icon quick-action ribbon now navigates to Requisitions/POs/Reports/Items/Backup/Goods-Received",
      "Verified clean production build (vite build, 3445 modules, zero errors) after all fixes",
      "Version bump 11.6.0 → 11.7.0",
    ],
    dbMigrations: 1, bugsFixed: 11,
    engines: ["SchemaCache","UIAudit"],
    modules: ["Vouchers","Finance","Backup","WhatsApp","Telephony","Enterprise","Tracking"] },
  { version: "11.6.0", date: "2026-06-18",  status: "stable", codename: "Resilience Pass",
    highlights: [
      "Fix: 'public.ip_access_rules' table did not exist — created with full RLS, unique IP index, hit-count trigger",
      "Fix: AuthContext rewritten — user data no longer blanks after a few seconds (DB fetch failures keep existing roles instead of wiping state)",
      "Fix: role no longer flips on page refresh — TOKEN_REFRESHED event no longer re-triggers a full role reload",
      "Fix: AppLayout & DashboardPage nav/redirect no longer fire on the default 'requisitioner' role before real roles finish loading",
      "send-sms edge function hardened: lazy Supabase client init (prevents cold-start crash), full handler wrapped in try/catch",
      "SMSPage: all 5 edge-function calls now use invokeFunctionWithRetry — auto-retries once on transient failure",
      "fetchUserData: falls back to cache when DB returns 0 roles (prevents transient RLS hiccups from clearing the UI)",
      "Version bump 11.5.0 → 11.6.0",
    ],
    dbMigrations: 1, bugsFixed: 6,
    engines: ["AuthContext","SchemaCache","SMSEngine"],
    modules: ["Auth","Security","SMS","Dashboard","Navigation"] },
  { version: "11.5.0", date: "2026-06-18",  status: "stable", codename: "Schema Fortress",
    highlights: [
      "Critical fix: 'gl_account' column missing from payment_vouchers & receipt_vouchers (schema cache error)",
      "Migration 20260618100001 adds gl_account + 20+ missing columns to both voucher tables via IF NOT EXISTS",
      "NOTIFY pgrst reload schema after migration — eliminates stale cache errors permanently",
      "Updated Supabase types.ts: payment_vouchers and receipt_vouchers now fully typed (payee, po_reference, invoice_reference, vote_head, currency, received_by, etc.)",
      "journal_vouchers: added gl_account, vote_head, period, cost_centre, budget_line, fund_code columns",
      "Offline banner confirmed working — PWA cached mode operational",
      "Module-wide upgrade pass: DashboardPage, FinanceDashboardPage, AccountantWorkspacePage, ReportsPage, VouchersPage",
      "Version bump 11.4.0 → 11.5.0",
    ],
    dbMigrations: 1, bugsFixed: 8,
    engines: ["VoucherWorkflowEngine","SchemaCache"],
    modules: ["Finance","Vouchers","Accountant","Dashboard","Reports"] },
  { version: "11.4.0", date: "2026-06-16",  status: "stable", codename: "Security Hardening",
    highlights: ["Session role hardening", "Security migration applied", "Credential vault lockdown"],
    dbMigrations: 1, bugsFixed: 5, engines: ["AuthContext"], modules: ["Security","Admin"] },
  { version: "11.0.0", date: "2026-06-03",  status: "stable", codename: "WhatsApp Pro",
    highlights: ["Full WhatsApp Business Workflow Hub", "8-tab WA page: Sessions, Compose, Broadcast, Templates, Approvals, Workflows, History, Settings", "Reply-based approval automation (APPROVE/REJECT via WhatsApp)", "Twilio webhook edge function (whatsapp-webhook)", "16 WA message templates across all procurement modules", "Procure-to-pay workflow automation", "Broadcast to multiple recipients", "QR sandbox join code + live preview", "WhatsApp added to ERP wheel + dashboard quick actions + nav"],
    dbMigrations: 0, bugsFixed: 3, engines: ["WhatsAppEngine","TwilioWebhook"], modules: ["WhatsApp","Communications","Approvals","Workflows"] },
  { version: "10.0.0", date: BUILD_DATE,    status: "stable", codename: "Twilio & Docs",
    highlights: ["Twilio templates v2", "WhatsApp bot menu + AI fallback", "Document Editor print templates", "Hardened edge functions"],
    dbMigrations: 2, bugsFixed: 12, engines: ["PrintEngine","WhatsAppEngine","NotificationEngine"], modules: ["Inventory","Suppliers","Documents","SMS"] },
  { version: "9.6.0",  date: "2026-05-20", status: "lts",    codename: "Resilience",
    highlights: ["404 tracker", "Playwright e2e", "Release workflow"],
    dbMigrations: 1, bugsFixed: 6, engines: ["AuditEngine"], modules: ["Admin","CI/CD"] },
  { version: "9.5.0",  date: "2026-05-10", status: "lts",    codename: "Refresh-Safe",
    highlights: ["HashRouter refresh fix", "Cache busting"],
    dbMigrations: 0, bugsFixed: 4, engines: [], modules: ["Routing"] },
  { version: "5.8.0",  date: "2025-12-01", status: "deprecated", codename: "Legacy",
    highlights: ["Legacy installer baseline"],
    dbMigrations: 0, bugsFixed: 0, engines: [], modules: ["All existing modules"] },
];

export function getTotalStats() {
  const totalMigrations = RELEASES.reduce((s,r)=>s+(r.dbMigrations||0),0);
  const totalBugsFixed  = RELEASES.reduce((s,r)=>s+(r.bugsFixed||0),0);
  const allEngines      = Array.from(new Set(RELEASES.flatMap(r=>r.engines||[])));
  const totalPages      = 54;
  return {
    totalReleases:   RELEASES.length,
    totalMigrations,
    totalBugsFixed,
    allEngines,
    totalPages,
    releases:        RELEASES.length,
    stable:          RELEASES.filter(r => r.status === "stable").length,
    lts:             RELEASES.filter(r => r.status === "lts").length,
    latest:          RELEASES[0]?.version || APP_VERSION,
  };
}
