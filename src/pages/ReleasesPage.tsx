/**
 * ReleasesPage — EL5 MediProcure
 * Browse GitHub releases and download Windows desktop installers,
 * Web bundles, or launcher scripts for any version.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Download, RefreshCw, Monitor, Globe, Terminal,
  CheckCircle2, ChevronDown, ChevronUp, Tag, Calendar,
  HardDrive, Package, Star, AlertCircle, ExternalLink,
  ArrowLeft, Shield, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtSize = (bytes: number) => {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

const assetKind = (name: string): "win64" | "win32" | "web" | "launcher" | "checksum" | "other" => {
  if (name.includes("win-x64")) return "win64";
  if (name.includes("win-ia32")) return "win32";
  if (name.includes("Web.zip") || name.includes("-Web.")) return "web";
  if (name.endsWith(".bat") || name.endsWith(".cmd") || name.endsWith(".sh")) return "launcher";
  if (name.includes("SHA256") || name.endsWith(".txt")) return "checksum";
  return "other";
};

const KIND_META = {
  win64:    { label: "Windows 64-bit",  icon: Monitor,   color: "#0078d4", bg: "#eff6ff", desc: "Recommended for modern PCs (most common)" },
  win32:    { label: "Windows 32-bit",  icon: Cpu,       color: "#6b7280", bg: "#f9fafb", desc: "For older 32-bit Windows systems" },
  web:      { label: "Web Bundle",      icon: Globe,     color: "#059669", bg: "#f0fdf4", desc: "Self-contained web app — run with any web server" },
  launcher: { label: "Launcher Script", icon: Terminal,  color: "#7c3aed", bg: "#faf5ff", desc: "Quick-start .bat / .cmd scripts" },
  checksum: { label: "Checksum",        icon: Shield,    color: "#94a3b8", bg: "#f8fafc", desc: "SHA-256 hash verification file" },
  other:    { label: "Other",           icon: Package,   color: "#64748b", bg: "#f8fafc", desc: "" },
};

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

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("github-releases");
      if (fnErr) throw new Error(fnErr.message);
      setReleases(Array.isArray(data) ? data : []);
      // auto-expand latest
      if (Array.isArray(data) && data.length > 0) setExpanded(data[0].id);
    } catch (e: any) {
      setError(e.message || "Failed to load releases");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const triggerDownload = (asset: GHAsset) => {
    setDownloading(asset.name);
    toast({
      title: `Downloading ${asset.name}`,
      description: `${fmtSize(asset.size)} — your download will start shortly`,
    });
    const a = document.createElement("a");
    a.href = asset.browser_download_url;
    a.download = asset.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(null), 3000);
  };

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
                      {(["win64", "win32", "web", "launcher"] as const).map(kind => {
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
