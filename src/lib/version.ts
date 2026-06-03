export const APP_VERSION  = "10.0.0";
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
export const TWILIO_ACCT  = "REDACTED_TWILIO_ACCOUNT_SID";
export const TWILIO_AUTH  = "REDACTED_TWILIO_AUTH_TOKEN";

export const CURRENT_VERSION = APP_VERSION;

export interface ReleaseEntry {
  version: string;
  date: string;
  status: "stable" | "lts" | "beta" | "deprecated";
  highlights: string[];
}

export const RELEASES: ReleaseEntry[] = [
  { version: "10.0.0", date: BUILD_DATE,    status: "stable", highlights: ["Twilio templates v2", "WhatsApp bot with menu + AI fallback", "Document Editor print templates", "Hardened edge functions"] },
  { version: "9.6.0",  date: "2026-05-20", status: "lts",    highlights: ["404 tracker", "Playwright e2e", "Release workflow"] },
  { version: "9.5.0",  date: "2026-05-10", status: "lts",    highlights: ["HashRouter refresh fix", "Cache busting"] },
  { version: "5.8.0",  date: "2025-12-01", status: "deprecated", highlights: ["Legacy installer baseline"] },
];

export function getTotalStats() {
  return {
    releases: RELEASES.length,
    stable:   RELEASES.filter(r => r.status === "stable").length,
    lts:      RELEASES.filter(r => r.status === "lts").length,
    latest:   RELEASES[0]?.version || APP_VERSION,
  };
}
