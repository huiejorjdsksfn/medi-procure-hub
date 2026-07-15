/**
 * EL5 MediProcure — Device & Session Tracker v1.0
 * Captures OS, browser, device, screen, timezone, language, IP, geolocation
 * Logs to audit_logs + user_sessions on every sign-in
 * Admin-accessible via DeviceTrackerPage
 */
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export interface DeviceInfo {
  os: string; os_version: string; browser: string; browser_version: string;
  device_type: "desktop" | "tablet" | "mobile" | "unknown";
  screen_w: number; screen_h: number; viewport_w: number; viewport_h: number;
  timezone: string; language: string; platform: string; touch: boolean;
  user_agent: string; cookies_enabled: boolean; dnt: boolean;
  cpu_cores?: number;
  device_memory_gb?: number;
  color_depth?: number;
  pixel_ratio?: number;
  connection?: string;
  downlink_mbps?: number;
  languages?: string[];
  webgl_vendor?: string;
  webgl_renderer?: string;
  canvas_hash?: string;
  storage_persistent?: boolean;
}

export interface GeoInfo {
  ip: string; country: string; country_code: string; region: string;
  city: string; postal: string; latitude: number; longitude: number;
  isp: string; org: string; timezone: string;
}

export interface SessionRecord {
  id?: string; user_id?: string; user_email?: string;
  device: DeviceInfo; geo?: GeoInfo; ip?: string;
  started_at: string; last_activity?: string;
  is_active?: boolean; session_key?: string;
}

/* ── UA parsers ──────────────────────────────────────────────────── */
function parseOS(ua: string): { os: string; version: string } {
  if (/Windows NT 10/.test(ua)) return { os: "Windows", version: "10/11" };
  if (/Windows NT 6\.3/.test(ua)) return { os: "Windows", version: "8.1" };
  if (/Windows NT 6\.1/.test(ua)) return { os: "Windows", version: "7" };
  if (/Mac OS X ([\d_]+)/.test(ua)) return { os: "macOS", version: ua.match(/Mac OS X ([\d_]+)/)![1].replace(/_/g, ".") };
  if (/Android ([\d.]+)/.test(ua)) return { os: "Android", version: ua.match(/Android ([\d.]+)/)![1] };
  if (/iPhone OS ([\d_]+)/.test(ua)) return { os: "iOS", version: ua.match(/iPhone OS ([\d_]+)/)![1].replace(/_/g, ".") };
  if (/iPad.*OS ([\d_]+)/.test(ua)) return { os: "iPadOS", version: ua.match(/OS ([\d_]+)/)![1].replace(/_/g, ".") };
  if (/Linux/.test(ua)) return { os: "Linux", version: "" };
  if (/CrOS/.test(ua)) return { os: "ChromeOS", version: "" };
  return { os: "Unknown", version: "" };
}

function parseBrowser(ua: string): { browser: string; version: string } {
  if (/Edg\/([\d.]+)/.test(ua))     return { browser: "Edge",    version: ua.match(/Edg\/([\d.]+)/)![1] };
  if (/OPR\/([\d.]+)/.test(ua))     return { browser: "Opera",   version: ua.match(/OPR\/([\d.]+)/)![1] };
  if (/Chrome\/([\d.]+)/.test(ua))  return { browser: "Chrome",  version: ua.match(/Chrome\/([\d.]+)/)![1] };
  if (/Firefox\/([\d.]+)/.test(ua)) return { browser: "Firefox", version: ua.match(/Firefox\/([\d.]+)/)![1] };
  if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) return { browser: "Safari", version: ua.match(/Version\/([\d.]+)/)![1] || "" };
  if (/MSIE ([\d.]+)/.test(ua))     return { browser: "IE",      version: ua.match(/MSIE ([\d.]+)/)![1] };
  return { browser: "Unknown", version: "" };
}

function deviceType(ua: string): DeviceInfo["device_type"] {
  if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) return "mobile";
  if (/Tablet|iPad|Android(?!.*Mobile)/.test(ua))    return "tablet";
  if (/Windows|Macintosh|Linux|CrOS/.test(ua))       return "desktop";
  return "unknown";
}

