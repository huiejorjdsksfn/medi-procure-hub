import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title?: string;
  message: string;
  category?: string;
  priority?: "low" | "normal" | "high" | "critical";
  action_url?: string;
  action_label?: string;
  icon?: string;
  is_read: boolean;
  dismissed_at?: string;
  created_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

const CATEGORY_COLORS: Record<string, string> = {
  system: "#6b7280",
  procurement: "#3b82f6",
  finance: "#22c55e",
  erp: "#8b5cf6",
  budget: "#f97316",
  invoice: "#f59e0b",
  approval: "#ec4899",
  alert: "#ef4444",
  sync: "#06b6d4",
};

const PRIORITY_CONFIG = {
  low:      { color: "#6b7280", label: "Low",      dot: "#6b7280" },
  normal:   { color: "#3b82f6", label: "Normal",   dot: "#3b82f6" },
  high:     { color: "#f97316", label: "High",     dot: "#f97316" },
  critical: { color: "#ef4444", label: "Critical", dot: "#ef4444" },
};

const DEFAULT_ICONS: Record<string, string> = {
  system: "[G]", procurement: "", finance: "", erp: "",
  budget: "", invoice: "", approval: "[OK]", alert: "[!]", sync: "",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all"|"unread"|"critical">("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(60);
    if (data) {
      setNotifications(data as Notification[]);
      const unread = data.filter(n => !n.is_read).length;
      if (unread > prevCount.current) {
        setAnimateBell(true);
        setTimeout(() => setAnimateBell(false), 1500);
      }
      prevCount.current = unread;
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("notifications_bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchNotifications())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.priority === "critical" && !n.is_read).length;

  const filtered = notifications.filter(n => {
    if (filter === "unread" && n.is_read) return false;
    if (filter === "critical" && n.priority !== "critical") return false;
    if (activeCategory !== "all" && n.category !== activeCategory) return false;
    return true;
  });

  const categories = ["all", ...Array.from(new Set(notifications.map(n => n.category || "system")))];

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    fetchNotifications();
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function dismiss(id: string) {
    await supabase.from("notifications").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || "#6b7280";

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        style={{
          position: "relative",
          width: 40, height: 40,
          background: open ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
          border: open ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
          animation: animateBell ? "bellShake 0.5s ease" : undefined,
        }}
        title="Notifications"
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke={unreadCount > 0 ? "#60a5fa" : "rgba(255,255,255,0.6)"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          {unreadCount > 0 && (
            <circle cx="18" cy="5" r="3" fill="#ef4444" stroke="none"/>
          )}
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <div style={{
            position: "absolute",
            top: -4, right: -4,
            minWidth: 18, height: 18,
            background: criticalCount > 0 ? "#ef4444" : "#3b82f6",
            borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "10px", fontWeight: 700, color: "#fff",
            border: "2px solid #0f1729",
            padding: "0 4px",
            animation: criticalCount > 0 ? "pulseBadge 1.5s infinite" : undefined,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          right: 0,
          width: 400,
          maxHeight: 600,
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          zIndex: 9000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideDown 0.15s ease",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: "15px" }}>Notifications</div>
                {unreadCount > 0 && (
                  <div style={{
                    background: "#3b82f6", color: "#fff",
                    padding: "1px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600,
                  }}>{unreadCount} new</div>
                )}
                {criticalCount > 0 && (
                  <div style={{
                    background: "#ef4444", color: "#fff",
                    padding: "1px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600,
                    animation: "pulseBadge 1.5s infinite",
                  }}>{criticalCount} critical</div>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  background: "transparent", border: "none", color: "#60a5fa",
                  fontSize: "12px", cursor: "pointer", fontWeight: 500,
                }}>
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["all","unread","critical"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 10px",
                  background: filter === f ? "rgba(59,130,246,0.2)" : "transparent",
                  border: filter === f ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6, color: filter === f ? "#60a5fa" : "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: "12px",
                }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === "critical" && criticalCount > 0 && (
                    <span style={{ marginLeft: 4, background: "#ef4444", color: "#fff", borderRadius: 6, padding: "0 4px", fontSize: "10px" }}>{criticalCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 1 && (
            <div style={{
              display: "flex", gap: 6, padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              overflowX: "auto",
            }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: "3px 10px",
                  background: activeCategory === cat ? `${catColor(cat)}22` : "transparent",
                  border: `1px solid ${activeCategory === cat ? catColor(cat) : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20,
                  color: activeCategory === cat ? catColor(cat) : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "11px", whiteSpace: "nowrap",
                  fontWeight: activeCategory === cat ? 600 : 400,
                }}>
                  {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Notification list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.3)" }}>
                Loading...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "36px", marginBottom: 12 }}></div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                  {filter === "unread" ? "All caught up!" : "No notifications"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", marginTop: 4 }}>
                  {filter === "unread" ? "You've read everything." : "Notifications will appear here."}
                </div>
              </div>
            )}
            {!loading && filtered.map((n, i) => {
              const prio = PRIORITY_CONFIG[n.priority || "normal"];
              const cat = n.category || "system";
              const icon = n.icon || DEFAULT_ICONS[cat] || "";
              const isExpired = n.expires_at && new Date(n.expires_at) < new Date();

              return (
                <div
                  key={n.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: n.is_read ? "transparent" : "rgba(59,130,246,0.04)",
                    opacity: isExpired ? 0.5 : 1,
                    transition: "background 0.2s",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? "transparent" : "rgba(59,130,246,0.04)")}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  {/* Critical pulse bar */}
                  {n.priority === "critical" && !n.is_read && (
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: 3, background: "#ef4444", borderRadius: "3px 0 0 3px",
                    }}/>
                  )}

                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Icon with category color ring */}
                    <div style={{
                      width: 38, height: 38, borderRadius: "10px", flexShrink: 0,
                      background: `${catColor(cat)}18`,
                      border: `1px solid ${catColor(cat)}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px", position: "relative",
                    }}>
                      {icon}
                      {!n.is_read && (
                        <div style={{
                          position: "absolute", top: -3, right: -3,
                          width: 10, height: 10, borderRadius: "50%",
                          background: prio.dot,
                          border: "2px solid #111827",
                        }}/>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          {n.title && (
                            <div style={{ fontWeight: n.is_read ? 500 : 700, color: "#fff", fontSize: "13px", marginBottom: 2 }}>
                              {n.title}
                            </div>
                          )}
                          <div style={{
                            color: n.is_read ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)",
                            fontSize: "12px", lineHeight: 1.5,
                          }}>
                            {n.message}
                          </div>
                        </div>

                        {/* Dismiss button */}
                        <button
                          onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                          style={{
                            background: "transparent", border: "none",
                            color: "rgba(255,255,255,0.2)", cursor: "pointer",
                            padding: "2px 6px", fontSize: "16px", lineHeight: 1,
                            flexShrink: 0,
                          }}
                        ></button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        {/* Category badge */}
                        <span style={{
                          padding: "1px 7px", borderRadius: 10, fontSize: "10px",
                          background: `${catColor(cat)}22`, color: catColor(cat),
                          border: `1px solid ${catColor(cat)}44`, fontWeight: 600,
                        }}>
                          {cat.toUpperCase()}
                        </span>

                        {/* Priority badge */}
                        {n.priority && n.priority !== "normal" && (
                          <span style={{
                            padding: "1px 7px", borderRadius: 10, fontSize: "10px",
                            background: `${prio.color}22`, color: prio.color,
                            border: `1px solid ${prio.color}44`, fontWeight: 600,
                          }}>
                            {prio.label.toUpperCase()}
                          </span>
                        )}

                        {/* Time */}
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", marginLeft: "auto" }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      {/* Action button */}
                      {n.action_url && n.action_label && (
                        <a
                          href={n.action_url}
                          onClick={e => { e.stopPropagation(); markRead(n.id); setOpen(false); }}
                          style={{
                            display: "inline-block", marginTop: 8,
                            padding: "4px 12px",
                            background: "rgba(59,130,246,0.15)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            borderRadius: 6, color: "#60a5fa",
                            fontSize: "11px", textDecoration: "none", fontWeight: 600,
                          }}
                        >
                          {n.action_label}</a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 20px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <a href="/notifications" onClick={() => setOpen(false)} style={{
              color: "#60a5fa", fontSize: "13px", textDecoration: "none", fontWeight: 500,
            }}>
              View all notifications  Next
            </a>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
              {notifications.length} total
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bellShake {
          0%,100% { transform: rotate(0); }
          15% { transform: rotate(10deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(6deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes pulseBadge {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
