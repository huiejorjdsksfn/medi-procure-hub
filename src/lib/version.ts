// updated
export const APP_VERSION = "11.0.0";
export const BUILD_DATE   = new Date().toISOString().slice(0,10);
export const HOSPITAL     = "Embu Level 5 Hospital";
export const SYSTEM_NAME  = "EL5 MediProcure";
export const APP_NAME     = "ProcurBosse";
export const SUPABASE_REF = "yvjfehnzbzjliizjvuhq";
export const TWILIO_SMS   = "+16812972643";
export const TWILIO_WA    = "+14155238886";
export const TWILIO_MG    = "MGd547d8e3273fda2d21afdd6856acb245";
export const TWILIO_VA    = "VA692606d4faea3c18432a857f111dbfad";
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
