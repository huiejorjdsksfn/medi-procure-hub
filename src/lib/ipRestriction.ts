/**
 * ProcurBosse  -- IP Restriction Engine
 * Reads network_whitelist table + system_settings to enforce IP access.
 * Logs every check to ip_access_log table.
 * Called from NetworkGuard component on every app load.
 */
import { supabase } from "@/integrations/supabase/client";

export interface IpCheckResult {
  allowed: boolean;
  ip: string;
  network: "private" | "public" | "localhost" | "unknown";
  reason: string;
  matchedCidr?: string;
}

/** Fetch the client's public IP */
export async function getClientIp(): Promise<string> {
  try {
    const r = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    if (r.ok) { const d = await r.json(); return d.ip || "unknown"; }
  } catch { /* ignore */ }
  try {
    const r = await fetch("https://checkip.amazonaws.com", { signal: AbortSignal.timeout(3000) });
    if (r.ok) return (await r.text()).trim();
  } catch { /* ignore */ }
  return "unknown";
}

/** Convert CIDR to IP range for basic matching */
function ipToNum(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    if (ip === "unknown") return false;
    // Handle IPv6 localhost
    if (ip === "::1" && cidr.startsWith("127.")) return true;
    const [network, bits] = cidr.split("/");
    const prefixLen = parseInt(bits);
    if (isNaN(prefixLen)) return ip === network;
    const ipNum = ipToNum(ip);
    const netNum = ipToNum(network);
    const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
    return (ipNum & mask) === (netNum & mask);
  } catch { return false; }
}

function detectNetworkType(ip: string): "private" | "public" | "localhost" | "unknown" {
  if (ip === "unknown" || ip === "") return "unknown";
  if (ip === "::1" || ip.startsWith("127.")) return "localhost";
  if (
    ipInCidr(ip, "10.0.0.0/8") ||
    ipInCidr(ip, "172.16.0.0/12") ||
    ipInCidr(ip, "192.168.0.0/16") ||
    ipInCidr(ip, "169.254.0.0/16")
  ) return "private";
  return "public";
}

/** Main IP check function */
export async function checkIpAccess(userId?: string, userEmail?: string): Promise<IpCheckResult> {
  const ip = await getClientIp();
  const network = detectNetworkType(ip);

  // Fetch settings
  const { data: settings } = await (supabase as any)
    .from("system_settings")
    .select("key,value")
    .in("key", ["ip_restriction_enabled","allow_all_private","force_network_check","log_all_ips"]);

  const cfg: Record<string,string> = {};
  (settings || []).forEach((r: any) => { cfg[r.key] = r.value; });

  const enabled = cfg["ip_restriction_enabled"] === "true";
  const logAll = cfg["log_all_ips"] !== "false";

  // If restriction not enabled, allow all
  if (!enabled) {
    if (logAll) await logAccess(ip, network, true, "IP restriction disabled", userId, userEmail);
    return { allowed: true, ip, network, reason: "IP restriction is disabled" };
  }

  // Localhost always allowed
  if (network === "localhost") {
    if (logAll) await logAccess(ip, network, true, "Localhost", userId, userEmail);
    return { allowed: true, ip, network, reason: "Localhost access", matchedCidr: "127.0.0.0/8" };
  }

  // Allow all private?
  if (cfg["allow_all_private"] === "true" && network === "private") {
    if (logAll) await logAccess(ip, network, true, "Private network allowed", userId, userEmail);
    return { allowed: true, ip, network, reason: "Private network (allowed)", matchedCidr: "private" };
  }

  // Fetch whitelist
  const { data: whitelist } = await (supabase as any)
    .from("network_whitelist")
    .select("cidr,type,label,active")
    .eq("active", true);

  const entries = whitelist || [];
  for (const entry of entries) {
    if (ipInCidr(ip, entry.cidr)) {
      await logAccess(ip, network, true, `Matched whitelist: ${entry.label} (${entry.cidr})`, userId, userEmail);
      return { allowed: true, ip, network, reason: `Allowed by rule: ${entry.label}`, matchedCidr: entry.cidr };
    }
  }

  // Denied
  const reason = `IP ${ip} not in whitelist (${entries.length} active rules checked)`;
  await logAccess(ip, network, false, reason, userId, userEmail);
  return { allowed: false, ip, network, reason };
}

/** Log access attempt to ip_access_log table */
async function logAccess(
  ip: string, network: string, allowed: boolean,
  reason: string, userId?: string, userEmail?: string
): Promise<void> {
  try {
    await (supabase as any).from("ip_access_log").insert({
      ip_address: ip,
      network,
      allowed,
      reason,
      user_id: userId || null,
      user_email: userEmail || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("IP log failed:", e);
  }
}

/** Revoke a user session by logging them out */
export async function revokeSession(reason = "IP address not in whitelist"): Promise<void> {
  console.warn(`[IP Restriction] Session revoked: ${reason}`);
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
  }
}
