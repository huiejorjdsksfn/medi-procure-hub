/**
 * ProcurBosse - Brand Confirmation Overlay
 * Full-screen "Allhands"-style confirmation card: dark low-poly
 * background, centered wordmark, card with blue top accent bar.
 * Used for stamp / approval / other important action confirmations.
 */
import { useEffect, useState } from "react";

type Status = "success" | "error" | "info";

interface BrandConfirmationProps {
  open: boolean;
  title: string;
  message?: string;
  status?: Status;
  backLabel?: string;
  onClose: () => void;
  autoDismissMs?: number | null;
}

const ACCENT: Record<Status, string> = {
  success: "#2f7edd",
  error: "#ef4444",
  info: "#2f7edd",
};

/** Low-poly triangular mesh background, dark charcoal to black. */
function PolyBackground() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="pb-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2e35" />
          <stop offset="45%" stopColor="#1c2026" />
          <stop offset="100%" stopColor="#0a0c0f" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#pb-base)" />
      {[
        ["0,0 260,0 120,180", "#33383f"],
        ["260,0 520,0 340,160 120,180", "#2b2f36"],
        ["520,0 780,0 620,140 340,160", "#383d45"],
        ["780,0 1040,0 900,190 620,140", "#2e333a"],
        ["1040,0 1300,0 1180,150 900,190", "#363b42"],
        ["1300,0 1600,0 1600,220 1180,150", "#262a30"],
        ["120,180 340,160 420,360 200,400", "#20242a"],
        ["340,160 620,140 640,340 420,360", "#2a2e35"],
        ["620,140 900,190 780,380 640,340", "#23272d"],
        ["900,190 1180,150 1120,360 780,380", "#2c3038"],
        ["1180,150 1600,220 1500,420 1120,360", "#1c1f24"],
        ["0,900 0,300 200,400 220,900", "#16181c"],
        ["200,400 420,360 460,700 220,900", "#1a1d22"],
        ["420,360 640,340 700,650 460,700", "#14161a"],
        ["640,340 780,380 800,620 700,650", "#191c21"],
        ["780,380 1120,360 1080,700 800,620", "#121417"],
        ["1120,360 1500,420 1400,750 1080,700", "#0f1114"],
        ["1500,420 1600,900 1400,750", "#0b0d0f"],
        ["220,900 460,700 700,650 800,620 1080,700 1400,750 1600,900", "#000000"],
      ].map(([pts, fill], i) => (
        <polygon key={i} points={pts} fill={fill} opacity={0.9} />
      ))}
    </svg>
  );
}

export default function BrandConfirmation({
  open,
  title,
  message,
  status = "success",
  backLabel = "« Back to Application",
  onClose,
  autoDismissMs = null,
}: BrandConfirmationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setVisible(true), 20);
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    if (autoDismissMs) dismiss = setTimeout(onClose, autoDismissMs);
    return () => { clearTimeout(t); if (dismiss) clearTimeout(dismiss); };
  }, [open, autoDismissMs, onClose]);

  if (!open) return null;
  const accent = ACCENT[status];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <PolyBackground />

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "transform 0.3s ease",
      }}>
        <div style={{
          fontSize: 22, fontWeight: 600, letterSpacing: "0.3em",
          color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
          marginBottom: 28,
        }}>
          ProcurBosse
        </div>

        <div style={{
          width: "min(680px, 90vw)",
          background: "#1c2229",
          borderTop: `3px solid ${accent}`,
          borderRadius: "2px 2px 4px 4px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
          padding: "36px 40px 32px",
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#f5f7fa", lineHeight: 1.3, marginBottom: 14 }}>
            {title}
          </div>
          {message && (
            <div style={{ fontSize: 14.5, color: "#98a2b3", lineHeight: 1.6, marginBottom: 10 }}>
              {message}
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: 14.5, color: accent, fontWeight: 600,
            }}
          >
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
