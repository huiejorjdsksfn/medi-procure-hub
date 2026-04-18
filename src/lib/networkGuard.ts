/**
 * EL5 MediProcure  -- Network / IP Access Guard
 * 
 * Restricts system access to:
 *   1. Configured ALLOWED_PRIVATE_CIDRS (hospital LAN)
 *   2. Configured ALLOWED_PUBLIC_IPS (VPN endpoints / remote offices)
 * 
 * When not connected to an approved network the login page shows a
 * "Network Access Restricted" banner and blocks sign-in.
 */

export interface NetworkCheckResult {
  allowed:     boolean;
  ip:          string;
  network:     string;   // "private" | "public" | "unknown"
  reason:      string;
  checkedAt:   string;
}

/** Fetch the caller's public IP via ipify (fast, CORS-friendly, free) */
async function getPublicIP(): Promise<string> {
  try {
    const r = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const d = await r.json();
      return d.ip || "";
    }
  } catch { /* fallback */ }
  try {
    const r2 = await fetch("https://api4.my-ip.io/ip.json", { signal: AbortSignal.timeout(4000) });
    if (r2.ok) { const d = await r2.json(); return d.ip || ""; }
  } catch { /* silent */ }
  return "";
}

/** CIDR membership check (IPv4 only) */
function ipInCIDR(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/");
    const mask  = ~((1 << (32 - Number(bits))) - 1);
    const toInt = (addr: string) => addr.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
    return (toInt(ip) & mask) >>> 0 === (toInt(range) & mask) >>> 0;
  } catch { return false; }
}

function isPrivateIP(ip: string): boolean {
  const PRIVATE = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8"];
  return PRIVATE.some(c => ipInCIDR(ip, c));
}

/**
 * Parse allowed network config from system_settings.
 * Keys:
 *   ip_restriction_enabled   -- "true" / "false"
 *   allowed_private_cidrs    -- comma-separated, e.g. "192.168.1.0/24,10.0.0.0/8"
 *   allowed_public_ips       -- comma-separated public IPs / CIDRs
 *   allow_all_private         -- "true" = any RFC-1918 address is ok
 */
export interface NetworkPolicy {
  enabled:         boolean;
  allowAllPrivate: boolean;
  privateCIDRs:    string[];
  publicIPs:       string[];
}

export function parseNetworkPolicy(settings: Record<string, string>): NetworkPolicy {
  return {
    enabled:         (settings.ip_restriction_enabled || "false") === "true",
    allowAllPrivate: (settings.allow_all_private       || "true")  === "true",
    privateCIDRs:    (settings.allowed_private_cidrs   || "").split(",").map(s => s.trim()).filter(Boolean),
    publicIPs:       (settings.allowed_public_ips      || "").split(",").map(s => s.trim()).filter(Boolean),
  };
}

export async function checkNetworkAccess(policy: NetworkPolicy): Promise<NetworkCheckResult> {
  const now = new Date().toISOString();

  // Feature disabled -> always allow
  if (!policy.enabled) {
    return { allowed: true, ip: " --", network: "unrestricted", reason: "IP restriction is disabled", checkedAt: now };
  }

  const ip = await getPublicIP();
  if (!ip) {
    // Cannot detect IP  -- fail open (warn only) so VPN/proxy users aren't blocked silently
    return { allowed: true, ip: "unknown", network: "unknown", reason: "Could not detect IP  -- access allowed with warning", checkedAt: now };
  }

  const isPriv = isPrivateIP(ip);
  const networkType = isPriv ? "private" : "public";

  // Private IP check
  if (isPriv) {
    if (policy.allowAllPrivate) {
      return { allowed: true, ip, network: networkType, reason: "Private network (RFC-1918)  -- allowed", checkedAt: now };
    }
    if (policy.privateCIDRs.length && policy.privateCIDRs.some(c => ipInCIDR(ip, c))) {
      return { allowed: true, ip, network: networkType, reason: `IP ${ip} matched approved private CIDR`, checkedAt: now };
    }
    return { allowed: false, ip, network: networkType, reason: `Private IP ${ip} not in approved subnets. Connect to the hospital LAN or approved VPN.`, checkedAt: now };
  }

  // Public IP check
  if (policy.publicIPs.length) {
    const match = policy.publicIPs.find(entry =>
      entry.includes("/") ? ipInCIDR(ip, entry) : ip === entry
    );
    if (match) {
      return { allowed: true, ip, network: networkType, reason: `Public IP ${ip} matched approved entry: ${match}`, checkedAt: now };
    }
  }

  return {
    allowed: false, ip, network: networkType,
    reason: `Access from public IP ${ip} is not permitted. Connect to the hospital network or an approved VPN endpoint.`,
    checkedAt: now,
  };
}
