export const APP_VERSION  = "10.0.0";
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
export const TWILIO_ACCT  = "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a";
export const TWILIO_AUTH  = "d73601fbefe26e01b06e22c53a798ea6";

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
