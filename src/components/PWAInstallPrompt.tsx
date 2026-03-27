/**
 * PWA Install Prompt — shows "Add to Home Screen" banner
 * Appears once, remembers dismissal in localStorage
 */
import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); setShow(false); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem("pwa-dismissed", "1");
    setShow(false);
  };

  if (!show || installed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, width: "min(380px, 95vw)",
      background: "linear-gradient(135deg,#0a2558,#1a3a6b)",
      borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      border: "1px solid #e2e8f0",
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
      animation: "slideUp 0.3s ease",
    }}>
      <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Smartphone style={{ width: 22, height: 22, color: "#fff" }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Install EL5 MediProcure</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Add to home screen for faster access</div>
      </div>
      <button onClick={install} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#fff", color: "#0a2558", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        <Download style={{ width: 13, height: 13 }} />Install
      </button>
      <button onClick={dismiss} style={{ padding: 4, borderRadius: 6, background: "#f1f5f9", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
