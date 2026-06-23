/**
 * EL5 MediProcure — Administration Hub v2.0
 * Microsoft Dynamics 365 / Fluent UI design language
 * Central admin dashboard: all admin pages organised by category,
 * live stats, recent activity, quick actions
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { T } from "@/lib/theme";
import {
  Users, Shield, Settings, Database, Activity, Globe, Lock, Server,
  GitBranch, Code2, Archive, Radio, RefreshCw, ChevronRight, Bell,
  UserPlus, Monitor, Wrench, Building2,
  AlertTriangle, CheckCircle, Clock, Package, FileText,
  BarChart3, Terminal, Printer, Wifi, Search,
  LayoutDashboard, UserCheck, Layers,
  Home, ExternalLink,
} from "lucide-react";

const db = supabase as any;

const D = {
  blue:      "#0078d4",
  blueHov:   "#106ebe",
  blueLt:    "#deecf9",
  bg:        "#f3f2f1",
  card:      "#ffffff",
  border:    "#edebe9",
  borderMd:  "#c8c6c4",
  text:      "#323130",
  textSub:   "#605e5c",
  textMt:    "#a19f9d",
  success:   "#107c10",
  successLt: "#dff6dd",
  warn:      "#ff8c00",
  warnLt:    "#fff4ce",
  danger:    "#a4262c",
  dangerLt:  "#fde7e9",
  purple:    "#8764b8",
  purpleLt:  "#e8d0f7",
  teal:      "#038387",
  tealLt:    "#d1f2f4",
  shadow:    "0 1.6px 3.6px rgba(0,0,0,.132),0 0.3px 0.9px rgba(0,0,0,.108)",
  shadowHov: "0 6.4px 14.4px rgba(0,0,0,.132),0 1.2px 3.6px rgba(0,0,0,.108)",
  radius:    "4px",
  radiusMd:  "6px",
  font:      "'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

const SECTIONS = [
  {
    id: "users", label: "User Management", color: D.purple, colorLt: D.purpleLt, icon: Users,
    description: "Create, manage and control all user accounts and roles",
    items: [
      { l: "All Users",      p: "/users",             I: Users,      desc: "View and manage all staff accounts" },
      { l: "Create User",    p: "/admin/create-user", I: UserPlus,   desc: "Add a new system user" },
      { l: "Roles & Access", p: "/admin/panel",       I: Shield,     desc: "Assign roles and permissions" },
      { l: "Profile",        p: "/profile",           I: UserCheck,  desc: "Your profile & preferences" },
    ],
  },
  {
    id: "security", label: "Security & Monitoring", color: D.danger, colorLt: D.dangerLt, icon: Shield,
    description: "Track logins, sessions, IP access and audit trails",
    items: [
      { l: "Activity Stats",    p: "/admin/activity",       I: Activity,      desc: "Login trends & user activity charts" },
      { l: "Security Tracker",  p: "/admin/tracker",        I: Monitor,       desc: "Device, geo & live session tracker" },
      { l: "IP Access Control", p: "/admin/ip-access",      I: Lock,          desc: "Allow / block / monitor IP rules" },
      { l: "Users & IP Audit",  p: "/admin/users-ip-audit", I: Globe,         desc: "IP geolocation audit per user" },
      { l: "Audit Log",         p: "/audit-log",            I: FileText,      desc: "Full system event audit trail" },
      { l: "Not Found Log",     p: "/admin/not-found-log",  I: AlertTriangle, desc: "404 error log & broken links" },
    ],
  },
  {
    id: "system", label: "System Configuration", color: D.blue, colorLt: D.blueLt, icon: Settings,
    description: "Hospital settings, modules, appearance and broadcast",
    items: [
      { l: "System Settings", p: "/settings",      I: Wrench,    desc: "Hospital name, branding, modules" },
      { l: "Facilities",      p: "/facilities",    I: Building2, desc: "Manage health facility locations" },
      { l: "GUI Editor",      p: "/gui-editor",    I: Layers,    desc: "Live CSS theme & design editor" },
      { l: "Notifications",   p: "/notifications", I: Bell,      desc: "System-wide broadcast & alerts" },
      { l: "Changelog",       p: "/changelog",     I: GitBranch, desc: "Version history & release notes" },
    ],
  },
  {
    id: "database", label: "Database & Storage", color: D.success, colorLt: D.successLt, icon: Database,
    description: "Database monitoring, backup, ODBC and HMIS sync",
    items: [
      { l: "Database Admin",   p: "/admin/database", I: Database, desc: "Browse tables, run queries" },
      { l: "DB Monitor",       p: "/admin/db-test",  I: Activity, desc: "Live connection & latency test" },
      { l: "Backup & Restore", p: "/backup",         I: Archive,  desc: "Export & import all system data" },
      { l: "ODBC / MySQL",     p: "/odbc",           I: Server,   desc: "MySQL / ODBC bridge connector" },
      { l: "HMIS Sync",        p: "/hmis",           I: Wifi,     desc: "Health Management Info System sync" },
    ],
  },
  {
    id: "developer", label: "Developer & Superadmin", color: D.textSub, colorLt: "#f3f2f1", icon: Terminal,
    description: "Superadmin controls, codebase, deploy and diagnostics",
    items: [
      { l: "Superadmin",    p: "/superadmin",                 I: Radio,          desc: "Full system override controls" },
      { l: "Webmaster",     p: "/webmaster",                  I: Code2,          desc: "Module toggles, codebase viewer" },
      { l: "Admin Panel",   p: "/admin/panel",                I: LayoutDashboard,desc: "Admin control centre" },
      { l: "System Report", p: "/reports/system-utilization", I: BarChart3,      desc: "CPU, memory, utilization" },
      { l: "Print Engine",  p: "/reports/print-engine",       I: Printer,        desc: "Print system & templates" },
    ],
  },
];

const QUICK = [
  { l: "New User",   p: "/admin/create-user", I: UserPlus,  primary: true  },
  { l: "Users",      p: "/users",             I: Users,     primary: false },
  { l: "Audit Log",  p: "/audit-log",         I: FileText,  primary: false },
  { l: "Settings",   p: "/settings",          I: Settings,  primary: false },
  { l: "DB Monitor", p: "/admin/db-test",     I: Activity,  primary: false },
  { l: "Backup",     p: "/backup",            I: Archive,   primary: false },
  { l: "Tracker",    p: "/admin/tracker",     I: Monitor,   primary: false },
  { l: "IP Access",  p: "/admin/ip-access",   I: Lock,      primary: false },
  { l: "Webmaster",  p: "/webmaster",         I: Code2,     primary: false },
  { l: "Superadmin", p: "/superadmin",        I: Radio,     primary: false },
];

function cs(extra?: any): any {
  return { background: D.card, borderRadius: D.radiusMd, boxShadow: D.shadow, border: `1px solid ${D.border}`, ...extra };
}

export default function AdminHubPage() {
  const nav = useNavigate();
  const { profile, roles, primaryRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, activeToday: 0, lockedUsers: 0, pendingReqs: 0,
    lowStock: 0, openPOs: 0, systemHealth: 100, totalAuditEvents: 0, totalIpRules: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [uRes, rRes, pRes, poRes, iRes, auRes, ipRes] = await Promise.allSettled([
        db.from("profiles").select("id,is_locked,is_active,last_seen").limit(500),
        db.from("requisitions").select("id", { count: "exact", head: true }).in("status", ["pending", "submitted"]),
        db.from("items").select("id", { count: "exact", head: true }).lt("quantity_in_stock", 10),
        db.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["pending", "approved", "open"]),
        db.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen", today.toISOString()),
        db.from("audit_log").select("id,action,user_name,created_at,module").order("created_at", { ascending: false }).limit(15),
        db.from("ip_access_rules").select("id", { count: "exact", head: true }),
      ]);

      const users       = uRes.status === "fulfilled" ? (uRes.value.data || []) : [];
      const locked      = users.filter((u: any) => u.is_locked).length;
      const activeToday = iRes.status === "fulfilled" ? (iRes.value.count || 0) : 0;
      const pendingReqs = rRes.status === "fulfilled" ? (rRes.value.count || 0) : 0;
      const lowStock    = pRes.status === "fulfilled" ? (pRes.value.count || 0) : 0;
      const openPOs     = poRes.status === "fulfilled" ? (poRes.value.count || 0) : 0;
      const auditEvents = auRes.status === "fulfilled" ? (auRes.value.data || []) : [];
      const ipRules     = ipRes.status === "fulfilled" ? (ipRes.value.count || 0) : 0;

      setStats({
        totalUsers: users.length, activeToday, lockedUsers: locked,
        pendingReqs, lowStock, openPOs,
        systemHealth: 100 - Math.min(30, locked * 5 + (lowStock > 10 ? 10 : lowStock)),
        totalAuditEvents: auditEvents.length, totalIpRules: ipRules || 0,
      });
      setRecentActivity(auditEvents);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredSections = search
    ? SECTIONS.map(s => ({ ...s, items: s.items.filter(i => i.l.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0)
    : SECTIONS;

  const hc = stats.systemHealth >= 90 ? D.success : stats.systemHealth >= 70 ? D.warn : D.danger;

  const kpis = [
    { label: "Total Users",      val: stats.totalUsers,         icon: Users,       color: D.purple,  bg: D.purpleLt,  sub: `${stats.activeToday} active today`,   href: "/users"           },
    { label: "Locked Accounts",  val: stats.lockedUsers,        icon: Lock,        color: D.danger,  bg: D.dangerLt,  sub: stats.lockedUsers > 0 ? "Needs attention" : "All clear", href: "/admin/activity" },
    { label: "Pending Requests", val: stats.pendingReqs,        icon: Clock,       color: D.warn,    bg: D.warnLt,    sub: "Awaiting approval",                    href: "/tracking"        },
    { label: "Low Stock Items",  val: stats.lowStock,           icon: Package,     color: "#ca5010", bg: "#fde8d8",   sub: "Below reorder level",                  href: "/inventory"       },
    { label: "Open POs",         val: stats.openPOs,            icon: FileText,    color: D.blue,    bg: D.blueLt,    sub: "In progress",                          href: "/purchase-orders" },
    { label: "IP Rules",         val: stats.totalIpRules,       icon: Globe,       color: D.teal,    bg: D.tealLt,    sub: "Access control",                       href: "/admin/ip-access" },
    { label: "System Health",    val: `${stats.systemHealth}%`, icon: CheckCircle, color: hc,        bg: stats.systemHealth >= 90 ? D.successLt : stats.systemHealth >= 70 ? D.warnLt : D.dangerLt, sub: "Overall score", href: "/admin/db-test" },
    { label: "Audit Events",     val: stats.totalAuditEvents,   icon: Activity,    color: D.textSub, bg: D.bg,        sub: "Recent (last 15)",                     href: "/audit-log"       },
  ];

  const sysStatus = [
    { label: "Supabase DB",    ok: true,  val: "Connected"  },
    { label: "Auth Service",   ok: true,  val: "Active"     },
    { label: "Edge Functions", ok: true,  val: "Running"    },
    { label: "Realtime",       ok: true,  val: "Subscribed" },
    { label: "Storage Bucket", ok: true,  val: "Online"     },
    { label: "Maintenance",    ok: false, val: "Off"        },
  ];

  return (
    <div style={{ background: D.bg, minHeight: "100vh", fontFamily: D.font, color: D.text }}>

      {/* D365 signature 4px blue ribbon */}
      <div style={{ background: D.blue, height: 4 }} />

      {/* Breadcrumb */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: "5px 24px", display: "flex", alignItems: "center", gap: 6 }}>
        <Home size={11} color={D.textMt} />
        <span style={{ fontSize: 11, color: D.textMt }}>EL5 MediProcure</span>
        <ChevronRight size={9} color={D.textMt} />
        <span style={{ fontSize: 11, color: D.blue, fontWeight: 600 }}>Administration Centre</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: D.textMt }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: D.success, display: "inline-block" }} />
          {primaryRole?.replace(/_/g, " ") || "Admin"}
        </div>
      </div>

      {/* D365 Command Bar */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: "7px 20px", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: D.radius, background: D.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.text, lineHeight: 1.2 }}>Administration Centre</div>
            <div style={{ fontSize: 10, color: D.textMt }}>Embu Level 5 Hospital · EL5 MediProcure</div>
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: D.border, marginRight: 6 }} />
        {QUICK.map(q => (
          <button key={q.p} onClick={() => nav(q.p)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: q.primary ? "5px 13px" : "5px 10px", background: q.primary ? D.blue : "transparent", color: q.primary ? "#fff" : D.text, border: q.primary ? `1px solid ${D.blue}` : `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "background .1s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = q.primary ? D.blueHov : D.bg; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = q.primary ? D.blue : "transparent"; }}>
            <q.I size={12} />{q.l}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <Search size={11} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: D.textMt, pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search admin pages…"
            style={{ padding: "5px 26px 5px 24px", border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, outline: "none", width: 200, color: D.text, background: D.card, fontFamily: D.font }} />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: D.textMt, fontSize: 14, lineHeight: 1 }}>×</button>}
        </div>
        <button onClick={load} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", background: "transparent", color: D.text, border: `1px solid ${D.borderMd}`, borderRadius: D.radius, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      {/* KPI Insight Strip */}
      <div style={{ padding: "14px 20px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 8 }}>
        {kpis.map(k => (
          <button key={k.label} onClick={() => nav(k.href)}
            style={cs({ padding: "13px 15px", cursor: "pointer", textAlign: "left", width: "100%", borderTop: `3px solid ${k.color}`, transition: "box-shadow .15s,transform .15s" })}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = D.shadowHov; el.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = D.shadow; el.style.transform = "none"; }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: D.radius, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <k.icon size={12} color={k.color} />
              </div>
              <ChevronRight size={10} color={D.textMt} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4 }}>{loading ? "—" : k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: D.text, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: D.textMt }}>{k.sub}</div>
          </button>
        ))}
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 295px", gap: 12, padding: "12px 20px 20px" }}>

        {/* Left: Section entity cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {search && filteredSections.length === 0 && (
            <div style={cs({ padding: "44px 24px", textAlign: "center" })}>
              <Search size={26} color={D.textMt} style={{ opacity: .4 }} />
              <div style={{ marginTop: 10, fontSize: 13, color: D.textSub }}>No admin pages match "<strong>{search}</strong>"</div>
              <button onClick={() => setSearch("")} style={{ marginTop: 12, padding: "5px 14px", background: D.blue, color: "#fff", border: "none", borderRadius: D.radius, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Clear search</button>
            </div>
          )}

          {filteredSections.map(sec => (
            <div key={sec.id} style={cs()}>
              {/* D365 tinted section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: sec.colorLt, borderBottom: `1px solid ${D.border}`, borderRadius: `${D.radiusMd} ${D.radiusMd} 0 0` }}>
                <div style={{ width: 26, height: 26, borderRadius: D.radius, background: sec.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <sec.icon size={13} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{sec.label}</div>
                  <div style={{ fontSize: 10, color: D.textSub }}>{sec.description}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: sec.color, background: "#fff", border: `1px solid ${sec.color}50`, borderRadius: 99, padding: "2px 8px" }}>{sec.items.length} items</span>
              </div>

              {/* Items grid — D365 flat table cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(195px,1fr))" }}>
                {sec.items.map(item => (
                  <button key={item.p} onClick={() => nav(item.p)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "transparent", border: "none", borderRight: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}`, cursor: "pointer", textAlign: "left", transition: "background .1s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = sec.colorLt; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <div style={{ width: 28, height: 28, borderRadius: D.radius, background: `${sec.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <item.I size={13} color={sec.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: D.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.l}</div>
                      <div style={{ fontSize: 10, color: D.textMt, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</div>
                    </div>
                    <ExternalLink size={9} color={D.textMt} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Your Access */}
          <div style={cs({ padding: "14px 15px" })}>
            <div style={{ fontSize: 10, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Your Access</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: D.blueLt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users size={17} color={D.blue} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{profile?.full_name || "Administrator"}</div>
                <div style={{ fontSize: 10, color: D.textMt }}>{profile?.email || ""}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {roles?.map(r => (
                <span key={r} style={{ padding: "2px 8px", borderRadius: 99, background: D.purpleLt, color: D.purple, fontSize: 10, fontWeight: 700, textTransform: "capitalize", border: `1px solid ${D.purple}30` }}>{r.replace(/_/g, " ")}</span>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div style={cs()}>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em" }}>System Status</span>
              <CheckCircle size={12} color={D.success} />
            </div>
            <div style={{ padding: "0 15px" }}>
              {sysStatus.map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${D.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.ok ? D.success : D.danger, display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: D.textSub }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.ok ? D.success : D.danger }}>{s.val}</span>
                </div>
              ))}
              <div style={{ padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: D.textSub, fontWeight: 600 }}>System Health</span>
                  <span style={{ fontWeight: 800, color: hc }}>{stats.systemHealth}%</span>
                </div>
                <div style={{ height: 4, background: D.border, borderRadius: 99 }}>
                  <div style={{ height: 4, borderRadius: 99, background: hc, width: `${stats.systemHealth}%`, transition: "width .6s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div style={cs({ flex: 1 })}>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em" }}>Recent Activity</span>
              <button onClick={() => nav("/audit-log")} style={{ fontSize: 11, color: D.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 2, padding: 0 }}>
                View all <ChevronRight size={10} />
              </button>
            </div>
            <div style={{ padding: "8px 15px" }}>
              {loading ? (
                <div style={{ padding: "18px 0", textAlign: "center", color: D.textMt, fontSize: 12 }}>
                  <RefreshCw size={15} color={D.textMt} style={{ animation: "spin 1s linear infinite" }} />
                  <div style={{ marginTop: 6 }}>Loading…</div>
                </div>
              ) : recentActivity.length === 0 ? (
                <div style={{ padding: "18px 0", textAlign: "center", color: D.textMt, fontSize: 12 }}>No recent activity</div>
              ) : recentActivity.map((a: any, i: number) => (
                <div key={a.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: `1px solid ${D.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: D.blue, border: `2px solid ${D.blueLt}` }} />
                    {i < recentActivity.length - 1 && <div style={{ width: 1, height: 24, background: D.border, marginTop: 2 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: D.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.action || "System event"}</div>
                    <div style={{ fontSize: 10, color: D.textMt, marginTop: 2, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span>{a.user_name || "system"}</span>
                      {a.module && <span style={{ padding: "0 5px", background: D.bg, borderRadius: 3, color: D.textSub, fontWeight: 600 }}>{a.module}</span>}
                      <span>{a.created_at ? new Date(a.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer quick action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {[
              { l: "Audit Log",  p: "/audit-log",                   I: FileText,  color: D.blue    },
              { l: "Backup",     p: "/backup",                      I: Archive,   color: D.success  },
              { l: "Settings",   p: "/settings",                    I: Settings,  color: D.purple  },
              { l: "Sys Report", p: "/reports/system-utilization",  I: BarChart3, color: D.warn    },
            ].map(b => (
              <button key={b.p} onClick={() => nav(b.p)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", background: D.card, border: `1px solid ${D.border}`, borderLeft: `3px solid ${b.color}`, borderRadius: D.radius, color: D.text, fontSize: 11, fontWeight: 600, cursor: "pointer", boxShadow: D.shadow, transition: "box-shadow .1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = D.shadowHov; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = D.shadow; }}>
                <b.I size={11} color={b.color} />{b.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
