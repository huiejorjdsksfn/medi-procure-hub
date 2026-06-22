/**
 * PWAInstallPrompt — EL5 MediProcure
 * Shows bottom banner offering:
 *   • PWA "Add to home screen" (web)
 *   • "Get Desktop App" → links to /releases page for .exe / .app downloads
 */
import { useState, useEffect } from "react";
import { Download, X, Monitor, Smartphone, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PWAInstallPrompt() {
  const navigate = useNavigate();
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"choice" | "pwa" | "desktop">("choice");

  useEffect(() => {
    if (localStorage.getItem("install-banner-dismissed")) return;
    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Listen for PWA install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show after 3 seconds
    const t = setTimeout(() => setShow(true), 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem("install-banner-dismissed", "1");
    setShow(false);
  };

  const installPWA = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    else setShow(false);
  };

  const openReleases = () => {
    dismiss();
    navigate("/releases");
  };

  if (!show) return null;

  return (
    <>
      <div style={{
        position: "fixed", bottom: 20, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(420px, 95vw)",
        background: "linear-gradient(135deg,#0a1628 0%,#0d2146 60%,#1a3a6b 100%)",
        borderRadius: 16,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateX(-50%) translateY(30px); opacity: 0; }
            to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
          }
        `}</style>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "0 2px 8px rgba(14,165,233,0.4)",
          }}>
            <Monitor size={21} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
              Install EL5 MediProcure
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>
              Get the full desktop app for Windows
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              padding: 6, borderRadius: 6, background: "rgba(255,255,255,0.08)",
              border: "none", cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)",
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Choice buttons */}
        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Desktop App button — primary */}
          <button
            onClick={openReleases}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 10,
              background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
              border: "none", cursor: "pointer", textAlign: "left",
              boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
              transition: "opacity 0.15s",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Download size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                Download Desktop App (.exe)
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
                Windows 64-bit · 32-bit · Choose version
              </div>
            </div>
            <ChevronRight size={15} color="rgba(255,255,255,0.6)" />
          </button>

          {/* PWA / Add to home screen — secondary (only if prompt available) */}
          {pwaPrompt && (
            <button
              onClick={installPWA}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Smartphone size={15} color="rgba(255,255,255,0.7)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                  Add to Home Screen
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
                  PWA — quick access, works offline
                </div>
              </div>
              <ChevronRight size={14} color="rgba(255,255,255,0.35)" />
            </button>
          )}

          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            textAlign: "center", marginTop: 2,
          }}>
            All versions available · Embu Level 5 Hospital
          </div>
        </div>
      </div>
    </>
  );
}