/* ── Exported: collect device fingerprint ─────────────────────────── */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const { os, version: os_version } = parseOS(ua);
  const { browser, version: browser_version } = parseBrowser(ua);
  const nav: any = navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  let webgl_vendor = ""; let webgl_renderer = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl") as any;
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      webgl_vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "";
      webgl_renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "";
    }
  } catch { /* noop */ }
  let canvas_hash = "";
  try {
    const c = document.createElement("canvas"); c.width = 200; c.height = 40;
    const ctx = c.getContext("2d")!;
    ctx.textBaseline = "top"; ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60"; ctx.fillRect(0,0,100,40);
    ctx.fillStyle = "#069"; ctx.fillText("EL5-FP-\u{1F512}", 4, 4);
    const data = c.toDataURL();
    let h = 0; for (let i=0;i<data.length;i++){ h = (h<<5)-h + data.charCodeAt(i); h |= 0; }
    canvas_hash = h.toString(16);
  } catch { /* noop */ }
  return {
    os, os_version, browser, browser_version,
    device_type: deviceType(ua),
    screen_w: screen.width, screen_h: screen.height,
    viewport_w: window.innerWidth, viewport_h: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform || "unknown",
    touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    user_agent: ua.slice(0, 400),
    cookies_enabled: navigator.cookieEnabled,
    dnt: !!navigator.doNotTrack,
    cpu_cores: nav.hardwareConcurrency || undefined,
    device_memory_gb: nav.deviceMemory || undefined,
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    connection: conn?.effectiveType || undefined,
    downlink_mbps: conn?.downlink || undefined,
    languages: (navigator.languages || []).slice(0, 5),
    webgl_vendor: webgl_vendor.slice(0, 120) || undefined,
    webgl_renderer: webgl_renderer.slice(0, 120) || undefined,
    canvas_hash: canvas_hash || undefined,
  };
}

/* ── Geo lookup (ipapi.co — free tier) ──────────────────────────── */
export async function getGeoInfo(ip?: string): Promise<GeoInfo | null> {
  try {
    const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.error) return null;
    return {
      ip: d.ip || ip || "unknown", country: d.country_name || "?",
      country_code: d.country_code || "?", region: d.region || "?",
      city: d.city || "?", postal: d.postal || "",
      latitude: d.latitude || 0, longitude: d.longitude || 0,
      isp: d.org || "?", org: d.org || "?", timezone: d.timezone || "",
    };
  } catch (_e) { /* ignore */ return null; }
}

/* ── Log session to DB ───────────────────────────────────────────── */
export async function logDeviceSession(
  userId: string | undefined,
  userEmail: string | undefined,
  geo?: GeoInfo | null,
): Promise<void> {
  const device = getDeviceInfo();
  const now = new Date().toISOString();
  const key = `${userId || "anon"}_${Date.now()}`;
  try {
    await Promise.allSettled([
      db.from("user_sessions").upsert({
        user_id: userId || null,
        user_email: userEmail || null,
        ip_address: geo?.ip || null,
        user_agent: device.user_agent,
        started_at: now,
        last_activity: now,
        is_active: true,
        request_count: 1,
        location: geo ? `${geo.city}, ${geo.country}` : null,
        // Store device + geo as JSON in a details column if it exists
      }, { onConflict: "user_id" }),

      db.from("audit_log").insert({
        user_id: userId || null,
        user_email: userEmail || null,
        action: "session_start",
        module: "auth",
        ip_address: geo?.ip || null,
        details: {
          os: `${device.os} ${device.os_version}`.trim(),
          browser: `${device.browser} ${device.browser_version}`.trim(),
          device_type: device.device_type,
          screen: `${device.screen_w}×${device.screen_h}`,
          timezone: device.timezone,
          language: device.language,
          user_agent: device.user_agent,
          country: geo?.country || null,
          city: geo?.city || null,
          isp: geo?.isp || null,
          latitude: geo?.latitude || null,
          longitude: geo?.longitude || null,
          cpu_cores: device.cpu_cores || null,
          device_memory_gb: device.device_memory_gb || null,
          pixel_ratio: device.pixel_ratio || null,
          connection: device.connection || null,
          downlink_mbps: device.downlink_mbps || null,
          gpu: device.webgl_renderer || null,
          canvas_hash: device.canvas_hash || null,
        },
        resource_type: "session",
        created_at: now,
      }),

      // Store full device fingerprint in system_settings for admin view
      db.from("system_settings").upsert({
        key: `device_session_${userId || "anon"}`,
        value: JSON.stringify({
          userId, userEmail, device, geo, timestamp: now,
        }),
        category: "device_sessions",
      }, { onConflict: "key" }),
    ]);
  } catch (_e) { /* silent — never block login */ }
}

/* ── Fetch all sessions for admin ───────────────────────────────── */
export async function getAllDeviceSessions(): Promise<any[]> {
  try {
    const { data } = await db.from("system_settings")
      .select("key,value,updated_at")
      .like("key", "device_session_%")
      .order("updated_at", { ascending: false })
      .limit(200);
    return (data || []).map((r: any) => {
      try { return { ...JSON.parse(r.value), _key: r.key, _updated: r.updated_at }; }
      catch (_e) { return { _key: r.key, _updated: r.updated_at }; }
    });
  } catch (_e) { return []; }
}
