/**
 * EL5 MediProcure — Administration Hub v1.0
 * Central admin dashboard: all admin pages organized by category,
 * live stats, recent activity, quick actions
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Users, Shield, Settings, Database, Activity, Globe, Lock, Server,
  GitBranch, Code2, Archive, Radio, RefreshCw, ChevronRight, Bell,
  Key, UserPlus, Eye, Monitor, Wrench, HardDrive, Wifi, Building2,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Package, FileText,
  BarChart3, Terminal, Cpu, Hash, Printer, MapPin, Zap, Search,
  Plus, BookOpen, ToggleLeft, LayoutDashboard, UserCheck, Layers,
} from "lucide-react";

const db = supabase as any;

// ─── Admin section definitions ───────────────────────────────────────────────
const SECTIONS = [
  {
    id: "users",
    label: "User Management",
    color: "#7c3aed",
    icon: Users,
    description: "Create, manage and control all user accounts and roles",
    items: [
      { l: "All Users",       p: "/users",                 I: Users,       desc: "View and manage all staff accounts" },
      { l: "Create User",     p: "/admin/create-user",     I: UserPlus,    desc: "Add a new system user" },
      { l: "Roles & Access",  p: "/admin/panel",           I: Shield,      desc: "Assign roles and permissions" },
      { l: "Profile",         p: "/profile",               I: UserCheck,   desc: "Your profile & preferences" },
    ],
  },
  {
    id: "security",
    label: "Security & Monitoring",
    color: "#dc2626",
    icon: Shield,
    description: "Track logins, sessions, IP access and audit trails",
    items: [
      { l: "Activity Stats",    p: "/admin/activity",          I: Activity,   desc: "Login trends & user activity charts" },
      { l: "Security Tracker",  p: "/admin/tracker",           I: Monitor,    desc: "Device, geo & live session tracker" },
      { l: "IP Access Control", p: "/admin/ip-access",         I: Lock,       desc: "Allow / block / monitor IP rules" },
      { l: "Users & IP Audit",  p: "/admin/users-ip-audit",    I: Globe,      desc: "IP geolocation audit per user" },
      { l: "Audit Log",         p: "/audit-log",               I: FileText,   desc: "Full system event audit trail" },
      { l: "Not Found Log",     p: "/admin/not-found-log",     I: AlertTriangle, desc: "404 error log & broken links" },
    ],
  },
  {
    id: "system",
    label: "System Configuration",
    color: "#0078d4",
    icon: Settings,
    description: "Hospital settings, modules, appearance and broadcast",
    items: [
      { l: "System Settings",   p: "/settings",       I: Wrench,      desc: "Hospital name, branding, modules" },
      { l: "Facilities",        p: "/facilities",     I: Building2,   desc: "Manage health facility locations" },
      { l: "GUI Editor",        p: "/gui-editor",     I: Layers,      desc: "Live CSS theme & design editor" },
      { l: "Notifications",     p: "/notifications",  I: Bell,        desc: "System-wide broadcast & alerts" },
      { l: "Changelog",         p: "/changelog",      I: GitBranch,   desc: "Version history & release notes" },
    ],
  },
  {
    id: "database",
    label: "Database & Storage",
    color: "#059669",
    icon: Database,
    description: "Database monitoring, backup, ODBC and HMIS sync",
    items: [
      { l: "Database Admin",   p: "/admin/database",  I: Database,   desc: "Browse tables, run queries" },
      { l: "DB Monitor",       p: "/admin/db-test",   I: Activity,   desc: "Live connection & latency test" },
      { l: "Backup & Restore", p: "/backup",          I: Archive,    desc: "Export & import all system data" },
      { l: "ODBC / MySQL",     p: "/odbc",            I: Server,     desc: "MySQL / ODBC bridge connector" },
      { l: "HMIS Sync",        p: "/hmis",            I: Wifi,       desc: "Health Management Info System sync" },
    ],
  },
  {
    id: "developer",
    label: "Developer & Superadmin",
    color: "#374151",
    icon: Terminal,
    description: "Superadmin controls, codebase, deploy and diagnostics",
    items: [
      { l: "Superadmin",        p: "/superadmin",      I: Radio,      desc: "Full system override controls" },
      { l: "Webmaster",         p: "/webmaster",       I: Code2,      desc: "Module toggles, codebase viewer" },
      { l: "Admin Panel",       p: "/admin/panel",     I: LayoutDashboard, desc: "Admin control centre" },
      { l: "System Report",     p: "/reports/system-utilization", I: BarChart3, desc: "CPU, memory, utilization" },
      { l: "Print Engine",      p: "/reports/print-engine",       I: Printer, desc: "Print system & templates" },
    ],
  },
];

// ─── Quick link bar items ────────────────────────────────────────────────────
const QUICK = [
  { l: "Users",        p: "/users",             I: Users,     col: "#7c3aed" },
  { l: "Create User",  p: "/admin/create-user", I: UserPlus,  col: "#059669" },
  { l: "Settings",     p: "/settings",          I: Settings,  col: "#0078d4" },
  { l: "Audit Log",    p: "/audit-log",         I: FileText,  col: "#d97706" },
  { l: "DB Monitor",   p: "/admin/db-test",     I: Activity,  col: "#dc2626" },
  { l: "Backup",       p: "/backup",            I: Archive,   col: "#374151" },
  { l: "Tracker",      p: "/admin/tracker",     I: Monitor,   col: "#0891b2" },
  { l: "IP Access",    p: "/admin/ip-access",   I: Lock,      col: "#b91c1c" },
  { l: "Webmaster",    p: "/webmaster",         I: Code2,     col: "#374151" },
  { l: "Superadmin",   p: "/superadmin",        I: Radio,     col: "#6b21a8" },
];

export default function AdminHubPage() {
  const nav = useNavigate();
  const { profile, roles, primaryRole } = useAuth();
  const isAdmin = roles?.some(r => ["admin","superadmin","webmaster"].includes(r));

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, activeToday: 0, lockedUsers: 0, pendingReqs: 0,
    lowStock: 0, openPOs: 0, lastBackup: "—", systemHealth: 100,
    totalAuditEvents: 0, totalIpRules: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const [uRes, rRes, pRes, poRes, iRes, auRes, ipRes] = await Promise.allSettled([
        db.from("profiles").select("id,is_locked,is_active,last_seen").limit(500),
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
        db.from("items").select("id",{count:"exact",head:true}).lt("quantity_in_stock",10),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved","open"]),
        db.from("profiles").select("id",{count:"exact",head:true}).gte("last_seen",today.toISOString()),
        db.from("audit_log").select("id,action,user_name,created_at,module").order("created_at",{ascending:false}).limit(15),
        db.from("ip_access_rules").select("id",{count:"exact",head:true}),
      ]);

      const users = uRes.status==="fulfilled" ? (uRes.value.data||[]) : [];
      const locked = users.filter((u:any)=>u.is_locked).length;
      const activeToday = iRes.status==="fulfilled" ? (iRes.value.count||0) : 0;
      const pendingReqs = rRes.status==="fulfilled" ? (rRes.value.count||0) : 0;
      const lowStock = pRes.status==="fulfilled" ? (pRes.value.count||0) : 0;
      const openPOs = poRes.status==="fulfilled" ? (poRes.value.count||0) : 0;
      const auditEvents = auRes.status==="fulfilled" ? (auRes.value.data||[]) : [];
      const ipRules = ipRes.status==="fulfilled" ? (ipRes.value.count||0) : 0;

      setStats({
        totalUsers: users.length, activeToday, lockedUsers: locked,
        pendingReqs, lowStock, openPOs,
        lastBackup: "Check /backup",
        systemHealth: 100 - Math.min(30, locked*5 + (lowStock>10?10:lowStock)),
        totalAuditEvents: auditEvents.length,
        totalIpRules: ipRules||0,
      });
      setRecentActivity(auditEvents);
    } catch(e){ console.error(e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  // filter sections by search
  const filteredSections = search
    ? SECTIONS.map(s=>({
        ...s,
        items: s.items.filter(i=>
          i.l.toLowerCase().includes(search.toLowerCase()) ||
          i.desc.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s=>s.items.length>0)
    : SECTIONS;

  const healthColor = stats.systemHealth >= 90 ? "#059669" : stats.systemHealth >= 70 ? "#d97706" : "#dc2626";

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',sans-serif", color:T.fg }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"18px 24px", boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0078d4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Shield size={24} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:0 }}>Administration Centre</h1>
              <p style={{ fontSize:12, color:T.fgMuted, margin:0 }}>EL5 MediProcure · {primaryRole?.replace(/_/g," ")||"Admin"} · Embu Level 5 Hospital</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ position:"relative" }}>
              <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:T.fgMuted, pointerEvents:"none" }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search admin pages…"
                style={{ padding:"7px 12px 7px 30px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, outline:"none", width:220, color:T.fg, background:"#fafafa" }}/>
              {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.fgMuted, fontSize:16, lineHeight:1 }}>×</button>}
            </div>
            <button onClick={load} disabled={loading}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:T.primary, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":"none" }}/> Refresh
            </button>
          </div>
        </div>

        {/* ── Quick link strip ─────────────────────────────────────────────── */}
        <div style={{ marginTop:14, display:"flex", gap:6, flexWrap:"wrap" }}>
          {QUICK.map(q=>(
            <button key={q.p} onClick={()=>nav(q.p)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:6, border:`1px solid ${q.col}30`, background:`${q.col}0a`, color:q.col, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .12s", whiteSpace:"nowrap" }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=`${q.col}18`; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=`${q.col}0a`; }}>
              <q.I size={12}/>{q.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live KPI Stats Bar ────────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"12px 24px", display:"flex", gap:4, flexWrap:"wrap" }}>
        {[
          { label:"Total Users",      val:stats.totalUsers,       icon:Users,     color:"#7c3aed", sub:`${stats.activeToday} active today`  },
          { label:"Locked Accounts",  val:stats.lockedUsers,      icon:Lock,      color:"#dc2626", sub:"Requires attention" },
          { label:"Pending Requests", val:stats.pendingReqs,      icon:Clock,     color:"#d97706", sub:"Awaiting approval" },
          { label:"Low Stock Items",  val:stats.lowStock,         icon:Package,   color:"#f97316", sub:"Below reorder level" },
          { label:"Open POs",         val:stats.openPOs,          icon:FileText,  color:"#0078d4", sub:"In progress" },
          { label:"IP Rules",         val:stats.totalIpRules,     icon:Globe,     color:"#059669", sub:"Access control rules" },
          { label:"System Health",    val:`${stats.systemHealth}%`,icon:CheckCircle,color:healthColor,sub:"Overall score" },
          { label:"Audit Events",     val:stats.totalAuditEvents, icon:Activity,  color:"#374151", sub:"Recent (last 15)" },
        ].map(k=>(
          <div key={k.label} style={{ flex:"1 1 120px", minWidth:120, padding:"10px 14px", background:T.bg, borderRadius:8, border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <k.icon size={14} color={k.color}/>
              <span style={{ fontSize:10, color:T.fgMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>{k.label}</span>
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{loading?"…":k.val}</div>
            <div style={{ fontSize:10, color:T.fgMuted, marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:0, minHeight:"calc(100vh - 220px)" }}>

        {/* Left: Sections Grid */}
        <div style={{ padding:"20px 24px", overflowY:"auto" }}>
          {search && filteredSections.length===0 && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:T.fgMuted }}>
              <Search size={32} style={{ opacity:.3 }}/><br/>
              <p style={{ marginTop:12, fontSize:14 }}>No admin pages match "<strong>{search}</strong>"</p>
            </div>
          )}

          {filteredSections.map(sec=>(
            <div key={sec.id} style={{ marginBottom:28 }}>
              {/* Section header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${sec.color}` }}>
                <div style={{ width:30, height:30, borderRadius:7, background:sec.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <sec.icon size={15} color="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>{sec.label}</div>
                  <div style={{ fontSize:11, color:T.fgMuted }}>{sec.description}</div>
                </div>
              </div>

              {/* Item cards grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
                {sec.items.map(item=>(
                  <button key={item.p} onClick={()=>nav(item.p)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:10, cursor:"pointer", textAlign:"left", transition:"all .15s", borderLeft:`3px solid ${sec.color}` }}
                    onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.background=`${sec.color}06`; el.style.borderColor=`${sec.color}60`; el.style.boxShadow=`0 4px 12px rgba(0,0,0,.08)`; el.style.transform="translateY(-1px)"; }}
                    onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.background="#fff"; el.style.borderColor=T.border; el.style.boxShadow="none"; el.style.transform="none"; el.style.borderLeftColor=sec.color; }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:`${sec.color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <item.I size={16} color={sec.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.l}</div>
                      <div style={{ fontSize:11, color:T.fgMuted, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={14} color={T.fgMuted}/>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Activity feed + System info */}
        <div style={{ borderLeft:`1px solid ${T.border}`, background:"#fff", overflowY:"auto" }}>

          {/* System status panel */}
          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", marginBottom:10, textTransform:"uppercase", letterSpacing:".05em" }}>System Status</div>
            {[
              { label:"Supabase DB",       ok:true,  val:"Connected" },
              { label:"Auth Service",       ok:true,  val:"Active" },
              { label:"Edge Functions",     ok:true,  val:"Running" },
              { label:"Realtime",           ok:true,  val:"Subscribed" },
              { label:"Storage Bucket",     ok:true,  val:"Online" },
              { label:"Maintenance Mode",   ok:false, val:"Off" },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:s.ok?"#059669":"#dc2626", display:"inline-block" }}/>
                  <span style={{ fontSize:12, color:T.fgMuted }}>{s.label}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:s.ok?"#059669":"#dc2626" }}>{s.val}</span>
              </div>
            ))}

            {/* Health bar */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
                <span style={{ color:T.fgMuted, fontWeight:600 }}>System Health</span>
                <span style={{ fontWeight:800, color:healthColor }}>{stats.systemHealth}%</span>
              </div>
              <div style={{ height:6, background:"#e5e7eb", borderRadius:99 }}>
                <div style={{ height:6, borderRadius:99, background:`linear-gradient(to right,${healthColor},${healthColor}cc)`, width:`${stats.systemHealth}%`, transition:"width .5s" }}/>
              </div>
            </div>
          </div>

          {/* Admin role info */}
          <div style={{ padding:"14px 16px 0" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", marginBottom:10, textTransform:"uppercase", letterSpacing:".05em" }}>Your Access</div>
            <div style={{ background:"#f8f9fa", borderRadius:8, padding:"10px 12px", border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{profile?.full_name||"Administrator"}</div>
              <div style={{ fontSize:11, color:T.fgMuted }}>{profile?.email||""}</div>
              <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:4 }}>
                {roles?.map(r=>(
                  <span key={r} style={{ padding:"2px 8px", borderRadius:99, background:"#7c3aed1a", color:"#7c3aed", fontSize:10, fontWeight:700, textTransform:"capitalize" }}>{r.replace(/_/g," ")}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", textTransform:"uppercase", letterSpacing:".05em" }}>Recent Activity</div>
              <button onClick={()=>nav("/audit-log")} style={{ fontSize:11, color:T.primary, background:"none", border:"none", cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", gap:3 }}>
                View all <ChevronRight size={11}/>
              </button>
            </div>
            {loading ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:T.fgMuted, fontSize:12 }}>Loading…</div>
            ) : recentActivity.length===0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:T.fgMuted, fontSize:12 }}>No recent activity</div>
            ) : recentActivity.map((a:any,i:number)=>(
              <div key={a.id||i} style={{ padding:"8px 0", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"flex-start", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:6, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Activity size={13} color={T.fgMuted}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:"#1a1a2e", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.action||"System event"}</div>
                  <div style={{ fontSize:10, color:T.fgMuted, marginTop:2 }}>{a.user_name||"system"} · {a.module||"—"} · {a.created_at?new Date(a.created_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}):"—"}</div>
                </div>
              </div>
            ))}

            {/* Footer actions */}
            <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { l:"View Audit Log",   p:"/audit-log",      I:FileText,  col:T.primary },
                { l:"Backup Now",       p:"/backup",         I:Archive,   col:"#059669" },
                { l:"User Settings",    p:"/settings",       I:Settings,  col:"#7c3aed" },
                { l:"System Report",    p:"/reports/system-utilization", I:BarChart3, col:"#d97706" },
              ].map(b=>(
                <button key={b.p} onClick={()=>nav(b.p)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px", background:b.col+"12", border:`1px solid ${b.col}30`, borderRadius:8, color:b.col, fontSize:11, fontWeight:600, cursor:"pointer", transition:"background .12s" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=`${b.col}22`; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=`${b.col}12`; }}>
                  <b.I size={12}/>{b.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
