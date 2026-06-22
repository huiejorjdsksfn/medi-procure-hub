/**
 * ReleasesPage — EL5 MediProcure
 * Browse GitHub releases and download Windows desktop installers,
 * Web bundles, or launcher scripts for any version.
 * 
 * Features:
 * - Direct GitHub API fallback (no Supabase dependency required)
 * - Visual Studio C++ Redistributable detection and one-click install
 * - Download progress tracking
 * - Automatic app extraction and launch
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Download, RefreshCw, Monitor, Globe, Terminal,
  CheckCircle2, ChevronDown, ChevronUp, Tag, Calendar,
  HardDrive, Package, Star, AlertCircle, ExternalLink,
  ArrowLeft, Shield, Cpu, Zap, Wrench, FolderOpen, Play,
  X, Check, AlertTriangle, Loader2, FileArchive, ShieldCheck,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// ─── constants ───────────────────────────────────────────────────────────────
const GITHUB_API = "https://api.github.com/repos/huiejorjdsksfn/medi-procure-hub/releases";
const VCREDIST_URLS = {
  x64: "https://aka.ms/vs/17/release/vc_redist.x64.exe",
  x86: "https://aka.ms/vs/17/release/vc_redist.x86.exe",
};
const WEB_APP_URL = "https://procurbosse.edgeone.app";

// Platform detection
const detectPlatform = (): "windows" | "macos" | "linux" | "ios" | "android" | "other" => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for Capacitor native platforms first
  // @ts-ignore
  const isCapacitor = window.Capacitor?.isNativePlatform?.() || 
                      window.capacitor?.isNative?.() ||
                      (typeof window.webkit !== "undefined" && window.webkit.messageHandlers?.CapacitorApp);
  
  if (isCapacitor) {
    // @ts-ignore
    const platform = window.Capacitor?.getPlatform?.() || 
                    window.capacitor?.platform;
    if (platform === 'ios') return "ios";
    if (platform === 'android') return "android";
  }
  
  // Fallback to user agent detection
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("android")) return "android";
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "other";
};

const PLATFORM_META = {
  windows: {
    label: "Windows",
    icon: Monitor,
    color: "#0078d4",
    bg: "#eff6ff",
    desc: "Download and install the desktop app",
    supportsDesktop: true,
    supportsMobile: false,
  },
  macos: {
    label: "macOS",
    icon: Monitor,
    color: "#333333",
    bg: "#f5f5f5",
    desc: "Download and install the desktop app",
    supportsDesktop: true,
    supportsMobile: false,
  },
  linux: {
    label: "Linux",
    icon: Monitor,
    color: "#e95420",
    bg: "#fff4f0",
    desc: "Download and install the desktop app",
    supportsDesktop: true,
    supportsMobile: false,
  },
  ios: {
    label: "iOS",
    icon: Package,
    color: "#007aff",
    bg: "#f0f7ff",
    desc: "Download and install the native iOS app",
    supportsDesktop: false,
    supportsMobile: true,
  },
  android: {
    label: "Android",
    icon: Package,
    color: "#3ddc84",
    bg: "#f0fff4",
    desc: "Download and install the native Android app",
    supportsDesktop: false,
    supportsMobile: true,
  },
  other: {
    label: "Desktop/Web",
    icon: Globe,
    color: "#059669",
    bg: "#f0fdf4",
    desc: "Download desktop app or access via web",
    supportsDesktop: true,
    supportsMobile: true,
  },
};

// ─── types ──────────────────────────────────────────────────────────────────
interface GHAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
  created_at: string;
}
interface GHRelease {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  body: string;
  html_url: string;
  assets: GHAsset[];
}

// Asset kind extended for mobile
type AssetKind = "win64" | "win32" | "web" | "launcher" | "checksum" | "android" | "ios" | "other";

const assetKind = (name: string): AssetKind => {
  const lower = name.toLowerCase();
  if (lower.includes("android") || lower.endsWith(".apk") || lower.includes("-android")) return "android";
  if (lower.includes("ios") || lower.endsWith(".ipa")) return "ios";
  if (lower.includes("win-x64") || lower.includes("win64")) return "win64";
  if (lower.includes("win-ia32")) return "win32";
  if (lower.includes("web.zip") || lower.includes("-web.")) return "web";
  if (lower.endsWith(".bat") || lower.endsWith(".cmd") || lower.endsWith(".sh")) return "launcher";
  if (lower.includes("sha256") || lower.endsWith(".txt")) return "checksum";
  return "other";
};
interface DownloadProgress {
  assetId: number;
  name: string;
  progress: number;
  downloaded: number;
  total: number;
  status: "downloading" | "complete" | "error";
  error?: string;
}
interface InstallState {
  vcRedistMissing: boolean;
  vcRedistInstalling: boolean;
  appExtracting: boolean;
  appReady: boolean;
  error?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtSize = (bytes: number) => {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

const fmtSpeed = (bytesPerSec: number) => {
  if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
  if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
};

const KIND_META = {
  win64:    { label: "Windows 64-bit",  icon: Monitor,   color: "#0078d4", bg: "#eff6ff", desc: "Recommended for modern PCs (most common)" },
  win32:    { label: "Windows 32-bit",  icon: Cpu,       color: "#6b7280", bg: "#f9fafb", desc: "For older 32-bit Windows systems" },
  android:  { label: "Android App",      icon: Package,   color: "#3ddc84", bg: "#f0fff4", desc: "Install directly on Android (.apk)" },
  ios:      { label: "iOS App",          icon: Package,   color: "#007aff", bg: "#f0f7ff", desc: "Sideload on iPhone/iPad (.ipa)" },
  web:      { label: "Web Bundle",      icon: Globe,     color: "#059669", bg: "#f0fdf4", desc: "Self-contained web app — run with any web server" },
  launcher: { label: "Launcher Script", icon: Terminal,  color: "#7c3aed", bg: "#faf5ff", desc: "Quick-start .bat / .cmd scripts" },
  checksum: { label: "Checksum",        icon: Shield,    color: "#94a3b8", bg: "#f8fafc", desc: "SHA-256 hash verification file" },
  other:    { label: "Other",           icon: Package,   color: "#64748b", bg: "#f8fafc", desc: "" },
type AssetKindType = "win64" | "win32" | "web" | "launcher" | "checksum" | "android" | "ios" | "admin" | "kiosk" | "server" | "other";

const assetKind = (name: string): AssetKindType => {
  const lower = name.toLowerCase();
  if (lower.includes("android") || lower.endsWith(".apk") || lower.includes("-android")) return "android";
  if (lower.includes("ios") || lower.endsWith(".ipa")) return "ios";
  if (lower.includes("admin") || lower.includes("it-admin") || lower.includes("server-app")) return "admin";
  if (lower.includes("kiosk")) return "kiosk";
  if (lower.includes("server") && lower.includes("windows")) return "server";
  if (lower.includes("win-x64") || lower.includes("windows-x64")) return "win64";
  if (lower.includes("win-ia32") || lower.includes("windows-ia32")) return "win32";
  if (lower.includes("web.zip") || lower.includes("-web.")) return "web";
  if (lower.endsWith(".bat") || lower.endsWith(".cmd") || lower.endsWith(".sh")) return "launcher";
  if (lower.includes("sha256") || lower.endsWith(".txt")) return "checksum";
  return "other";
};

const KIND_META = {
  win64:    { label: "Windows App (x64)", icon: Monitor,   color: "#0078d4", bg: "#eff6ff", desc: "Standard Windows desktop app for procurement staff" },
  win32:    { label: "Windows App (x86)", icon: Cpu,       color: "#6b7280", bg: "#f9fafb", desc: "For older 32-bit Windows systems" },
  android:  { label: "Android App",        icon: Package,   color: "#3ddc84", bg: "#f0fff4", desc: "Native Android app — install directly on devices" },
  ios:      { label: "iOS App",           icon: Package,   color: "#007aff", bg: "#f0f7ff", desc: "Native iOS app — sideload on iPhone/iPad" },
  admin:    { label: "IT Admin App",      icon: Shield,    color: "#8b5cf6", bg: "#faf5ff", desc: "Full system control — Supabase access + admin features" },
  kiosk:    { label: "Kiosk App",        icon: Monitor,   color: "#f59e0b", bg: "#fffbeb", desc: "Self-service kiosk for visitors and staff" },
  server:   { label: "Server/IT App",     icon: Server,   color: "#10b981", bg: "#f0fdf4", desc: "Server management — full access + overview dashboard" },
  web:      { label: "Web Bundle",         icon: Globe,     color: "#059669", bg: "#f0fdf4", desc: "Self-hosted web app — run with any web server" },
  launcher: { label: "Launcher Script",    icon: Terminal,  color: "#7c3aed", bg: "#faf5ff", desc: "Quick-start scripts (.bat / .cmd / .sh)" },
  checksum: { label: "Checksum",          icon: Shield,    color: "#94a3b8", bg: "#f8fafc", desc: "SHA-256 hash verification file" },
  other:    { label: "Other",             icon: Package,   color: "#64748b", bg: "#f8fafc", desc: "" },
};

// ─── Direct GitHub API fetch ────────────────────────────────────────────────
async function fetchReleasesFromGitHub(): Promise<GHRelease[]> {
  const response = await fetch(GITHUB_API, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "EL5-MediProcure-ReleasesPage/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  const data = await response.json();
  return data.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    tag_name: r.tag_name as string,
    name: (r.name as string) || (r.tag_name as string),
    published_at: r.published_at as string,
    prerelease: r.prerelease as boolean,
    draft: r.draft as boolean,
    body: (r.body as string) || "",
    html_url: r.html_url as string,
    assets: ((r.assets as unknown[]) || []).map((a: Record<string, unknown>) => ({
      id: a.id as number,
      name: a.name as string,
      size: a.size as number,
      download_count: (a.download_count as number) || 0,
      browser_download_url: a.browser_download_url as string,
      content_type: (a.content_type as string) || "application/octet-stream",
      created_at: a.created_at as string,
    })),
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReleasesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [releases, setReleases] = useState<GHRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "stable" | "pre">("all");
  
  // Platform detection
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("other");
  
  // Download progress tracking
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const activeDownloads = useRef<Set<string>>(new Set());
  
  // Install state
  const [installState, setInstallState] = useState<InstallState>({
    vcRedistMissing: false,
    vcRedistInstalling: false,
    appExtracting: false,
    appReady: false,
  });
  
  // Detect platform on mount
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // ─── Load releases with dual fallback ─────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Try Supabase function first
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("github-releases");
        if (!fnErr && data) {
          setReleases(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0) setExpanded(data[0].id);
          setLoading(false);
          return;
        }
      } catch {
        // Supabase failed, fall through to direct GitHub API
      }
      
      // Direct GitHub API fallback (no rate limits for public repos)
      const ghData = await fetchReleasesFromGitHub();
      setReleases(ghData);
      if (ghData.length > 0) setExpanded(ghData[0].id);
    } catch (e: any) {
      setError(e.message || "Failed to load releases");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Download with progress tracking ──────────────────────────────────────
  const triggerDownload = useCallback(async (asset: GHAsset) => {
    if (activeDownloads.current.has(asset.name)) return;
    
    activeDownloads.current.add(asset.name);
    setDownloading(asset.name);
    
    const progressKey = `${asset.id}-${asset.name}`;
    setDownloadProgress(prev => ({
      ...prev,
      [progressKey]: {
        assetId: asset.id,
        name: asset.name,
        progress: 0,
        downloaded: 0,
        total: asset.size,
        status: "downloading",
      },
    }));

    try {
      toast({
        title: `Downloading ${asset.name}`,
        description: `${fmtSize(asset.size)} — please wait`,
      });

      // Use fetch with progress tracking via XMLHttpRequest
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", asset.browser_download_url, true);
        xhr.responseType = "blob";
        
        xhr.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            const speed = e.loaded / ((Date.now() - (xhr.upload?.startTime || Date.now())) / 1000);
            setDownloadProgress(prev => ({
              ...prev,
              [progressKey]: {
                ...prev[progressKey],
                progress,
                downloaded: e.loaded,
                total: e.total,
              },
            }));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            // Trigger download via blob URL
            const blob = xhr.response;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = asset.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setDownloadProgress(prev => ({
              ...prev,
              [progressKey]: {
                ...prev[progressKey],
                progress: 100,
                status: "complete",
              },
            }));
            
            toast({
              title: "Download Complete",
              description: `${asset.name} has been downloaded. Extract and run to install.`,
            });
            resolve();
          } else {
            reject(new Error(`Download failed: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.upload.startTime = Date.now();
        xhr.send();
      });
    } catch (e: any) {
      setDownloadProgress(prev => ({
        ...prev,
        [progressKey]: {
          ...prev[progressKey],
          status: "error",
          error: e.message,
        },
      }));
      toast({
        title: "Download Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      activeDownloads.current.delete(asset.name);
      setDownloading(null);
      setTimeout(() => {
        setDownloadProgress(prev => {
          const next = { ...prev };
          delete next[progressKey];
          return next;
        });
      }, 5000);
    }
  }, [toast]);

  // ─── One-click install for VC++ Redistributable ──────────────────────────────
  const installVCRedist = useCallback(async () => {
    setInstallState(prev => ({ ...prev, vcRedistInstalling: true }));
    
    try {
      // Open the VC++ redistributable download in browser
      // User will download and install it manually
      window.open(VCREDIST_URLS.x64, "_blank");
      
      toast({
        title: "Visual Studio Redistributable",
        description: "Please download and run vc_redist.x64.exe to install the required runtime.",
      });
      
      // Show instructions dialog
      const confirmed = window.confirm(
        "Visual Studio C++ Redistributable is required.\n\n" +
        "1. Click OK to download vc_redist.x64.exe\n" +
        "2. Run the installer\n" +
        "3. Restart this app and try again\n\n" +
        "Click Cancel if already installed."
      );
      
      if (!confirmed) {
        setInstallState(prev => ({ ...prev, vcRedistMissing: false }));
      }
    } catch (e: any) {
      setInstallState(prev => ({ ...prev, error: e.message }));
    }
    setInstallState(prev => ({ ...prev, vcRedistInstalling: false }));
  }, [toast]);

  // ─── Quick install .exe (for portable executables) ─────────────────────────
  const quickInstall = useCallback(async (asset: GHAsset) => {
    const isZip = asset.name.endsWith(".zip");
    
    // First, check for VC++ redistributable on Windows
    if (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")) {
      // Check if VC++ redist is likely missing (heuristic)
      // We'll prompt the user
      const needsRedist = window.confirm(
        "For the best experience, Visual Studio C++ Redistributable is recommended.\n\n" +
        "Click OK to install it first, or Cancel to continue without it."
      );
      
      if (needsRedist) {
        setInstallState(prev => ({ ...prev, vcRedistMissing: true }));
        await installVCRedist();
        if (installState.vcRedistMissing) return; // User cancelled
      }
    }
    
    // Download the file
    await triggerDownload(asset);
  }, [triggerDownload, installVCRedist, installState]);

  // ─── Check app readiness ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.getVersion?.().then(() => {
        setInstallState(prev => ({ ...prev, appReady: true }));
      }).catch(() => {});
    }
  }, []);

  const filtered = releases.filter(r => {
    if (filter === "stable") return !r.prerelease && !r.draft;
    if (filter === "pre") return r.prerelease;
    return !r.draft;
  });

  const latest = filtered[0];

  // ─── group assets by kind for a release ───────────────────────────────────
  const groupAssets = (assets: GHAsset[]) => {
    const groups: Record<string, GHAsset[]> = {};
    assets.forEach(a => {
      const k = assetKind(a.name);
      if (!groups[k]) groups[k] = [];
      groups[k].push(a);
    });
    return groups;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,#0a1628 0%,#0d2146 60%,#1a3a6b 100%)",
        color: "#fff", padding: "28px 24px 24px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px" }}>
                EL5 MediProcure — Desktop Installer
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                Embu Level 5 Hospital · ProcurBosse · Download the full desktop application
              </div>
            </div>
          </div>

          {/* Latest release quick-pick */}
          {latest && (
            <div style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "14px 18px",
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Star size={14} style={{ color: "#fbbf24" }} />
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{latest.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
                    background: "#16a34a", color: "#fff", letterSpacing: "0.05em",
                  }}>LATEST</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                  Released {new Date(latest.published_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                  &nbsp;·&nbsp;{latest.assets.length} assets
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Quick download buttons for latest */}
                {(["win64", "win32"] as const).map(kind => {
                  const asset = latest.assets.find(a => assetKind(a.name) === kind);
                  if (!asset) return null;
                  const meta = KIND_META[kind];
                  return (
                    <button
                      key={kind}
                      onClick={() => triggerDownload(asset)}
                      disabled={downloading === asset.name}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "9px 16px", borderRadius: 9,
                        background: downloading === asset.name ? "#374151" : "#fff",
                        color: downloading === asset.name ? "#9ca3af" : meta.color,
                        border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        transition: "all 0.2s",
                      }}
                    >
                      <Download size={13} />
                      {downloading === asset.name ? "Starting…" : meta.label}
                      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>
                        {fmtSize(asset.size)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Install Instructions ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "18px 24px 0" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12, marginBottom: 18,
        }}>
          {[
            { step: "1", title: "Choose Version", desc: "Pick the latest stable release, or a specific older version below", icon: Tag },
            { step: "2", title: "Select Platform", desc: "Download Windows 64-bit for most machines, or 32-bit for older PCs", icon: Monitor },
            { step: "3", title: "Extract & Run", desc: "Unzip the .zip file and run the included launch.bat to start the app", icon: Terminal },
          ].map(s => (
            <div key={s.step} style={{
              background: "#fff", borderRadius: 10, padding: "14px 16px",
              border: "1px solid #e2e8f0", display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg,#0a2558,#1a3a6b)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>{s.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Download Progress Panel ──────────────────────────────────────── */}
        {Object.keys(downloadProgress).length > 0 && (
          <div style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: "16px 18px",
            marginBottom: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Loader2 size={16} style={{ color: "#0a2558", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Active Downloads</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.values(downloadProgress).map(progress => (
                <div key={progress.name}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {progress.status === "complete" ? (
                        <Check size={14} style={{ color: "#16a34a" }} />
                      ) : progress.status === "error" ? (
                        <AlertTriangle size={14} style={{ color: "#ef4444" }} />
                      ) : (
                        <Loader2 size={14} style={{ color: "#0a2558", animation: "spin 1s linear infinite" }} />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{progress.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {progress.status === "complete" ? "Complete" : 
                         progress.status === "error" ? progress.error : 
                         `${fmtSize(progress.downloaded)} / ${fmtSize(progress.total)}`}
                      </span>
                      {progress.status === "downloading" && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#0a2558" }}>{progress.progress}%</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    height: 6,
                    background: "#e2e8f0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${progress.progress}%`,
                      background: progress.status === "error" ? "#ef4444" : 
                                  progress.status === "complete" ? "#16a34a" : "#0a2558",
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VC++ Redistributable Banner ──────────────────────────────────── */}
        {installState.vcRedistMissing && (
          <div style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #f59e0b",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#f59e0b",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Wrench size={20} style={{ color: "#fff" }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                Visual Studio C++ Redistributable Required
              </div>
              <div style={{ fontSize: 12, color: "#a16207", marginBottom: 12 }}>
                The desktop app requires Microsoft Visual C++ Redistributable to run properly.
                Click below to install it.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={installVCRedist}
                  disabled={installState.vcRedistInstalling}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8,
                    background: installState.vcRedistInstalling ? "#d97706" : "#f59e0b",
                    color: "#fff", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  {installState.vcRedistInstalling ? (
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Download size={14} />
                  )}
                  {installState.vcRedistInstalling ? "Installing..." : "Install VC++ Redistributable"}
                </button>
                <button
                  onClick={() => setInstallState(prev => ({ ...prev, vcRedistMissing: false }))}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "8px 12px", borderRadius: 8,
                    background: "#fff", color: "#92400e",
                    border: "1px solid #f59e0b", cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                  }}
                >
                  <X size={12} /> Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Platform Detection Banner ─────────────────────────────────────── */}
        <div style={{
          background: PLATFORM_META[platform].bg,
          border: `1px solid ${PLATFORM_META[platform].color}40`,
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: PLATFORM_META[platform].color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Globe size={18} style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  Detected: {PLATFORM_META[platform].label}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {PLATFORM_META[platform].desc}
                </div>
              </div>
            </div>
            
            {/* Quick action buttons based on platform */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {platform === "ios" && (
                <a
                  href="itms-services://?action=download-manifest&url=https://github.com/huiejorjdsksfn/medi-procure-hub/releases/latest/download/manifest.plist"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 14px", borderRadius: 8,
                    background: "#007aff", color: "#fff",
                    textDecoration: "none", fontSize: 11, fontWeight: 700,
                  }}
                >
                  <Download size={12} /> Install iOS App
                </a>
              )}
              
              {platform === "android" && (
                <button
                  onClick={() => {
                    toast({
                      title: "Android App Download",
                      description: "Scroll down to Downloads section and tap the Android APK file to install.",
                    });
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 14px", borderRadius: 8,
                    background: "#3ddc84", color: "#fff",
                    border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <Download size={12} /> Install Android App
                </button>
              )}
              
              {PLATFORM_META[platform].supportsWeb && (
                <a
                  href={WEB_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 14px", borderRadius: 8,
                    background: "#0a2558", color: "#fff",
                    textDecoration: "none", fontSize: 11, fontWeight: 700,
                  }}
                >
                  <Globe size={12} /> Open Web App
                </a>
              )}
              
              {platform === "windows" && (
                <button
                  onClick={installVCRedist}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 14px", borderRadius: 8,
                    background: "#f59e0b", color: "#fff",
                    border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <Wrench size={12} /> Get VC++ Redist
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Install Help ───────────────────────────────────────────── */}
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #16a34a",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Zap size={16} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Quick Install Guide</span>
          </div>
          <div style={{ fontSize: 11, color: "#15803d", lineHeight: 1.7 }}>
            {(platform === "windows" || platform === "other") && (
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Windows:</strong> Download the .zip file, extract it, and run <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>launch.bat</code> or the <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>.exe</code> directly.
              </p>
            )}
            {(platform === "macos" || platform === "linux") && (
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>{PLATFORM_META[platform].label}:</strong> Download the .zip file, extract it, and run the executable.
              </p>
            )}
            {(platform === "ios" || platform === "android") && (
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Mobile:</strong> Use the web app directly or install as a Progressive Web App (PWA) for offline access.
              </p>
            )}
            <p style={{ margin: 0 }}>
              <strong>Web version:</strong> Access at <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>{WEB_APP_URL}</code> or download Web.zip to self-host.
            </p>
          </div>
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Filter:</span>
          {(["all", "stable", "pre"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 14px", borderRadius: 6,
                background: filter === f ? "#0a2558" : "#fff",
                color: filter === f ? "#fff" : "#475569",
                border: `1px solid ${filter === f ? "#0a2558" : "#e2e8f0"}`,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {f === "all" ? "All Releases" : f === "stable" ? "Stable Only" : "Pre-release"}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
              background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer",
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
            padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", marginBottom: 16,
          }}>
            <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>Failed to load releases</div>
              <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 2 }}>{error}</div>
            </div>
            <button onClick={load} style={{ marginLeft: "auto", fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 72, background: "#fff", borderRadius: 10,
                border: "1px solid #e2e8f0",
                animation: "pulse 1.5s ease-in-out infinite",
                opacity: 0.6 + i * 0.1,
              }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:.9}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── Release list ──────────────────────────────────────────────── */}
        {!loading && filtered.map((release, idx) => {
          const isLatest = idx === 0 && filter !== "pre";
          const isOpen = expanded === release.id;
          const groups = groupAssets(release.assets);
          const date = new Date(release.published_at);

          return (
            <div
              key={release.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                border: `1.5px solid ${isLatest ? "#0a2558" : "#e2e8f0"}`,
                marginBottom: 10,
                overflow: "hidden",
                boxShadow: isLatest ? "0 4px 20px rgba(10,37,88,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
                transition: "all 0.2s",
              }}
            >
              {/* Release header row */}
              <div
                onClick={() => setExpanded(isOpen ? null : release.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", cursor: "pointer",
                  background: isLatest && !isOpen ? "linear-gradient(90deg,#f0f7ff,#fff)" : "#fff",
                  userSelect: "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Tag size={13} style={{ color: "#64748b" }} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
                      {release.name || release.tag_name}
                    </span>
                    {isLatest && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 99,
                        background: "#0a2558", color: "#fff", letterSpacing: "0.06em",
                      }}>LATEST</span>
                    )}
                    {release.prerelease && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 99,
                        background: "#fef3c7", color: "#92400e", letterSpacing: "0.06em",
                      }}>PRE-RELEASE</span>
                    )}
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {release.tag_name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} />
                      {date.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <HardDrive size={11} />
                      {release.assets.filter(a => assetKind(a.name) === "win64").map(a => fmtSize(a.size))[0] || "—"} (x64)
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {release.assets.length} files
                    </span>
                  </div>
                </div>

                {/* Quick download — win64 only in header */}
                {groups.win64 && groups.win64[0] && (
                  <button
                    onClick={e => { e.stopPropagation(); triggerDownload(groups.win64[0]); }}
                    disabled={downloading === groups.win64[0].name}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "8px 14px", borderRadius: 8,
                      background: downloading === groups.win64[0].name ? "#f1f5f9" : "#0a2558",
                      color: downloading === groups.win64[0].name ? "#94a3b8" : "#fff",
                      border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}
                  >
                    <Download size={12} />
                    {downloading === groups.win64[0].name ? "Starting…" : "Win x64"}
                  </button>
                )}

                <div style={{ display: "flex", alignItems: "center", color: "#94a3b8", flexShrink: 0 }}>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expanded panel */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "18px 18px 16px" }}>

                  {/* Download grid by kind */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Downloads
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
                      {(["android", "ios", "win64", "win32", "web", "launcher"] as const).map(kind => {
                      {(["android", "ios", "admin", "kiosk", "server", "win64", "win32", "web", "launcher"] as const).map(kind => {
                        const kindAssets = groups[kind];
                        if (!kindAssets?.length) return null;
                        const meta = KIND_META[kind];
                        const Icon = meta.icon;
                        return (
                          <div
                            key={kind}
                            style={{
                              background: meta.bg,
                              border: `1px solid ${meta.color}25`,
                              borderRadius: 10, padding: "12px 14px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <Icon size={16} style={{ color: meta.color }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{meta.label}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>{meta.desc}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {kindAssets.map(asset => (
                                <button
                                  key={asset.id}
                                  onClick={() => triggerDownload(asset)}
                                  disabled={downloading === asset.name}
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "7px 10px", borderRadius: 7,
                                    background: downloading === asset.name ? "#f1f5f9" : "#fff",
                                    border: `1px solid ${meta.color}30`,
                                    cursor: downloading === asset.name ? "wait" : "pointer",
                                    gap: 8,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                    {downloading === asset.name
                                      ? <RefreshCw size={11} style={{ color: meta.color, animation: "spin 1s linear infinite" }} />
                                      : <Download size={11} style={{ color: meta.color }} />
                                    }
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {asset.name}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmtSize(asset.size)}</span>
                                    <CheckCircle2 size={10} style={{ color: "#d1d5db" }} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Checksum + Release notes */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {groups.checksum?.map(a => (
                      <button
                        key={a.id}
                        onClick={() => triggerDownload(a)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                      >
                        <Shield size={11} /> SHA256 checksums
                      </button>
                    ))}
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0",
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={11} /> View on GitHub
                    </a>
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      x64 downloads: {groups.win64?.[0]?.download_count?.toLocaleString() || "—"}
                    </div>
                  </div>

                  {/* Release notes */}
                  {release.body && (
                    <details style={{ marginTop: 14 }}>
                      <summary style={{
                        fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        userSelect: "none", padding: "4px 0",
                      }}>
                        Release Notes
                      </summary>
                      <div style={{
                        marginTop: 8, padding: "12px 14px", background: "#f8fafc",
                        borderRadius: 8, border: "1px solid #e2e8f0",
                        fontSize: 11, color: "#374151", lineHeight: 1.7,
                        maxHeight: 200, overflowY: "auto",
                        whiteSpace: "pre-wrap", fontFamily: "monospace",
                      }}>
                        {release.body}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
          }}>
            <Package size={36} style={{ color: "#cbd5e1", marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>No releases found</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Try changing the filter or check back later</div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .8; } }
      `}</style>
    </div>
  );
}
