/**
 * AdminBreadcrumb — shared top-of-page nav bar for every admin page
 * Shows: Admin Hub > [Section] > Current Page  + quick jump buttons
 * EL5 MediProcure
 */
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Home, LayoutGrid, ArrowLeft } from "lucide-react";
import { T } from "@/lib/theme";

const ADMIN_CRUMBS: Record<string, { section: string; label: string }> = {
  "/admin/panel":              { section: "User Mgmt",  label: "Admin Panel" },
  "/users":                    { section: "User Mgmt",  label: "All Users" },
  "/admin/create-user":        { section: "User Mgmt",  label: "Create User" },
  "/admin/tracker":            { section: "Security",   label: "Security Tracker" },
  "/admin/ip-access":          { section: "Security",   label: "IP Access Control" },
  "/admin/users-ip-audit":     { section: "Security",   label: "Users & IP Audit" },
  "/audit-log":                { section: "Security",   label: "Audit Log" },
  "/admin/not-found-log":      { section: "Security",   label: "Not Found Log" },
  "/settings":                 { section: "System",     label: "System Settings" },
  "/facilities":               { section: "System",     label: "Facilities" },
  "/gui-editor":               { section: "System",     label: "GUI Editor" },
  "/notifications":            { section: "System",     label: "Notifications" },
  "/admin/database":           { section: "Database",   label: "Database Admin" },
  "/admin/deployments":        { section: "Database",   label: "Deployment Center" },
  "/admin/deployments/new":    { section: "Database",   label: "New Company Onboarding" },
  "/webmaster":                { section: "Developer",  label: "Webmaster" },
  "/superadmin":               { section: "Developer",  label: "Superadmin" },
  "/reports/system-utilization":{ section: "Developer", label: "System Report" },
  "/reports/print-engine":     { section: "Developer",  label: "Print Engine" },
  "/profile":                  { section: "User Mgmt",  label: "Profile" },
};

const SECTION_COLORS: Record<string, string> = {
  "User Mgmt": "#7c3aed",
  "Security":  "#dc2626",
  "System":    "#0078d4",
  "Database":  "#059669",
  "Developer": "#374151",
};

// Sibling pages per section for quick jump
const SECTION_SIBLINGS: Record<string, { l: string; p: string }[]> = {
  "User Mgmt": [
    { l: "All Users",    p: "/users" },
    { l: "Create User",  p: "/admin/create-user" },
    { l: "Admin Panel",  p: "/admin/panel" },
    { l: "Profile",      p: "/profile" },
  ],
  "Security": [
    { l: "Security Tracker", p: "/admin/tracker" },
    { l: "IP Access",        p: "/admin/ip-access" },
    { l: "IP Audit",         p: "/admin/users-ip-audit" },
    { l: "Audit Log",        p: "/audit-log" },
    { l: "404 Log",          p: "/admin/not-found-log" },
  ],
  "System": [
    { l: "Settings",     p: "/settings" },
    { l: "Facilities",   p: "/facilities" },
    { l: "GUI Editor",   p: "/gui-editor" },
    { l: "Notifications",p: "/notifications" },
  ],
  "Database": [
    { l: "DB Admin",   p: "/admin/database" },
  ],
  "Developer": [
    { l: "Webmaster",      p: "/webmaster" },
    { l: "Superadmin",     p: "/superadmin" },
    { l: "Changelog",      p: "/releases" },
    { l: "System Report",  p: "/reports/system-utilization" },
    { l: "Print Engine",   p: "/reports/print-engine" },
  ],
};

interface Props {
  /** Override the auto-detected page label */
  label?: string;
  /** Extra crumb segments */
  extra?: string[];
}

export default function AdminBreadcrumb({ label, extra }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  const crumb = ADMIN_CRUMBS[loc.pathname] ?? { section: "Admin", label: label ?? loc.pathname.split("/").pop() ?? "Page" };
  const section = crumb.section;
  const pageLabel = label ?? crumb.label;
  const sectionColor = SECTION_COLORS[section] ?? T.fgMuted;
  const siblings = SECTION_SIBLINGS[section] ?? [];

  return (
    <div style={{
      background: "#fff",
      borderBottom: `1px solid ${T.border}`,
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      flexShrink: 0,
    }}>
      {/* Breadcrumb path */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "8px 20px", overflowX: "auto" }}>
        <button onClick={() => nav("/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "none", border: "none", cursor: "pointer", color: T.fgMuted, fontSize: 12, borderRadius: 4, whiteSpace: "nowrap" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <Home size={12} /> Home
        </button>
        <ChevronRight size={12} color={T.fgMuted} style={{ flexShrink: 0 }} />
        <button onClick={() => nav("/admin")}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "none", border: "none", cursor: "pointer", color: T.fgMuted, fontSize: 12, borderRadius: 4, whiteSpace: "nowrap" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <LayoutGrid size={12} /> Admin Hub
        </button>
        {section && (
          <>
            <ChevronRight size={12} color={T.fgMuted} style={{ flexShrink: 0 }} />
            <span style={{ padding: "3px 8px", fontSize: 12, color: sectionColor, fontWeight: 600, whiteSpace: "nowrap" }}>
              {section}
            </span>
          </>
        )}
        <ChevronRight size={12} color={T.fgMuted} style={{ flexShrink: 0 }} />
        <span style={{ padding: "3px 8px", fontSize: 12, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap" }}>
          {pageLabel}
        </span>
        {(extra ?? []).map(e => (
          <span key={e} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <ChevronRight size={12} color={T.fgMuted} style={{ flexShrink: 0 }} />
            <span style={{ padding: "3px 8px", fontSize: 12, color: T.fgMuted, whiteSpace: "nowrap" }}>{e}</span>
          </span>
        ))}

        {/* Back button */}
        <div style={{ flex: 1 }} />
        <button onClick={() => nav("/admin")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", background: `${sectionColor}10`, border: `1px solid ${sectionColor}30`, borderRadius: 6, color: sectionColor, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = `${sectionColor}20`)}
          onMouseLeave={e => (e.currentTarget.style.background = `${sectionColor}10`)}>
          <ArrowLeft size={12} /> Back to Admin Hub
        </button>
      </div>

      {/* Section siblings quick-jump strip */}
      {siblings.length > 0 && (
        <div style={{ display: "flex", gap: 2, padding: "0 20px 6px", overflowX: "auto" }}>
          {siblings.map(s => {
            const active = loc.pathname === s.p;
            return (
              <button key={s.p} onClick={() => nav(s.p)}
                style={{ padding: "3px 10px", borderRadius: 5, border: `1px solid ${active ? sectionColor : T.border}`, background: active ? `${sectionColor}12` : "transparent", color: active ? sectionColor : T.fgMuted, fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all .1s" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#1a1a2e"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.fgMuted; } }}>
                {s.l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
