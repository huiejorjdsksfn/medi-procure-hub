/**
 * NetworkGuard — wraps the entire app, blocks access when network policy fails
 * Place inside <AuthProvider> so it can read system_settings.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkNetworkAccess, parseNetworkPolicy, NetworkCheckResult } from "@/lib/networkGuard";
import logoImg from "@/assets/logo.png";

function useNetworkPolicy() {
  const [result,    setResult]    = useState<NetworkCheckResult | null>(null);
  const [checking,  setChecking]  = useState(true);
  const [policy,    setPolicy]    = useState({ enabled: false, allowAllPrivate: true, privateCIDRs: [] as string[], publicIPs: [] as string[] });

  const run = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await (supabase as any).from("system_settings").select("key,value")
        .in("key", ["ip_restriction_enabled","allow_all_private","allowed_private_cidrs","allowed_public_ips"]);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { if (r.key) map[r.key] = r.value || ""; });
      const p = parseNetworkPolicy(map);
      setPolicy(p);
      const r = await checkNetworkAccess(p);
      setResult(r);
    } catch {
      setResult({ allowed: true, ip: "error", network: "unknown", reason: "Network check failed — defaulting to allow", checkedAt: new Date().toISOString() });
    }
    setChecking(false);
  }, []);

  useEffect(() => { run(); }, [run]);

  return { result, checking, policy, recheck: run };
}

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { result, checking, policy, recheck } = useNetworkPolicy();

  if (checking || !result) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0a2558", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <img src={logoImg} alt="" style={{ width: 60, height: 60, opacity: 0.8 }} />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>Verifying network access…</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: `bounce 1.2s ${i*0.2}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
      </div>
    );
  }

  if (!result.allowed) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg,#1a0000,#3a0a0a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 520, width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 24px 72px rgba(0,0,0,0.5)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#7f1d1d,#dc2626)", padding: "28px 32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>Network Access Restricted</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "6px 0 0" }}>EL5 MediProcure · Embu Level 5 Hospital</p>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 32px" }}>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#fef2f2", border: "1.5px solid #fca5a5", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Access Denied</div>
              <p style={{ fontSize: 13, color: "#7f1d1d", margin: 0, lineHeight: 1.6 }}>{result.reason}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Your IP Address", value: result.ip },
                { label: "Network Type",    value: result.network },
                { label: "Checked At",      value: new Date(result.checkedAt).toLocaleTimeString("en-KE") },
                { label: "System",          value: "EL5 MediProcure" },
              ].map(r => (
                <div key={r.label} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.06em", marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", fontFamily: "monospace" }}>{r.value}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>How to gain access:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#374151", lineHeight: 2 }}>
                <li>Connect to the <strong>Embu Level 5 Hospital LAN</strong> (Wi-Fi or wired)</li>
                <li>Connect via the <strong>approved hospital VPN</strong></li>
                <li>Contact IT Admin to <strong>whitelist your IP</strong> in Settings → Security</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={recheck}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                🔄 Retry Network Check
              </button>
              <button onClick={() => window.location.reload()}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", cursor: "pointer", fontSize: 13 }}>
                Refresh Page
              </button>
            </div>
          </div>

          <div style={{ padding: "12px 32px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: 10.5, color: "#9ca3af" }}>
            If you believe this is an error, contact your IT administrator · EL5 MediProcure Security Policy
          </div>
        </div>
      </div>
    );
  }

  // Access granted — show subtle banner if on restricted mode
  return (
    <>
      {policy.enabled && (
        <div style={{ position: "fixed", bottom: 8, right: 12, zIndex: 9999, padding: "4px 12px", borderRadius: 20, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", fontSize: 9.5, color: "#065f46", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
          Network verified · {result.ip}
        </div>
      )}
      {children}
    </>
  );
}
