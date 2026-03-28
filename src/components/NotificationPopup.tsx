/**
 * ProcurBosse — Notification Popup v2.0
 * Matches design: white card + logo badge at top + count + action button
 * Uses Embu Level 5 Hospital logo instead of bell icon
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Check, CheckCheck, ExternalLink, Bell } from "lucide-react";
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
  error:"❌", warning:"⚠️", success:"✅", email:"✉️",
  procurement:"📋", grn:"📦", voucher:"💰", tender:"⚖️",
  quality:"🔍", inventory:"📊", system:"⚙️", info:"🔔",
};

// ─── Individual toast-style notification (popup style from image 1) ────────
function NotifToast({ n, onClose }: { n: Notif; onClose: () => void }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 5000);
    return () => clearTimeout(t);
  }, []);

  const typeColor = TYPE_COLOR[n.type] || "#0369a1";

  return (
    <div
      style={{
        position: "fixed", bottom: 80, right: 20, zIndex: 9999,
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
      }}>
      {/* Card matching image 1 design */}
      <div style={{
        width: 300, background: "#fff", borderRadius: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        padding: "24px 20px 20px",
        border: "1px solid #f0f0f0",
        position: "relative",
        textAlign: "center",
      }}>
        {/* Close button */}
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          style={{ position:"absolute", top:12, right:12, background:"#f3f4f6", border:"none", borderRadius:"50%", width:24, height:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <X style={{ width:12, height:12, color:"#6b7280" }} />
        </button>

        {/* Logo badge at top (Image 1 style) */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:16, position:"relative", marginTop:-8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "3px solid #f8f8f8",
            position: "relative",
          }}>
            <img src={logoImg} alt="EL5H" style={{ width:52, height:52, borderRadius:"50%", objectFit:"contain" as const }} />
            {/* Red badge count */}
            <div style={{
              position:"absolute", top:-4, right:-4,
              background:"#ef4444", color:"#fff", borderRadius:"50%",
              width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:900, border:"2px solid #fff",
              boxShadow:"0 2px 6px rgba(239,68,68,0.5)",
            }}>
              <Bell style={{ width:11, height:11 }} />
            </div>
          </div>
        </div>

        {/* Type emoji */}
        <div style={{ fontSize:18, marginBottom:4 }}>{TYPE_EMOJI[n.type]||"🔔"}</div>

        {/* Title */}
        <div style={{ fontSize:15, fontWeight:800, color:"#1a1a2e", marginBottom:4, lineHeight:1.3 }}>
          {n.title}
        </div>

        {/* Message */}
        <div style={{ fontSize:12, color:"#6b7280", marginBottom:16, lineHeight:1.5 }}>
          {n.message?.slice(0, 80)}{n.message?.length > 80 ? "…" : ""}
        </div>

        {/* Open button (Image 1 style — pink/red gradient) */}
        {n.action_url && (
          <button
            onClick={() => { navigate(n.action_url!); onClose(); }}
            style={{
              width: "80%", padding: "10px 0", borderRadius: 50, border: "none",
              background: "linear-gradient(135deg, #e91e8c, #d10069)",
              color: "#fff", fontWeight: 800, fontSize: 14,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(233,30,140,0.35)",
              transition: "transform 0.15s",
            }}
            onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.03)")}
            onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
            Open
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main notification dropdown panel ─────────────────────────────────────
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
    const { data } = await (supabase as any)
      .from("notifications").select("*")
      .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
      .order("created_at", { ascending: false }).limit(40);
    const items = data || [];
    setNotifs(items);
    setLoading(false);

    // Show toast for new unread notifications
    const unread = items.filter((n: Notif) => !n.is_read);
    if (unread.length > prevCount.current && prevCount.current > 0) {
      const newest = unread[0];
      setToasts(t => [...t, newest]);
    }
    prevCount.current = unread.length;
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription
  useEffect(() => {
    const ch = (supabase as any).channel("notif-popup")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications" }, load)
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [load]);

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
      {/* Toast popups */}
      {toasts.map(t => (
        <NotifToast key={t.id} n={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
      ))}

      {/* Dropdown panel */}
      <div ref={ref} style={{
        width: 380, background: "#fff", borderRadius: 18,
        boxShadow: "0 12px 50px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {/* Panel header with logo badge */}
        <div style={{
          background: "linear-gradient(135deg, #1a3a6b, #0a2558)",
          padding: "16px 18px 20px",
          position: "relative",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Logo badge (Image 1 style) */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "#fff", display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}>
                <img src={logoImg} alt="EL5H" style={{ width:38, height:38, borderRadius:"50%", objectFit:"contain" as const }} />
              </div>
              {unread > 0 && (
                <div style={{
                  position:"absolute", top:-4, right:-4,
                  background:"#ef4444", color:"#fff", borderRadius:"50%",
                  width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:900, border:"2px solid #1a3a6b",
                }}>
                  {unread > 9 ? "9+" : unread}
                </div>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>Notifications</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:2 }}>
                {unread > 0 ? `You have ${unread} new notification${unread>1?"s":""}` : "All caught up!"}
              </div>
            </div>
            <button onClick={() => { markAllRead(); onClose?.(); }}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"4px 8px", color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer" }}>
              <CheckCheck style={{ width:12, height:12, display:"inline", marginRight:3 }} />
              Mark all read
            </button>
            {onClose && (
              <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X style={{ width:13, height:13, color:"rgba(255,255,255,0.7)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div style={{ maxHeight: 380, overflowY:"auto" as const }}>
          {loading && (
            <div style={{ padding:30, textAlign:"center" as const, color:"#9ca3af", fontSize:13 }}>Loading…</div>
          )}
          {!loading && notifs.length === 0 && (
            <div style={{ padding:40, textAlign:"center" as const }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔔</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151" }}>No notifications</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>You're all caught up!</div>
            </div>
          )}
          {!loading && notifs.map(n => {
            const tc = TYPE_COLOR[n.type] || "#0369a1";
            const isToday = new Date(n.created_at).toLocaleDateString() === today;
            return (
              <div key={n.id}
                style={{
                  padding:"12px 16px",
                  borderBottom:"1px solid #f3f4f6",
                  background: n.is_read ? "#fff" : "#fafbff",
                  cursor:"pointer",
                  transition:"background 0.15s",
                  display:"flex",
                  gap:12,
                  alignItems:"flex-start",
                }}
                onClick={() => { markRead(n.id); if (n.action_url) navigate(n.action_url); }}
                onMouseEnter={e=>(e.currentTarget.style.background="#f0f4ff")}
                onMouseLeave={e=>(e.currentTarget.style.background=n.is_read?"#fff":"#fafbff")}>
                {/* Type dot */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: tc+"15", display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, fontSize:16, border:`1px solid ${tc}22`,
                }}>
                  {TYPE_EMOJI[n.type]||"🔔"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                    <div style={{ fontSize:12.5, fontWeight: n.is_read ? 500 : 700, color:"#111", lineHeight:1.3, flex:1 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize:10, color:"#9ca3af", whiteSpace:"nowrap" as const, flexShrink:0 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  <div style={{ fontSize:11.5, color:"#6b7280", marginTop:3, lineHeight:1.4 }}>
                    {n.message?.slice(0, 70)}{n.message?.length > 70 ? "…" : ""}
                  </div>
                  {n.action_url && (
                    <div style={{ marginTop:6 }}>
                      <span style={{ fontSize:10, color:tc, fontWeight:700, display:"inline-flex", alignItems:"center", gap:3 }}>
                        <ExternalLink style={{ width:9, height:9 }} /> Open
                      </span>
                    </div>
                  )}
                </div>
                {!n.is_read && (
                  <div style={{ width:7, height:7, borderRadius:"50%", background:tc, flexShrink:0, marginTop:4 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 16px", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#9ca3af" }}>{notifs.length} total · {unread} unread</span>
          <button onClick={() => { navigate("/notifications"); onClose?.(); }}
            style={{ fontSize:11, color:"#0369a1", fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>
            View all →
          </button>
        </div>
      </div>
    </>
  );
}
