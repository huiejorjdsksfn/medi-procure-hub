/**
 * EL5 MediProcure  -- Notifications Centre
 * Redesigned: full-page notification management with bulk actions, filters, realtime
 * ProcurBosse * Embu Level 5 Hospital
 */
import * as XLSX from "xlsx";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Search, RefreshCw, Check, Trash2, Bell, BellOff, Filter } from "lucide-react";

interface Notification {
  id: string; title?: string; message?: string; subject?: string; body?: string;
  category?: string; priority?: "low"|"normal"|"high"|"critical";
  action_url?: string; action_label?: string; icon?: string;
  is_read: boolean; dismissed_at?: string; created_at: string; expires_at?: string;
  metadata?: Record<string, unknown>; type?: string; module?: string; status?: string;
}

const PRIORITY_CFG = {
  low:      { color: "#6b7280", bg: "#6b728015", label: "Low",      emoji: "" },
  normal:   { color: "#3b82f6", bg: "#3b82f615", label: "Normal",   emoji: "" },
  high:     { color: "#f97316", bg: "#f9731615", label: "High",     emoji: "" },
  critical: { color: "#ef4444", bg: "#ef444415", label: "Critical", emoji: "" },
};

const CAT_COLORS: Record<string, string> = {
  system: "#6b7280", procurement: "#3b82f6", finance: "#22c55e",
  erp: "#8b5cf6", budget: "#f97316", invoice: "#f59e0b",
  approval: "#ec4899", alert: "#ef4444", sync: "#06b6d4", general: "#94a3b8",
};

const CAT_ICONS: Record<string, string> = {
  system: "[G]", procurement: "", finance: "", erp: "",
  budget: "", invoice: "", approval: "[OK]", alert: "[!]", sync: "", general: "",
};

