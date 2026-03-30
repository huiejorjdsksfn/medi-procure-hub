import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  subject?: string;
  body?: string;
  title?: string;
  message?: string;
  category?: string;
  priority?: "low" | "normal" | "high" | "critical";
  action_url?: string;
  action_label?: string;
  icon?: string;
  is_read: boolean;
  dismissed_at?: string;
  created_at: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  type?: string;
  module?: string;
  status?: string;
}

const PRIORITY_CONFIG = {
  low:      { color: "#6b7280", bg: "#6b728018", label: "Low",      emoji: "🔵" },
  normal:   { color: "#3b82f6", bg: "#3b82f618", label: "Normal",   emoji: "📘" },
  high:     { color: "#f97316", bg: "#f9731618", label: "High",     emoji: "🟠" },
  critical: { color: "#ef4444", bg: "#ef444418", label: "Critical", emoji: "🔴" },
};

const CATEGORY_COLORS: Record<string, string> = {
  system: "#6b7280", procurement: "#3b82f6", finance: "#22c55e",
  erp: "#8b5cf6", budget: "#f97316", invoice: "#f59e0b",
  approval: "#ec4899", alert: "#ef4444", sync: "#06b6d4",
  general: "#94a3b8",
};

const CAT_ICONS: Record<string, string> = {
  system: "⚙️", procurement: "📦", finance: "💰", erp: "🔄",
  budget: "📊", invoice: "📋", approval: "✅", alert: "⚠️",
  sync: "🔁", general: "🔔",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">("newest");
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("notifications_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotifications)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNotifications]);

  const categories = ["all", ...Array.from(new Set(notifications.map(n => n.category || n.module || "general")))];
  const priorities = ["all", "critical", "high", "normal", "low"];

  const filtered = notifications.filter(n => {
    const cat = n.category || n.module || "general";
    const prio = n.priority || "normal";
    const text = ((n.title || n.subject || "") + " " + (n.message || n.body || "")).toLowerCase();

    if (priorityFilter !== "all" && prio !== priorityFilter) return false;
    if (categoryFilter !== "all" && cat !== categoryFilter) return false;
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    if (search && !text.includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "priority") {
      const order = { critical: 0, high: 1, normal: 2, low: 3 };
      return (order[a.priority || "normal"] ?? 2) - (order[b.priority || "normal"] ?? 2);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.priority === "critical" && !n.is_read).length;

  async function markRead(ids: string[]) {
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    fetchNotifications();
    setSelected(new Set());
  }

  async function dismissMany(ids: string[]) {
    await supabase.from("notifications").update({ dismissed_at: new Date().toISOString() }).in("id", ids);
    fetchNotifications();
    setSelected(new Set());
    showToast(`${ids.length} notification${ids.length > 1 ? "s" : ""} dismissed`);
  }

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    fetchNotifications();
    showToast("All notifications marked as read ✓");
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(n => n.id)));
  }

  function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-KE", { dateStyle: "medium" });
  }

  const bg = "#0f1729";
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
  };
  const inputS: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "13px",
    outline: "none",
    padding: "8px 12px",
  };
  const btnS = (active: boolean, color = "#3b82f6"): React.CSSProperties => ({
    padding: "6px 14px",
    background: active ? `${color}22` : "transparent",
    border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
    borderRadius: "8px",
    color: active ? color : "rgba(255,255,255,0.5)",
    cursor: "pointer" as const,
    fontSize: "12px",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s",
  });

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || "#94a3b8";

  return (
    <div style={{ minHeight: "100%", background: bg, color: "#e2e8f0", fontFamily: "'Segoe UI',system-ui,sans-serif", padding: "28px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed" as const, top: 80, right: 24, zIndex: 9999,
          background: "#1e3a5f", border: "1px solid #3b82f6", borderRadius: "10px",
          padding: "12px 20px", color: "#fff", fontSize: "14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex" as const, alignItems: "center" as const, gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "12px",
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, fontSize: "22px",
          }}>🔔</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Notifications</h1>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px" }}>
              {unreadCount > 0 ? (
                <span>
                  <span style={{ color: "#60a5fa", fontWeight: 600 }}>{unreadCount} unread</span>
                  {criticalCount > 0 && <span style={{ color: "#ef4444", fontWeight: 600 }}> · {criticalCount} critical</span>}
                  {" "}· {notifications.length} total
                </span>
              ) : `All caught up · ${notifications.length} notifications`}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex" as const, gap: 8 }}>
            {unreadCount > 0 && (
              <button
                style={{ padding: "8px 16px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "8px", color: "#60a5fa", cursor: "pointer" as const, fontSize: "13px", fontWeight: 500 }}
                onClick={markAllRead}
              >✓ Mark All Read</button>
            )}
            <button
              style={{ padding: "8px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", cursor: "pointer" as const, fontSize: "13px" }}
              onClick={fetchNotifications}
            >↻ Refresh</button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid" as const, gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total", value: notifications.length, color: "#94a3b8" },
          { label: "Unread", value: unreadCount, color: "#3b82f6" },
          { label: "Critical", value: criticalCount, color: "#ef4444" },
          { label: "High", value: notifications.filter(n => n.priority === "high").length, color: "#f97316" },
        ].map((s, i) => (
          <div key={i} style={{
            ...card,
            padding: "14px 18px",
            borderLeft: `3px solid ${s.color}`,
            cursor: "pointer" as const,
          }} onClick={() => {
            if (i === 1) setReadFilter("unread");
            if (i === 2) { setPriorityFilter("critical"); setReadFilter("unread"); }
            if (i === 3) { setPriorityFilter("high"); }
          }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex" as const, gap: 12, flexWrap: "wrap", alignItems: "center" as const }}>
          {/* Search */}
          <div style={{ position: "relative" as const, flex: "1 1 200px" }}>
            <span style={{ position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>🔍</span>
            <input
              style={{ ...inputS, paddingLeft: 32, width: "100%", boxSizing: "border-box" as const }}
              placeholder="Search notifications…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          {/* Read filter */}
          <div style={{ display: "flex" as const, gap: 4 }}>
            {(["all","unread","read"] as const).map(f => (
              <button key={f} style={btnS(readFilter === f)} onClick={() => { setReadFilter(f); setPage(0); }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select
            style={{ ...inputS }}
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setPage(0); }}
          >
            {priorities.map(p => <option key={p} value={p}>{p === "all" ? "All Priorities" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>

          {/* Category filter */}
          <select
            style={{ ...inputS }}
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
          >
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>

          {/* Sort */}
          <select
            style={{ ...inputS }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">By Priority</option>
          </select>

          {/* Reset */}
          {(search || priorityFilter !== "all" || categoryFilter !== "all" || readFilter !== "all") && (
            <button
              style={{ ...inputS, cursor: "pointer" as const, color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
              onClick={() => { setSearch(""); setPriorityFilter("all"); setCategoryFilter("all"); setReadFilter("all"); setPage(0); }}
            >× Reset</button>
          )}
        </div>

        {/* Category pill row */}
        <div style={{ display: "flex" as const, gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {categories.map(cat => {
            const count = cat === "all" ? notifications.length : notifications.filter(n => (n.category || n.module || "general") === cat).length;
            return (
              <button key={cat} onClick={() => { setCategoryFilter(cat); setPage(0); }} style={{
                padding: "3px 10px",
                background: categoryFilter === cat ? `${catColor(cat)}22` : "transparent",
                border: `1px solid ${categoryFilter === cat ? catColor(cat) : "rgba(255,255,255,0.08)"}`,
                borderRadius: 20,
                color: categoryFilter === cat ? catColor(cat) : "rgba(255,255,255,0.35)",
                cursor: "pointer" as const, fontSize: "11px", fontWeight: categoryFilter === cat ? 600 : 400,
                display: "flex" as const, alignItems: "center" as const, gap: 4,
              }}>
                <span>{cat === "all" ? "🔔" : (CAT_ICONS[cat] || "📌")}</span>
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div style={{
          position: "sticky" as const, top: 16, zIndex: 100,
          ...card,
          padding: "12px 20px",
          marginBottom: 12,
          background: "rgba(30,58,95,0.95)",
          border: "1px solid rgba(59,130,246,0.3)",
          backdropFilter: "blur(12px)",
          display: "flex" as const, alignItems: "center" as const, gap: 12,
          animation: "slideDown 0.15s ease",
        }}>
          <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: "14px" }}>
            {selected.size} selected
          </span>
          <button
            style={{ padding: "6px 14px", background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 8, color: "#60a5fa", cursor: "pointer" as const, fontSize: "13px" }}
            onClick={() => markRead(Array.from(selected))}
          >✓ Mark Read</button>
          <button
            style={{ padding: "6px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", cursor: "pointer" as const, fontSize: "13px" }}
            onClick={() => dismissMany(Array.from(selected))}
          >🗑 Dismiss</button>
          <button
            style={{ marginLeft: "auto", padding: "6px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.5)", cursor: "pointer" as const, fontSize: "13px" }}
            onClick={() => setSelected(new Set())}
          >Cancel</button>
        </div>
      )}

      {/* Notifications list */}
      <div style={card}>
        {/* Table header */}
        <div style={{ display: "flex" as const, alignItems: "center" as const, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 12 }}>
          <input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll}
            style={{ width: 15, height: 15, cursor: "pointer" as const, accentColor: "#3b82f6" }}
          />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
            {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== notifications.length && ` (filtered from ${notifications.length})`}
          </span>
        </div>

        {loading && (
          <div style={{ textAlign: "center" as const, padding: "64px", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: "32px", marginBottom: 12 }}>⏳</div>
            Loading notifications…
          </div>
        )}

        {!loading && paged.length === 0 && (
          <div style={{ textAlign: "center" as const, padding: "64px 24px" }}>
            <div style={{ fontSize: "48px", marginBottom: 16 }}>🎉</div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: "16px", marginBottom: 8 }}>
              {readFilter === "unread" ? "All caught up!" : "No notifications"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
              {readFilter === "unread" ? "You've read all your notifications." : "Matching notifications will appear here."}
            </div>
          </div>
        )}

        {!loading && paged.map((n) => {
          const prio = PRIORITY_CONFIG[n.priority || "normal"];
          const cat = n.category || n.module || "general";
          const icon = n.icon || CAT_ICONS[cat] || "🔔";
          const title = n.title || n.subject || "Notification";
          const message = n.message || n.body || "";
          const isSelected = selected.has(n.id);

          return (
            <div
              key={n.id}
              style={{
                display: "flex" as const, alignItems: "flex-start" as const, gap: 14,
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: isSelected
                  ? "rgba(59,130,246,0.08)"
                  : n.is_read ? "transparent" : "rgba(59,130,246,0.03)",
                transition: "background 0.15s",
                position: "relative" as const,
                cursor: "pointer" as const,
              }}
              onClick={() => !n.is_read && markRead([n.id])}
            >
              {/* Critical priority accent bar */}
              {n.priority === "critical" && !n.is_read && (
                <div style={{
                  position: "absolute" as const, left: 0, top: 0, bottom: 0,
                  width: 3, background: "#ef4444", borderRadius: "3px 0 0 3px",
                }}/>
              )}
              {n.priority === "high" && !n.is_read && (
                <div style={{
                  position: "absolute" as const, left: 0, top: 0, bottom: 0,
                  width: 3, background: "#f97316", borderRadius: "3px 0 0 3px",
                }}/>
              )}

              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(n.id)}
                onClick={e => e.stopPropagation()}
                style={{ marginTop: 4, width: 15, height: 15, cursor: "pointer" as const, accentColor: "#3b82f6", flexShrink: 0 }}
              />

              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: "11px", flexShrink: 0,
                background: `${catColor(cat)}15`,
                border: `1px solid ${catColor(cat)}30`,
                display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
                fontSize: "20px", position: "relative" as const,
              }}>
                {icon}
                {!n.is_read && (
                  <div style={{
                    position: "absolute" as const, top: -3, right: -3,
                    width: 10, height: 10, borderRadius: "50%",
                    background: prio.color,
                    border: "2px solid #0f1729",
                  }}/>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const, gap: 12 }}>
                  <div style={{ fontWeight: n.is_read ? 500 : 700, color: n.is_read ? "rgba(255,255,255,0.7)" : "#fff", fontSize: "14px", marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ display: "flex" as const, alignItems: "center" as const, gap: 8, flexShrink: 0 }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", whiteSpace: "nowrap" as const }}>
                      {timeAgo(n.created_at)}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); dismissMany([n.id]); }}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer" as const, fontSize: "18px", lineHeight: 1, padding: "0 4px" }}
                    >×</button>
                  </div>
                </div>

                {message && (
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.5, marginBottom: 8 }}>
                    {message}
                  </div>
                )}

                <div style={{ display: "flex" as const, gap: 6, flexWrap: "wrap", alignItems: "center" as const }}>
                  {/* Category */}
                  <span style={{
                    padding: "1px 8px", borderRadius: 20, fontSize: "10px", fontWeight: 600,
                    background: `${catColor(cat)}18`,
                    color: catColor(cat),
                    border: `1px solid ${catColor(cat)}30`,
                  }}>
                    {CAT_ICONS[cat] || "📌"} {cat.toUpperCase()}
                  </span>

                  {/* Priority */}
                  {n.priority && n.priority !== "normal" && (
                    <span style={{
                      padding: "1px 8px", borderRadius: 20, fontSize: "10px", fontWeight: 600,
                      background: prio.bg, color: prio.color,
                      border: `1px solid ${prio.color}30`,
                    }}>
                      {prio.emoji} {prio.label.toUpperCase()}
                    </span>
                  )}

                  {/* Read status */}
                  {!n.is_read && (
                    <span style={{
                      padding: "1px 8px", borderRadius: 20, fontSize: "10px", fontWeight: 600,
                      background: "rgba(59,130,246,0.15)", color: "#60a5fa",
                      border: "1px solid rgba(59,130,246,0.3)",
                    }}>NEW</span>
                  )}

                  {/* Action */}
                  {n.action_url && n.action_label && (
                    <a
                      href={n.action_url}
                      onClick={e => { e.stopPropagation(); markRead([n.id]); }}
                      style={{
                        padding: "2px 10px",
                        background: "rgba(59,130,246,0.12)",
                        border: "1px solid rgba(59,130,246,0.25)",
                        borderRadius: 6, color: "#60a5fa",
                        fontSize: "11px", textDecoration: "none" as const, fontWeight: 600,
                      }}
                    >
                      {n.action_label} →
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex" as const, justifyContent: "center" as const, alignItems: "center" as const, gap: 8, padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: page > 0 ? "#60a5fa" : "rgba(255,255,255,0.2)", cursor: page > 0 ? "pointer" : "default", fontSize: "13px" }}
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >← Prev</button>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: page < totalPages - 1 ? "#60a5fa" : "rgba(255,255,255,0.2)", cursor: page < totalPages - 1 ? "pointer" : "default", fontSize: "13px" }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >Next →</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        select option { background: #1a2744; color: #fff; }
      `}</style>
    </div>
  );
}
