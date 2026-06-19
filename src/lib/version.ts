// updated
export const APP_VERSION = "11.6.0";
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