function timeAgo(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [readFilter, setReadFilter] = useState<"all"|"unread"|"read">("all");
  const [sortBy, setSortBy] = useState<"newest"|"oldest"|"priority">("newest");
  const [page, setPage] = useState(0);
  const [localToast, setLocalToast] = useState("");
  const PER = 25;

  const showToast = (msg: string) => { setLocalToast(msg); setTimeout(() => setLocalToast(""), 3000); };

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("notifications").select("*")
      .is("dismissed_at", null).order("created_at", { ascending: false }).limit(300);
    if (data) setNotifs(data as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    const ch = supabase.channel("notif_page_v58")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotifs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNotifs]);

  async function markRead(ids: string[]) {
    await supabase.from("notifications").update({ is_read: true } as any).in("id", ids);
    setNotifs(p => p.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    setSelected(new Set()); showToast(`[OK] ${ids.length} marked as read`);
  }

  async function dismiss(ids: string[]) {
    await supabase.from("notifications").update({ dismissed_at: new Date().toISOString() } as any).in("id", ids);
    setNotifs(p => p.filter(n => !ids.includes(n.id)));
    setSelected(new Set()); showToast(` ${ids.length} dismissed`);
  }

  async function markAllRead() {
    const unread = notifs.filter(n => !n.is_read).map(n => n.id);
    if (!unread.length) { showToast("All already read!"); return; }
    await supabase.from("notifications").update({ is_read: true } as any).in("id", unread);
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    showToast(`[OK] All ${unread.length} marked as read`);
  }

  async function createTestNotif() {
    const cats = ["system","procurement","finance","erp","budget","invoice","approval"];
    const prios = ["low","normal","high","critical"] as const;
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const prio = prios[Math.floor(Math.random() * prios.length)];
    await supabase.from("notifications").insert({
      title: `Test: ${cat.charAt(0).toUpperCase() + cat.slice(1)} Notification`,
      message: `This is a system test notification for the ${cat} module. Priority: ${prio}.`,
      category: cat, priority: prio, is_read: false,
      action_url: "/dashboard", action_label: "View Details",
      icon: CAT_ICONS[cat],
    } as any);
    showToast(" Test notification created!"); fetchNotifs();
  }

  const categories = ["all", ...Array.from(new Set(notifs.map(n => n.category || "general")))];

  const filtered = notifs.filter(n => {
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    if (priorityFilter !== "all" && (n.priority || "normal") !== priorityFilter) return false;
    if (categoryFilter !== "all" && (n.category || "general") !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (n.title || n.subject || "").toLowerCase().includes(q) ||
             (n.message || n.body || "").toLowerCase().includes(q) ||
             (n.category || "").toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "priority") {
      const rank = { critical: 4, high: 3, normal: 2, low: 1 };
      return (rank[b.priority || "normal"] || 2) - (rank[a.priority || "normal"] || 2);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const paginated = filtered.slice(page * PER, (page + 1) * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const unreadCount = notifs.filter(n => !n.is_read).length;
  const criticalCount = notifs.filter(n => n.priority === "critical" && !n.is_read).length;

  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const selectAll = () => setSelected(new Set(paginated.map(n => n.id)));
  const clearSelect = () => setSelected(new Set());

  return (
    <div style={{ padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1200, margin: "0 auto" }}>

      {/* Toast */}
      {localToast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
          {localToast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#1e293b,#0f172a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
            
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Notifications Centre</h1>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {notifs.length} total * {unreadCount} unread
              {criticalCount > 0 && <span style={{ marginLeft: 8, color: "#ef4444", fontWeight: 700 }}>* {criticalCount} critical</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={createTestNotif} style={{ padding: "8px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151", fontWeight: 600 }}>
            + Test Notification
          </button>
          <button onClick={markAllRead} style={{ padding: "8px 14px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#059669", fontWeight: 700 }}>
            <Check style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />Mark All Read
          </button>
          <button onClick={fetchNotifs} style={{ padding: "8px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151", fontWeight: 600 }}>
            <RefreshCw style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total",    value: notifs.length,                                         color: "#6b7280", icon: "" },
          { label: "Unread",   value: unreadCount,                                           color: "#3b82f6", icon: "" },
          { label: "Critical", value: criticalCount,                                         color: "#ef4444", icon: "" },
          { label: "High",     value: notifs.filter(n=>n.priority==="high"&&!n.is_read).length, color:"#f97316",icon:""},
          { label: "Read",     value: notifs.filter(n=>n.is_read).length,                   color: "#22c55e", icon: "[OK]" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #f1f5f9", padding: "12px 14px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", borderLeft: `4px solid ${s.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{loading ? "..." : s.value}</div>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "16px 20px", marginBottom: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search notifications..."
              style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Priority filter */}
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(0); }}
            style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151" }}>
            <option value="all">All Priorities</option>
            <option value="critical"> Critical</option>
            <option value="high"> High</option>
            <option value="normal"> Normal</option>
            <option value="low"> Low</option>
          </select>

          {/* Read filter */}
          {(["all","unread","read"] as const).map(f => (
            <button key={f} onClick={() => { setReadFilter(f); setPage(0); }} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: readFilter===f?700:500,
              background: readFilter===f ? "#1e293b" : "#f8fafc",
              color: readFilter===f ? "#fff" : "#6b7280",
              border: readFilter===f ? "1.5px solid #1e293b" : "1.5px solid #e2e8f0",
              cursor: "pointer",
            }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
              {f==="unread"&&unreadCount>0&&<span style={{marginLeft:6,background:"#3b82f6",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:10}}>{unreadCount}</span>}
              {f==="unread"&&criticalCount>0&&<span style={{marginLeft:6,background:"#ef4444",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:10}}>{criticalCount}</span>}
            </button>
          ))}

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151" }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">By Priority</option>
          </select>
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {categories.map(cat => {
              const c = CAT_COLORS[cat] || "#94a3b8";
              return (
                <button key={cat} onClick={() => { setCategoryFilter(cat); setPage(0); }} style={{
                  padding: "3px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                  background: categoryFilter===cat ? `${c}20` : "transparent",
                  color: categoryFilter===cat ? c : "#9ca3af",
                  border: `1px solid ${categoryFilter===cat ? c : "#e2e8f0"}`,
                  fontWeight: categoryFilter===cat ? 700 : 400,
                }}>
                  {cat === "all" ? "All" : `${CAT_ICONS[cat]||""} ${cat.charAt(0).toUpperCase()+cat.slice(1)}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <button onClick={() => markRead([...selected])} style={{ padding: "6px 14px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
             Mark Read
          </button>
          <button onClick={() => dismiss([...selected])} style={{ padding: "6px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
             Dismiss
          </button>
          <button onClick={clearSelect} style={{ padding: "6px 14px", background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={selectAll} style={{ padding: "6px 14px", background: "transparent", color: "#60a5fa", border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Select all {paginated.length}
          </button>
        </div>
      )}

      {/* Notification list */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}></div>
            <div>Loading notifications...</div>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{readFilter === "unread" ? "" : ""}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
              {readFilter === "unread" ? "All caught up!" : "No notifications found"}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {readFilter === "unread" ? "You've read everything." : "Try adjusting your filters."}
            </div>
          </div>
        ) : (
          <>
            {paginated.map((n, idx) => {
              const prio = PRIORITY_CFG[n.priority || "normal"];
              const cat = n.category || "general";
              const icon = n.icon || CAT_ICONS[cat] || "";
              const catColor = CAT_COLORS[cat] || "#94a3b8";
              const title = n.title || n.subject || "";
              const body = n.message || n.body || "";
              const isSelected = selected.has(n.id);
              const isExpired = n.expires_at && new Date(n.expires_at) < new Date();

              return (
                <div key={n.id} style={{
                  display: "flex", gap: 14, padding: "14px 20px",
                  borderBottom: idx < paginated.length - 1 ? "1px solid #f8fafc" : "none",
                  background: isSelected ? "#eff6ff" : n.is_read ? "#fff" : "#fafcff",
                  opacity: isExpired ? 0.5 : 1,
                  transition: "background 0.15s",
                  cursor: "pointer",
                  position: "relative",
                }}
                  onMouseEnter={e => { if(!isSelected) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? "#eff6ff" : n.is_read ? "#fff" : "#fafcff"; }}
                  onClick={() => toggleSelect(n.id)}
                >
                  {/* Critical bar */}
                  {n.priority === "critical" && !n.is_read && (
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#ef4444", borderRadius: "4px 0 0 4px" }} />
                  )}

                  {/* Checkbox */}
                  <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 2, flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); toggleSelect(n.id); }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? "#3b82f6" : "#d1d5db"}`, background: isSelected ? "#3b82f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", cursor: "pointer", flexShrink: 0 }}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5 5 4 7.5 8.5 2.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                  </div>

                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${catColor}18`, border: `1px solid ${catColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, position: "relative" }}>
                    {icon}
                    {!n.is_read && (
                      <div style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: prio.color, border: "2px solid #fff" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        {title && <div style={{ fontWeight: n.is_read ? 500 : 700, color: "#0f172a", fontSize: 13, marginBottom: 2 }}>{title}</div>}
                        {body && <div style={{ color: n.is_read ? "#9ca3af" : "#374151", fontSize: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{body}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        {!n.is_read && (
                          <button onClick={e => { e.stopPropagation(); markRead([n.id]); }} title="Mark read"
                            style={{ padding: "3px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, color: "#059669", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); dismiss([n.id]); }} title="Dismiss"
                          style={{ padding: "3px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#ef4444", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                          
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}33`, fontWeight: 700 }}>
                        {CAT_ICONS[cat]} {cat.toUpperCase()}
                      </span>
                      {n.priority && n.priority !== "normal" && (
                        <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, background: prio.bg, color: prio.color, border: `1px solid ${prio.color}33`, fontWeight: 700 }}>
                          {prio.emoji} {prio.label.toUpperCase()}
                        </span>
                      )}
                      {n.module && <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>{n.module}</span>}
                      <span style={{ color: "#cbd5e1", fontSize: 11, marginLeft: "auto" }}>{timeAgo(n.created_at)}</span>
                    </div>

                    {n.action_url && n.action_label && (
                      <a href={n.action_url} onClick={e => { e.stopPropagation(); markRead([n.id]); }}
                        style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, color: "#3b82f6", fontSize: 11, textDecoration: "none", fontWeight: 600 }}>
                        {n.action_label} &gt;
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {page * PER + 1}-{Math.min((page + 1) * PER, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: page===0?"#f8fafc":"#fff", fontSize: 12, cursor: page===0?"default":"pointer", color: "#374151" }}>
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: page===i?"#1e293b":"#fff", color: page===i?"#fff":"#374151", fontSize: 12, cursor: "pointer", fontWeight: page===i?700:400 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: page>=totalPages-1?"#f8fafc":"#fff", fontSize: 12, cursor: page>=totalPages-1?"default":"pointer", color: "#374151" }}>
                Next Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#cbd5e1" }}>
        EL5 MediProcure * ProcurBosse * Embu Level 5 Hospital * Notifications realtime-synced via Supabase
      </div>
    </div>
  );
}
