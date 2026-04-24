/**
 * ProcurBosse - Notification Popup v3.0
 * Toast: exact match to image 1 - centered card, logo badge, pink Open button
 * Dropdown: dark navy header, scrollable list, mark-all-read
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, CheckCheck, ExternalLink } from "lucide-react";
import logoImg from "@/assets/logo.png";

type NType = "info"|"success"|"warning"|"error"|"email"|"procurement"|"voucher"|"grn"|"tender"|"quality"|"inventory"|"system";

interface Notif {
  id: string;
  title: string;
  message: string;
  type: NType;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  module?: string;
}

function timeAgo(date: string) {
  const d = (Date.now() - new Date(date).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-KE", { day:"2-digit", month:"short" });
}

const TYPE_COLOR: Record<string, string> = {
  error:"#ef4444", warning:"#f59e0b", success:"#22c55e",
  email:"#8b5cf6", procurement:"#0369a1", grn:"#059669",
  voucher:"#C45911", tender:"#1d4ed8", quality:"#0891b2",
  inventory:"#7c3aed", system:"#374151", info:"#0369a1",
};

const TYPE_EMOJI: Record<string, string> = {
  error:"-", warning:"-", success:"-", email:"-",
  procurement:"-", grn:"-", voucher:"-", tender:"-",
  quality:"-", inventory:"-", system:"-", info:"-",
};

// - Toast popup - exact match to image 1 -
function NotifToast({ n, unreadCount, onClose }: { n: Notif; unreadCount: number; onClose: () => void }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for enter animation
    const enter = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss after 5 seconds
    const dismiss = setTimeout(() => { setVisible(false); setTimeout(onClose, 350); }, 5500);
    return () => { clearTimeout(enter); clearTimeout(dismiss); };
  }, []);

  const close = () => { setVisible(false); setTimeout(onClose, 350); };

  return (
    <div style={{
      position: "fixed",
      bottom: 90,
      right: 24,
      zIndex: 99999,
      transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.88)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      {/* - Outer pink/salmon background like image 1 - */}
      <div style={{
        width: 320,
        background: "linear-gradient(145deg, #ffd6d6, #ffb8c6)",
        borderRadius: 28,
        padding: "12px 12px 18px",
        boxShadow: "0 20px 60px rgba(200,50,100,0.25), 0 4px 16px rgba(0,0,0,0.1)",
        position: "relative",
      }}>
        {/* Close button */}
        <button onClick={close} style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(255,255,255,0.6)", border: "none", borderRadius: "50%",
          width: 26, height: 26, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <X style={{ width: 12, height: 12, color: "#666" }} />
        </button>

        {/* - White card (inner) - */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: "40px 24px 20px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          position: "relative",
          marginTop: 36,
        }}>
          {/* Logo badge - overlaps top of white card like image 1 */}
          <div style={{
            position: "absolute",
            top: -38,
            left: "50%",
            transform: "translateX(-50%)",
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "4px solid #fff",
              position: "relative",
            }}>
              <img src={logoImg} alt="EL5H" style={{
                width: 54, height: 54, borderRadius: "50%",
                objectFit: "contain",
              }} />
              {/* Red count badge - top-right of logo */}
              <div style={{
                position: "absolute", top: -4, right: -4,
                background: "#ef4444", color: "#fff", borderRadius: "50%",
                width: 24, height: 24,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900,
                border: "2.5px solid #fff",
                boxShadow: "0 2px 8px rgba(239,68,68,0.55)",
                lineHeight: 1,
              }}>
                {unreadCount > 9 ? "9+" : unreadCount || 1}
              </div>
            </div>
          </div>

          {/* Type emoji */}
          <div style={{ fontSize: 18, marginBottom: 6 }}>{TYPE_EMOJI[n.type] || "-"}</div>

          {/* Title - bold, dark */}
          <div style={{
            fontSize: 17, fontWeight: 800, color: "#1a1a2e",
            marginBottom: 6, lineHeight: 1.3,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}>
            {n.title}
          </div>

          {/* Subtitle - "You have X new notification(s)" */}
          <div style={{
            fontSize: 12.5, color: "#6b7280",
            marginBottom: 18, lineHeight: 1.5,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}>
            {n.message?.slice(0, 80)}{n.message?.length > 80 ? "-" : ""}
          </div>

          {/* Open button - pink/crimson gradient like image 1 */}
          <button
            onClick={() => { if (n.action_url) navigate(n.action_url); close(); }}
            style={{
              width: "82%",
              padding: "11px 0",
              borderRadius: 50,
              border: "none",
              background: "linear-gradient(135deg, #e91e8c, #c0005e)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(193,0,94,0.38)",
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              letterSpacing: "0.01em",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(193,0,94,0.5)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(193,0,94,0.38)";
            }}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}

// - Main notification dropdown panel -
export default function NotificationPopup({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Notif[]>([]);
  const prevCount = useRef(0);

  const load = useCallback(async () => {
    if (!user) return;
    // Try user_id first (new schema), fall back to recipient_id (legacy)
    const { data } = await (supabase as any)
      .from("notifications").select("*")
      .or(`user_id.eq.${user.id},recipient_id.eq.${user.id},user_id.is.null,recipient_id.is.null`)
      .order("created_at", { ascending: false }).limit(40);
    const items = (data || []).filter((n:any,i:number,arr:any[]) =>
      arr.findIndex(x=>x.id===n.id)===i  // deduplicate
    );
    setNotifs(items);
    setLoading(false);

    const unread = items.filter((n: Notif) => !n.is_read);
    if (unread.length > prevCount.current && prevCount.current > 0) {
      setToasts(t => [...t, unread[0]]);
    }
    prevCount.current = unread.length;
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription - debounced to avoid rapid re-fetches
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedLoad = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(load, 400);
    };
    const ch = (supabase as any).channel("notif-popup-v4")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}` }, debouncedLoad)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}` }, debouncedLoad)
      .subscribe();
    return () => { clearTimeout(debounceTimer); (supabase as any).removeChannel(ch); };
  }, [load, user]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  async function markRead(id: string) {
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    if (!user) return;
    await (supabase as any).from("notifications").update({ is_read: true })
      .or(`recipient_id.eq.${user.id},recipient_id.is.null`).eq("is_read", false);
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
  }

  const unread = notifs.filter(n => !n.is_read).length;
  const today = new Date().toLocaleDateString();

  return (
    <>
      {/* Toast popups - stacked with offset */}
      {toasts.map((t, idx) => (
        <NotifToast
          key={t.id}
          n={t}
          unreadCount={unread}
          onClose={() => setToasts(p => p.filter(x => x.id !== t.id))}
        />
      ))}

      {/* - Dropdown panel - */}
      <div ref={ref} style={{
        width: 390,
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 16px 60px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* - Header - dark navy like image 2 - */}
        <div style={{
          background: "linear-gradient(135deg, #0a2558, #1a3a6b)",
          padding: "18px 20px 22px",
          position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Logo badge */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
              }}>
                <img src={logoImg} alt="EL5H" style={{
                  width: 40, height: 40, borderRadius: "50%",
                  objectFit: "contain",
                }} />
              </div>
              {unread > 0 && (
                <div style={{
                  position: "absolute", top: -5, right: -5,
                  background: "#ef4444", color: "#fff", borderRadius: "50%",
                  width: 22, height: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900,
                  border: "2.5px solid #0a2558",
                  boxShadow: "0 2px 6px rgba(239,68,68,0.6)",
                }}>
                  {unread > 9 ? "9+" : unread}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Notifications</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>
                {unread > 0
                  ? `You have ${unread} new notification${unread > 1 ? "s" : ""}`
                  : "You're all caught up!"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => { markAllRead(); }}
                title="Mark all read"
                style={{
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8, padding: "5px 10px", color: "#fff",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <CheckCheck style={{ width: 12, height: 12 }} /> All read
              </button>
              {onClose && (
                <button onClick={onClose} style={{
                  background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
                  width: 30, height: 30, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <X style={{ width: 14, height: 14, color: "rgba(255,255,255,0.75)" }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* - Notification list - */}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Loading-
            </div>
          )}
          {!loading && notifs.length === 0 && (
            <div style={{ padding: 44, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>-</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>No notifications</div>
              <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 4 }}>You're all caught up!</div>
            </div>
          )}
          {!loading && notifs.map(n => {
            const tc = TYPE_COLOR[n.type] || "#0369a1";
            const isToday = new Date(n.created_at).toLocaleDateString() === today;
            return (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); if (n.action_url) navigate(n.action_url); }}
                style={{
                  padding: "13px 18px",
                  borderBottom: "1px solid #f3f4f6",
                  background: n.is_read ? "#fff" : "#f8fbff",
                  cursor: "pointer",
                  transition: "background 0.12s",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#eef4ff")}
                onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? "#fff" : "#f8fbff")}
              >
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: tc + "18",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 16,
                  border: `1px solid ${tc}25`,
                }}>
                  {TYPE_EMOJI[n.type] || "-"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: n.is_read ? 500 : 700,
                      color: "#111", lineHeight: 1.3, flex: 1,
                    }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3, lineHeight: 1.45 }}>
                    {n.message?.slice(0, 70)}{n.message?.length > 70 ? "-" : ""}
                  </div>
                  {n.action_url && (
                    <div style={{ marginTop: 5 }}>
                      <span style={{ fontSize: 10, color: tc, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <ExternalLink style={{ width: 9, height: 9 }} /> Open
                      </span>
                    </div>
                  )}
                </div>

                {!n.is_read && (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: tc, flexShrink: 0, marginTop: 5 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* - Footer - */}
        <div style={{
          padding: "10px 18px",
          borderTop: "1px solid #f3f4f6",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#fafafa",
        }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {notifs.length} total - {unread} unread
          </span>
          <button
            onClick={() => { navigate("/notifications"); onClose?.(); }}
            style={{
              fontSize: 11.5, color: "#0369a1", fontWeight: 700,
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            View all -
          </button>
        </div>
      </div>
    </>
  );
}



