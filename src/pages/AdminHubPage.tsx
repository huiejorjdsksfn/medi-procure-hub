/**
 * EL5 MediProcure — Administration Hub v3.0
 * Microsoft Dynamics 365 / Fluent UI design language
 * Clean navigation launcher — no KPI tiles, no stats panels
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Shield, Settings, Database, Activity, Globe, Lock, Server,
  GitBranch, Code2, Archive, Radio, ChevronRight, Bell,
  UserPlus, Monitor, Wrench, Building2,
  AlertTriangle, FileText, BarChart3, Terminal, Printer, Wifi, Search,
  LayoutDashboard, UserCheck, Layers, Home, ExternalLink,
  BookOpen, Package, Rss, FormInput, HelpCircle, Network,
  ClipboardList, Map, Cpu,
} from "lucide-react";

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
  indigo:    "#4f6bed",
  indigoLt:  "#e8ecfa",
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
      { l: "All Users",         p: "/users",              I: Users,      desc: "View and manage all staff accounts" },
      { l: "Create User",       p: "/admin/create-user",  I: UserPlus,   desc: "Add a new system user" },
      { l: "Roles & Access",    p: "/admin/panel",        I: Shield,     desc: "Assign roles and permissions" },
      { l: "Profile",           p: "/profile",            I: UserCheck,  desc: "Your profile & preferences" },
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
      { l: "System Settings",   p: "/settings",      I: Wrench,    desc: "Hospital name, branding, modules" },
      { l: "Facilities",        p: "/facilities",    I: Building2, desc: "Manage health facility locations" },
      { l: "GUI Editor",        p: "/gui-editor",    I: Layers,    desc: "Live CSS theme & design editor" },
      { l: "Notifications",     p: "/notifications", I: Bell,      desc: "System-wide broadcast & alerts" },
      { l: "Form Builder",      p: "/forms",         I: FormInput, desc: "Build & manage system forms" },
      { l: "Changelog",         p: "/changelog",     I: GitBranch, desc: "Version history & release notes" },
      { l: "Releases",          p: "/releases",      I: Rss,       desc: "System release announcements" },
      { l: "About",             p: "/about",         I: HelpCircle,desc: "About EL5 MediProcure" },
    ],
  },
  {
    id: "database", label: "Database & Storage", color: D.success, colorLt: D.successLt, icon: Database,
    description: "Database monitoring, backup, ODBC and HMIS sync",
    items: [
      { l: "Database Admin",    p: "/admin/database", I: Database, desc: "Browse tables, run queries" },
      { l: "DB Monitor",        p: "/admin/db-test",  I: Activity, desc: "Live connection & latency test" },
      { l: "Backup & Restore",  p: "/backup",         I: Archive,  desc: "Export & import all system data" },
      { l: "ODBC / MySQL",      p: "/odbc",           I: Server,   desc: "MySQL / ODBC bridge connector" },
      { l: "HMIS Sync",         p: "/hmis",           I: Wifi,     desc: "Health Management Info System sync" },
    ],
  },
  {
    id: "reports", label: "Reports & Analytics", color: D.teal, colorLt: D.tealLt, icon: BarChart3,
    description: "System reports, print engine and analytics dashboards",
    items: [
      { l: "Reports",           p: "/reports",                      I: BarChart3,     desc: "All system reports" },
      { l: "System Report",     p: "/reports/system-utilization",   I: Cpu,           desc: "CPU, memory, utilization" },
      { l: "Print Engine",      p: "/reports/print-engine",         I: Printer,       desc: "Print system & templates" },
      { l: "Scanner",           p: "/scanner",                      I: Package,       desc: "Barcode & QR scanner" },
      { l: "Stamps",            p: "/stamps",                       I: ClipboardList, desc: "Approval stamps manager" },
      { l: "AI Agent",          p: "/ai-agent",                     I: Cpu,           desc: "AI assistant & agent" },
    ],
  },
  {
    id: "developer", label: "Developer & Superadmin", color: D.textSub, colorLt: "#f3f2f1", icon: Terminal,
    description: "Superadmin controls, codebase, deploy and diagnostics",
    items: [
      { l: "Superadmin",        p: "/superadmin",     I: Radio,          desc: "Full system override controls" },
      { l: "Webmaster",         p: "/webmaster",      I: Code2,          desc: "Module toggles, codebase viewer" },
      { l: "Admin Panel",       p: "/admin/panel",    I: LayoutDashboard,desc: "Admin control centre" },
      { l: "Network Guard",     p: "/admin/ip-access",I: Network,        desc: "Network & IP security layer" },
      { l: "Map / Geo",         p: "/admin/tracker",  I: Map,            desc: "Geolocation & device map" },
    ],
  },
];

const QUICK = [
  { l: "New User",    p: "/admin/create-user",  I: UserPlus,  primary: true  },
  { l: "Users",       p: "/users",              I: Users,     primary: false },
  { l: "Audit Log",   p: "/audit-log",          I: FileText,  primary: false },
  { l: "Settings",    p: "/settings",           I: Settings,  primary: false },
  { l: "IP Access",   p: "/admin/ip-access",    I: Lock,      primary: false },
  { l: "IP Audit",    p: "/admin/users-ip-audit",I: Globe,    primary: false },
  { l: "Tracker",     p: "/admin/tracker",      I: Monitor,   primary: false },
  { l: "DB Monitor",  p: "/admin/db-test",      I: Activity,  primary: false },
  { l: "Backup",      p: "/backup",             I: Archive,   primary: false },
  { l: "Webmaster",   p: "/webmaster",          I: Code2,     primary: false },
];

function cs(extra?: any): any {
  return { background: D.card, borderRadius: D.radiusMd, boxShadow: D.shadow, border: `1px solid ${D.border}`, ...extra };
}

export default function AdminHubPage() {
  const nav = useNavigate();
  const { profile, roles, primaryRole } = useAuth();
  const [search, setSearch] = useState("");

  const filteredSections = search
    ? SECTIONS.map(s => ({ ...s, items: s.items.filter(i => i.l.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0)
    : SECTIONS;

  const totalPages = SECTIONS.reduce((a, s) => a + s.items.length, 0);

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
            <div style={{ fontSize: 10, color: D.textMt }}>Embu Level 5 Hospital · EL5 MediProcure · {totalPages} pages</div>
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
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 12, padding: "14px 20px 24px" }}>

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
                <span style={{ fontSize: 10, fontWeight: 700, color: sec.color, background: "#fff", border: `1px solid ${sec.color}50`, borderRadius: 99, padding: "2px 8px" }}>{sec.items.length} pages</span>
              </div>

              {/* Items grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
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

          {/* Section index */}
          <div style={cs()}>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em" }}>Jump To Section</span>
            </div>
            <div style={{ padding: "4px 0" }}>
              {SECTIONS.map(sec => (
                <button key={sec.id}
                  onClick={() => { setSearch(""); document.getElementById(`sec-${sec.id}`)?.scrollIntoView({ behavior: "smooth" }); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 15px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .1s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div style={{ width: 20, height: 20, borderRadius: D.radius, background: `${sec.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <sec.icon size={10} color={sec.color} />
                  </div>
                  <span style={{ fontSize: 12, color: D.text, fontWeight: 500, flex: 1 }}>{sec.label}</span>
                  <span style={{ fontSize: 10, color: sec.color, fontWeight: 700 }}>{sec.items.length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Security Links */}
          <div style={cs()}>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: D.textSub, textTransform: "uppercase", letterSpacing: ".07em" }}>Security Quick Access</span>
            </div>
            <div style={{ padding: "4px 0" }}>
              {[
                { l: "IP Access Control", p: "/admin/ip-access",       I: Lock,     c: D.danger  },
                { l: "Users & IP Audit",  p: "/admin/users-ip-audit",  I: Globe,    c: D.teal    },
                { l: "Audit Log",         p: "/audit-log",             I: FileText, c: D.blue    },
                { l: "Security Tracker",  p: "/admin/tracker",         I: Monitor,  c: D.purple  },
                { l: "Activity Stats",    p: "/admin/activity",        I: Activity, c: D.warn    },
                { l: "Not Found Log",     p: "/admin/not-found-log",   I: AlertTriangle, c: D.textSub },
              ].map(b => (
                <button key={b.p} onClick={() => nav(b.p)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 15px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .1s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.bg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div style={{ width: 20, height: 20, borderRadius: D.radius, background: `${b.c}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <b.I size={10} color={b.c} />
                  </div>
                  <span style={{ fontSize: 12, color: D.text, fontWeight: 500, flex: 1 }}>{b.l}</span>
                  <ChevronRight size={9} color={D.textMt} />
                </button>
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

          {/* Version badge */}
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <span style={{ fontSize: 10, color: D.textMt }}>EL5 MediProcure · Admin Hub v3.0 · {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
