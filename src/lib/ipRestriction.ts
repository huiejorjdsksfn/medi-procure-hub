/**
 * ProcurBosse - IP Restriction Engine v4.0
 * - Real-time logging with geo, device, browser, OS, path, session
 * - Updates profiles.last_ip, last_seen, last_login on every auth'd access
 * - Enriches ip_access_log with city, country, user_agent detail
 */
import { supabase } from "@/integrations/supabase/client";

export interface IpCheckResult {
  allowed: boolean;
  ip: string;
  network: "private" | "public" | "localhost" | "unknown";
  reason: string;
  matchedCidr?: string;
  geo?: { city?: string; country?: string; org?: string; lat?: number; lon?: number };
}

/* ── IP helpers ── */
export async function getClientIp(): Promise<string> {
  const SERVICES = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json",
  ];
  for (const url of SERVICES) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (r.ok) { const d = await r.json(); if (d.ip) return d.ip; }
    } catch { /* next */ }
  }
  return "unknown";
}

export async function getIpGeo(ip: string): Promise<{ city?: string; country?: string; org?: string; lat?: number; lon?: number } | null> {
  if (!ip || ip === "unknown" || /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|::1)/.test(ip)) return null;
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.error) return null;
    return {
      city: d.city || undefined,
      country: d.country_name || d.country || undefined,
      org: d.org || d.isp || undefined,
      lat: d.latitude || undefined,
      lon: d.longitude || undefined,
    };
  } catch { return null; }
}

function ipToNum(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    if (ip === "unknown") return false;
    if (ip === "::1" && cidr.startsWith("127.")) return true;
    const [network, bits] = cidr.split("/");
    const prefixLen = parseInt(bits);
    if (isNaN(prefixLen)) return ip === network;
    const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
    return (ipToNum(ip) & mask) === (ipToNum(network) & mask);
  } catch { return false; }
}

export function detectNetworkType(ip: string): "private" | "public" | "localhost" | "unknown" {
  if (!ip || ip === "unknown") return "unknown";
  if (ip === "::1" || ip.startsWith("127.")) return "localhost";
  if (ipInCidr(ip,"10.0.0.0/8") || ipInCidr(ip,"172.16.0.0/12") || ipInCidr(ip,"192.168.0.0/16") || ipInCidr(ip,"169.254.0.0/16")) return "private";
  return "public";
}

/* ── Device / browser fingerprint ── */
export function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Desktop" };
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? "Safari" :
    /MSIE|Trident/.test(ua) ? "IE" : "Other";
  const os =
    /Windows NT 10/.test(ua) ? "Windows 10/11" :
    /Windows NT 6\.1/.test(ua) ? "Windows 7" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "Unknown";
  const device =
    /Mobi|Android|iPhone|iPad|iPod/.test(ua) ? "Mobile" :
    /Tablet|iPad/.test(ua) ? "Tablet" : "Desktop";
  return { browser, os, device };
}

/* ── Core check ── */
export async function checkIpAccess(userId?: string, userEmail?: string): Promise<IpCheckResult> {
  const ip      = await getClientIp();
  const network = detectNetworkType(ip);
  const geo     = await getIpGeo(ip);

  const { data: settings } = await (supabase as any)
    .from("system_settings")
    .select("key,value")
    .in("key", ["ip_restriction_enabled","allow_all_private","force_network_check","log_all_ips"]);

  const cfg: Record<string,string> = {};
  (settings || []).forEach((r: any) => { cfg[r.key] = r.value; });

  const enabled = cfg["ip_restriction_enabled"] === "true";
  const logAll  = cfg["log_all_ips"] !== "false";

  if (!enabled) {
    if (logAll) await logAccess(ip, network, true, "IP restriction disabled", userId, userEmail, geo);
    return { allowed: true, ip, network, reason: "IP restriction is disabled", geo: geo || undefined };
  }

  if (network === "localhost") {
    if (logAll) await logAccess(ip, network, true, "Localhost", userId, userEmail, geo);
    return { allowed: true, ip, network, reason: "Localhost access", matchedCidr: "127.0.0.0/8", geo: geo || undefined };
  }

  if (cfg["allow_all_private"] === "true" && network === "private") {
    if (logAll) await logAccess(ip, network, true, "Private network allowed", userId, userEmail, geo);
    return { allowed: true, ip, network, reason: "Private network (allowed)", matchedCidr: "private", geo: geo || undefined };
  }

  const { data: whitelist } = await (supabase as any)
    .from("network_whitelist")
    .select("cidr,type,label,active")
    .eq("active", true);

  for (const entry of (whitelist || [])) {
    if (ipInCidr(ip, entry.cidr)) {
      await logAccess(ip, network, true, `Matched: ${entry.label} (${entry.cidr})`, userId, userEmail, geo);
      return { allowed: true, ip, network, reason: `Allowed by rule: ${entry.label}`, matchedCidr: entry.cidr, geo: geo || undefined };
    }
  }

  const reason = `IP ${ip} not in whitelist (${(whitelist||[]).length} rules checked)`;
  await logAccess(ip, network, false, reason, userId, userEmail, geo);
  return { allowed: false, ip, network, reason, geo: geo || undefined };
}

/* ── Logger — writes ip_access_log AND updates profiles ── */
export async function logAccess(
  ip: string, network: string, allowed: boolean, reason: string,
  userId?: string, userEmail?: string,
  geo?: { city?: string; country?: string; org?: string; lat?: number; lon?: number } | null
): Promise<void> {
  try {
    const ua      = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const path    = typeof window   !== "undefined" ? window.location.hash.replace(/^#/,"") || "/" : "/";
    const session = (await (supabase as any).auth.getSession())?.data?.session?.access_token?.slice(-12) || null;

    await (supabase as any).from("ip_access_log").insert({
      ip_address:  ip,
      network,
      allowed,
      reason,
      user_id:     userId     || null,
      user_email:  userEmail  || null,
      user_agent:  ua.slice(0, 300),
      path,
      city:        geo?.city    || null,
      country:     geo?.country || null,
      session_id:  session,
      created_at:  new Date().toISOString(),
    });

    // Update profile with last IP and last_seen timestamp
    if (userId) {
      await (supabase as any).from("profiles").update({
        last_ip:   ip,
        last_seen: new Date().toISOString(),
      }).eq("id", userId);
    }
  } catch (e) {
    console.warn("IP log failed:", e);
  }
}

/* ── Update last_login on successful auth ── */
export async function recordLogin(userId: string, ip?: string): Promise<void> {
  try {
    const resolvedIp = ip || await getClientIp();
    await (supabase as any).from("profiles").update({
      last_login: new Date().toISOString(),
      last_ip:    resolvedIp,
      last_seen:  new Date().toISOString(),
    }).eq("id", userId);
  } catch (e) {
    console.warn("recordLogin failed:", e);
  }
}

export async function revokeSession(reason = "IP address not in whitelist"): Promise<void> {
  console.warn(`[IP Restriction] Session revoked: ${reason}`);
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = `/#/login?reason=${encodeURIComponent(reason)}`;
  }
}
