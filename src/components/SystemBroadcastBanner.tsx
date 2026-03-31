/**
 * System Broadcast Banner — shown at top of app when admin sends live message
 * Auto-dismisses, shows countdown, links to action URL
 */
import { useState, useEffect, useRef } from "react";
import { subscribeToBroadcasts, BroadcastPayload } from "@/lib/broadcast";
import { X, AlertTriangle, CheckCircle, Info, Zap, Megaphone, Wrench } from "lucide-react";

const TYPE_CFG: Record<string, { bg: string; color: string; border: string; icon: any; label: string }> = {
  info:         { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd", icon: Info,          label: "Notice" },
  success:      { bg: "#dcfce7", color: "#15803d", border: "#86efac", icon: CheckCircle,   label: "Update" },
  warning:      { bg: "#fef3c7", color: "#92400e", border: "#fde68a", icon: AlertTriangle, label: "Warning" },
  error:        { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", icon: AlertTriangle, label: "Alert" },
  maintenance:  { bg: "#f3e8ff", color: "#6d28d9", border: "#c4b5fd", icon: Wrench,        label: "Maintenance" },
  announcement: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", icon: Megaphone,     label: "Announcement" },
};

interface ActiveBroadcast extends BroadcastPayload { timestamp: string; remaining: number; id: string; }

export default function SystemBroadcastBanner() {
  const [banners, setBanners] = useState<ActiveBroadcast[]>([]);
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const unsub = subscribeToBroadcasts((payload) => {
      const id = `${payload.timestamp}-${Math.random()}`;
      const expires = payload.expiresIn ?? 30;
      const banner: ActiveBroadcast = { ...payload, remaining: expires, id };
      setBanners(prev => [banner, ...prev.slice(0, 2)]); // max 3 banners

      // Countdown
      let rem = expires;
      const iv = setInterval(() => {
        rem -= 1;
        setBanners(prev => prev.map(b => b.id === id ? { ...b, remaining: rem } : b));
        if (rem <= 0) { clearInterval(iv); dismiss(id); }
      }, 1000);
      timers.current.set(id, iv);
    });
    return unsub;
  }, []);

  const dismiss = (id: string) => {
    if (timers.current.has(id)) {
      clearInterval(timers.current.get(id)); timers.current.delete(id);
    }
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  if (banners.length === 0) return null;

  return (
    <div style={{ position: "fixed", top: 52, left: 0, right: 0, zIndex: 500, display: "flex", flexDirection: "column", gap: 3, pointerEvents: "none" }}>
      {banners.map(b => {
        const cfg = TYPE_CFG[b.type] || TYPE_CFG.info;
        const pct = Math.max(0, (b.remaining / (b.expiresIn ?? 30)) * 100);
        return (
          <div key={b.id} className="broadcast-banner"
            style={{ background: cfg.bg, borderBottom: `3px solid ${cfg.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, pointerEvents: "all", position: "relative", overflow: "hidden" }}>
            {/* Progress bar */}
            <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: cfg.color, width: `${pct}%`, transition: "width 1s linear", opacity: 0.4 }} />
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <cfg.icon style={{ width: 15, height: 15, color: "#fff" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{b.title}</div>
              <div style={{ fontSize: 12, color: cfg.color, opacity: 0.8, marginTop: 1 }}>{b.message}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {b.actionUrl && (
                <a href={b.actionUrl} style={{ fontSize: 11, fontWeight: 800, color: cfg.color, textDecoration: "none", padding: "4px 10px", border: `1px solid ${cfg.color}`, borderRadius: 5 }}>
                  View →
                </a>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, opacity: 0.6, minWidth: 24, textAlign: "center" }}>{b.remaining}s</span>
              <button onClick={() => dismiss(b.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, lineHeight: 0, color: cfg.color, opacity: 0.6 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
