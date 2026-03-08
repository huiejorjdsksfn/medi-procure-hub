import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, RefreshCw, ArrowRight, Plus, Calendar,
  FileCheck, BookMarked, PiggyBank, Building2, ChevronRight,
  Home, Search, Mail, Award, Zap, ChevronDown, Receipt, Target
} from "lucide-react";

const fmtKES = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K`
  : `KES ${n.toFixed(0)}`;

const MODULE_TILES = [
  { label: "DASHBOARD",       path: "/dashboard",            icon: Home,          color: "#008B8B", bg: "#004d4d", group: "My Work" },
  { label: "REQUISITIONS",    path: "/requisitions",         icon: ClipboardList, color: "#0078d4", bg: "#003d80", group: "My Work" },
  { label: "PURCHASE ORDERS", path: "/purchase-orders",      icon: ShoppingCart,  color: "#107c10", bg: "#054205", group: "Procurement" },
  { label: "GOODS RECEIVED",  path: "/goods-received",       icon: Package,       color: "#e08000", bg: "#7a4400", group: "Procurement" },
  { label: "SUPPLIERS",       path: "/suppliers",            icon: Truck,         color: "#1F9090", bg: "#0a4f4f", group: "Procurement" },
  { label: "TENDERS",         path: "/tenders",              icon: Gavel,         color: "#8764b8", bg: "#3e1f73", group: "Procurement" },
  { label: "CONTRACTS",       path: "/contracts",            icon: FileCheck,     color: "#00b4b4", bg: "#005a5a", group: "Procurement" },
  { label: "VOUCHERS",        path: "/vouchers/payment",     icon: DollarSign,    color: "#d4a017", bg: "#5c3d00", group: "Finance" },
  { label: "FINANCIALS",      path: "/financials/dashboard", icon: BarChart3,     color: "#4da6ff", bg: "#003366", group: "Finance" },
  { label: "INVENTORY",       path: "/items",                icon: Building2,     color: "#78c950", bg: "#2a5200", group: "Operations" },
  { label: "QUALITY",         path: "/quality/dashboard",    icon: Shield,        color: "#ff8c42", bg: "#6b2800", group: "Operations" },
  { label: "PLANNING",        path: "/procurement-planning", icon: Calendar,      color: "#a78bfa", bg: "#3b2080", group: "Operations" },
  { label: "REPORTS",         path: "/reports",              icon: FileText,      color: "#94a3b8", bg: "#1e293b", group: "Reports" },
  { label: "DOCUMENTS",       path: "/documents",            icon: BookMarked,    color: "#64748b", bg: "#1e293b", group: "Reports" },
];

const ERP_INNER = [
  { label: "Vouchers",  icon: DollarSign, color: "#d4a017", path: "/vouchers/payment" },
  { label: "Suppliers", icon: Truck,      color: "#1F9090", path: "/suppliers" },
  { label: "Quality",   icon: Shield,     color: "#ff8c42", path: "/quality/dashboard" },
  { label: "Tenders",   icon: Gavel,      color: "#8764b8", path: "/tenders" },
  { label: "Contracts", icon: FileCheck,  color: "#00b4b4", path: "/contracts" },
  { label: "Planning",  icon: Calendar,   color: "#a78bfa", path: "/procurement-planning" },
];

const ERP_OUTER = [
  { label: "Reports & BI",    path: "/reports" },
  { label: "Audit Trail",     path: "/audit-log" },
  { label: "Documents",       path: "/documents" },
  { label: "Bid Evaluations", path: "/bid-evaluations" },
  { label: "Admin Panel",     path: "/admin/panel" },
  { label: "Settings",        path: "/settings" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: "rgba(254,243,199,0.9)", text: "#92400e" },
  approved: { bg: "rgba(209,250,229,0.9)", text: "#065f46" },
  rejected: { bg: "rgba(254,226,226,0.9)", text: "#991b1b" },
  draft:    { bg: "rgba(243,244,246,0.9)", text: "#374151" },
  active:   { bg: "rgba(219,234,254,0.9)", text: "#1e40af" },
  sent:     { bg: "rgba(237,233,254,0.9)", text: "#5b21b6" },
  paid:     { bg: "rgba(209,250,229,0.9)", text: "#065f46" },
  open:     { bg: "rgba(254,243,199,0.9)", text: "#92400e" },
};

const glass = {
  background: "rgba(8,20,55,0.80)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const glassLight = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.14)",
};

function ERPWheel({ navigate }: { navigate: (p: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cx = 155, cy = 155;
  const r_core = 50, r_inner = 98, r_outer = 138;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={310} height={310} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="cg2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a4a9b" />
            <stop offset="100%" stopColor="#050e28" />
          </radialGradient>
        </defs>

        {/* Outer ring */}
        {ERP_OUTER.map((item, i) => {
          const total = ERP_OUTER.length;
          const startA = (i / total) * 2 * Math.PI - Math.PI / 2;
          const endA   = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2;
          const r1 = r_inner + 4, r2 = r_outer;
          const x1 = cx + r1 * Math.cos(startA), y1 = cy + r1 * Math.sin(startA);
          const x2 = cx + r2 * Math.cos(startA), y2 = cy + r2 * Math.sin(startA);
          const x3 = cx + r2 * Math.cos(endA),   y3 = cy + r2 * Math.sin(endA);
          const x4 = cx + r1 * Math.cos(endA),   y4 = cy + r1 * Math.sin(endA);
          const midA = (startA + endA) / 2;
          const lx = cx + (r_inner + 24) * Math.cos(midA);
          const ly = cy + (r_inner + 24) * Math.sin(midA);
          const isHov = hovered === item.label;
          return (
            <g key={item.label} style={{ cursor: "pointer" }}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}>
              <path
                d={`M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1}`}
                fill={isHov ? "rgba(96,165,250,0.3)" : "rgba(15,40,100,0.6)"}
                stroke={isHov ? "rgba(96,165,250,0.6)" : "rgba(96,165,250,0.15)"}
                strokeWidth={isHov ? 1.5 : 0.5}
              />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 6.5, fill: isHov ? "#fff" : "rgba(255,255,255,0.55)", fontWeight: isHov ? 800 : 500, pointerEvents: "none", fontFamily: "Segoe UI, sans-serif" }}>
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Inner spokes + nodes */}
        {ERP_INNER.map((item, i) => {
          const total = ERP_INNER.length;
          const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
          const ix = cx + r_inner * Math.cos(angle);
          const iy = cy + r_inner * Math.sin(angle);
          const isHov = hovered === item.label;
          return (
            <g key={item.label} style={{ cursor: "pointer" }}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}>
              <line
                x1={cx + (r_core + 2) * Math.cos(angle)} y1={cy + (r_core + 2) * Math.sin(angle)}
                x2={ix - 15 * Math.cos(angle)} y2={iy - 15 * Math.sin(angle)}
                stroke={`${item.color}50`} strokeWidth={1} strokeDasharray="3,3" />
              <circle cx={ix} cy={iy} r={isHov ? 18 : 14}
                fill={isHov ? item.color : `${item.color}28`}
                stroke={item.color} strokeWidth={isHov ? 2 : 1}
                style={{ transition: "all 0.2s" }} />
              <text x={ix} y={iy + 1} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 7.5, fill: "#fff", fontWeight: 800, pointerEvents: "none", fontFamily: "Segoe UI, sans-serif" }}>
                {item.label.slice(0, 3).toUpperCase()}
              </text>
              {isHov && (
                <text x={ix} y={iy + 28} textAnchor="middle"
                  style={{ fontSize: 7.5, fill: "#fff", fontWeight: 700, pointerEvents: "none", fontFamily: "Segoe UI, sans-serif" }}>
                  {item.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Core */}
        <circle cx={cx} cy={cy} r={r_core + 10} fill="rgba(8,20,60,0.7)" stroke="rgba(96,165,250,0.18)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r_core} fill="url(#cg2)" stroke="rgba(96,165,250,0.55)" strokeWidth={2} />

        {/* Core text */}
        {[
          { label: "PROCU-", y: -18 },
          { label: "REMENT", y: -5 },
          { label: "HUB",    y: 12 },
        ].map(t => (
          <text key={t.label} x={cx} y={cy + t.y} textAnchor="middle"
            style={{ fontSize: 8, fill: "#93c5fd", fontWeight: 900, letterSpacing: "0.06em", pointerEvents: "none", fontFamily: "Segoe UI, sans-serif" }}>
            {t.label}
          </text>
        ))}

        {/* Center dot */}
        <circle cx={cx} cy={cy + 25} r={7} fill="rgba(96,165,250,0.25)" stroke="rgba(96,165,250,0.7)" strokeWidth={1} />
        <text x={cx} y={cy + 26} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 9, fill: "#60a5fa", pointerEvents: "none" }}>⚕</text>
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5, maxWidth: 290, marginTop: 4 }}>
        {["Analytics & BI", "Access Anywhere", "Office 365", "Outlook"].map(l => (
          <span key={l} style={{ fontSize: 8.5, color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "1px 5px" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "New Requisition",    path: "/requisitions",         icon: ClipboardList, color: "#0078d4" },
  { label: "Create PO",          path: "/purchase-orders",      icon: ShoppingCart,  color: "#107c10" },
  { label: "Record GRN",         path: "/goods-received",       icon: Package,       color: "#e08000" },
  { label: "Add Supplier",       path: "/suppliers",            icon: Truck,         color: "#1F9090" },
  { label: "Payment Voucher",    path: "/vouchers/payment",     icon: DollarSign,    color: "#d4a017" },
  { label: "Receipt Voucher",    path: "/vouchers/receipt",     icon: Receipt,       color: "#10b981" },
  { label: "New Tender",         path: "/tenders",              icon: Gavel,         color: "#8764b8" },
  { label: "Finance Dashboard",  path: "/financials/dashboard", icon: BarChart3,     color: "#4da6ff" },
  { label: "Quality Dashboard",  path: "/quality/dashboard",    icon: Shield,        color: "#ff8c42" },
  { label: "Scan Item",          path: "/scanner",              icon: Search,        color: "#78c950" },
  { label: "View Reports",       path: "/reports",              icon: FileText,      color: "#94a3b8" },
  { label: "Inbox",              path: "/inbox",                icon: Mail,          color: "#60a5fa" },
  { label: "Budgets",            path: "/financials/budgets",   icon: PiggyBank,     color: "#34d399" },
  { label: "Procurement Plan",   path: "/procurement-planning", icon: Calendar,      color: "#a78bfa" },
  { label: "Bid Evaluations",    path: "/bid-evaluations",      icon: Target,        color: "#f472b6" },
  { label: "Fixed Assets",       path: "/financials/fixed-assets", icon: Building2,  color: "#fb923c" },
];

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [recentReqs, setRecentReqs] = useState<any[]>([]);
  const [recentPOs,  setRecentPOs]  = useState<any[]>([]);
  const [recentGRNs, setRecentGRNs] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ reqs: 0, pos: 0, grns: 0, suppliers: 0, tenders: 0 });
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [hoveredTile,  setHoveredTile]  = useState<string | null>(null);
  const [hoveredQuick, setHoveredQuick] = useState<string | null>(null);
  const [activeGroup,  setActiveGroup]  = useState("My Work");
  const [tileGroup,    setTileGroup]    = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    const [rr, rp, rg, ss, kr, kp, kg, ks, kt] = await Promise.all([
      (supabase as any).from("requisitions").select("requisition_number,status,total_amount,requested_by_name,created_at").order("created_at",{ascending:false}).limit(10),
      (supabase as any).from("purchase_orders").select("po_number,status,total_amount,supplier_name,created_by_name,created_at").order("created_at",{ascending:false}).limit(10),
      (supabase as any).from("goods_received").select("grn_number,po_number,received_by_name,status,created_at").order("created_at",{ascending:false}).limit(10),
      (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"]),
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
      (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
      (supabase as any).from("goods_received").select("id",{count:"exact",head:true}),
      (supabase as any).from("suppliers").select("id",{count:"exact",head:true}),
      (supabase as any).from("tenders").select("id",{count:"exact",head:true}),
    ]);
    setRecentReqs(rr.data || []);
    setRecentPOs(rp.data || []);
    setRecentGRNs(rg.data || []);
    setKpis({ reqs: kr.count||0, pos: kp.count||0, grns: kg.count||0, suppliers: ks.count||0, tenders: kt.count||0 });
    const m: any = {};
    (ss.data || []).forEach((s: any) => { if (s.key) m[s.key] = s.value; });
    if (m.system_name)     setSysName(m.system_name);
    if (m.hospital_name)   setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const primaryRole = roles[0]?.replace(/_/g, " ") || "User";

  const groups = [
    { label: "My Work",     key: "My Work" },
    { label: "Procurement", key: "Procurement" },
    { label: "Deliveries",  key: "Deliveries" },
  ];

  const activeRows    = activeGroup === "My Work" ? recentReqs : activeGroup === "Procurement" ? recentPOs : recentGRNs;
  const pathForGroup: Record<string,string> = { "My Work": "/requisitions", "Procurement": "/purchase-orders", "Deliveries": "/goods-received" };

  const activeColumns = activeGroup === "My Work"
    ? [
        { key: "requisition_number", label: "Ref No.",       bold: true, color: "#0078d4" },
        { key: "requested_by_name",  label: "Requested By" },
        { key: "total_amount",       label: "Amount",        fmt: (v:any) => fmtKES(Number(v||0)) },
        { key: "status",             label: "Status",        badge: true },
        { key: "created_at",         label: "Date",          fmt: (v:any) => new Date(v).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}) },
      ]
    : activeGroup === "Procurement"
    ? [
        { key: "po_number",      label: "PO No.",     bold: true, color: "#107c10" },
        { key: "supplier_name",  label: "Supplier" },
        { key: "total_amount",   label: "Amount",     fmt: (v:any) => fmtKES(Number(v||0)) },
        { key: "status",         label: "Status",     badge: true },
        { key: "created_at",     label: "Date",       fmt: (v:any) => new Date(v).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}) },
      ]
    : [
        { key: "grn_number",       label: "GRN No.",    bold: true, color: "#e08000" },
        { key: "po_number",        label: "PO Ref." },
        { key: "received_by_name", label: "Received By" },
        { key: "status",           label: "Status",     badge: true },
        { key: "created_at",       label: "Date",       fmt: (v:any) => new Date(v).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}) },
      ];

  const tileGroups = ["All", "My Work", "Procurement", "Finance", "Operations", "Reports"];
  const visibleTiles = tileGroup === "All" ? MODULE_TILES : MODULE_TILES.filter(t => t.group === tileGroup);

  const kpiItems = [
    { label: "Requisitions",    value: kpis.reqs,      icon: ClipboardList, color: "#0078d4", path: "/requisitions" },
    { label: "Purchase Orders", value: kpis.pos,       icon: ShoppingCart,  color: "#107c10", path: "/purchase-orders" },
    { label: "GRNs Recorded",   value: kpis.grns,      icon: Package,       color: "#e08000", path: "/goods-received" },
    { label: "Suppliers",       value: kpis.suppliers, icon: Truck,         color: "#1F9090", path: "/suppliers" },
    { label: "Tenders",         value: kpis.tenders,   icon: Gavel,         color: "#8764b8", path: "/tenders" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", minHeight: "calc(100vh - 57px)" }}>

      {/* ── CRM MODULE TILE BAR ── */}
      <div style={{ background: "rgba(3,10,24,0.88)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
        {/* Group filter pills */}
        <div className="flex items-center gap-0 px-3 pt-2 pb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {tileGroups.map(g => (
            <button key={g} onClick={() => setTileGroup(g)}
              style={{
                padding: "4px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                color: tileGroup === g ? "#60a5fa" : "rgba(255,255,255,0.38)",
                borderBottom: tileGroup === g ? "2px solid #60a5fa" : "2px solid transparent",
                background: "transparent", border: "none", cursor: "pointer", textTransform: "uppercase",
              }}>
              {g}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.25)", paddingRight: 12 }}>{hospitalName}</span>
        </div>

        {/* Tiles */}
        <div style={{ overflowX: "auto", scrollbarWidth: "none" }}>
          <div className="flex items-stretch" style={{ minHeight: 90 }}>
            {visibleTiles.map((tile) => {
              const isHov = hoveredTile === tile.label;
              return (
                <button key={tile.label} onClick={() => navigate(tile.path)}
                  onMouseEnter={() => setHoveredTile(tile.label)}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 shrink-0 transition-all"
                  style={{
                    background: isHov ? `${tile.bg}dd` : "transparent",
                    borderBottom: `3px solid ${isHov ? tile.color : "transparent"}`,
                    borderTop: "3px solid transparent",
                    minWidth: 90,
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: isHov ? `${tile.color}45` : `${tile.color}22`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    <tile.icon style={{ width: 17, height: 17, color: tile.color }} />
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.07em", color: isHov ? "#fff" : "rgba(255,255,255,0.62)", textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {tile.label}
                  </span>
                  <ChevronDown style={{ width: 7, height: 7, color: isHov ? tile.color : "rgba(255,255,255,0.18)" }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── GROUP TABS + ACTIONS ── */}
      <div style={{ background: "rgba(5,14,38,0.85)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(4px)" }}>
        <div className="flex items-center px-4">
          {groups.map((g) => (
            <button key={g.key} onClick={() => setActiveGroup(g.key)}
              style={{
                padding: "10px 18px", fontSize: 12, fontWeight: 600,
                color: activeGroup === g.key ? "#60a5fa" : "rgba(255,255,255,0.5)",
                borderBottom: activeGroup === g.key ? "2px solid #60a5fa" : "2px solid transparent",
                background: "transparent", border: "none", cursor: "pointer",
              }}>
              {g.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pr-2 py-2">
            <button onClick={load} disabled={loading}
              style={{ background: "rgba(255,255,255,0.08)", color: "#93c5fd", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <RefreshCw style={{ width: 11, height: 11 }} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button onClick={() => navigate(pathForGroup[activeGroup])}
              style={{ background: "#0078d4", color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <Plus style={{ width: 11, height: 11 }} />
              New {activeGroup === "My Work" ? "Requisition" : activeGroup === "Procurement" ? "PO" : "GRN"}
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Welcome + KPI row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ ...glass, borderRadius: 12, padding: "14px 20px", flex: "1 1 260px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {logoUrl
                ? <img src={logoUrl} alt="" style={{ height: 42, objectFit: "contain", borderRadius: 8 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Award style={{ width: 20, height: 20, color: "#60a5fa" }} />
                  </div>
              }
              <div>
                <p style={{ color: "#fff", fontWeight: 900, fontSize: 14, margin: 0 }}>{hospitalName}</p>
                <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 9.5, margin: "2px 0 0" }}>
                  {sysName} · {profile?.full_name || "User"} · {primaryRole}
                </p>
                <div style={{ marginTop: 6, display: "flex", gap: 5 }}>
                  <span style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 4, fontSize: 8.5, padding: "1px 6px", color: "#6ee7b7", fontWeight: 700 }}>🟢 LIVE</span>
                  <span style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 4, fontSize: 8.5, padding: "1px 6px", color: "#93c5fd", fontWeight: 600 }}>FY {new Date().getFullYear()}/{new Date().getFullYear()+1}</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>{new Date().toLocaleDateString("en-KE",{weekday:"short",month:"long",day:"numeric"})}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 }}>{new Date().getFullYear()}</div>
            </div>
          </div>

          {kpiItems.map(k => (
            <button key={k.label} onClick={() => navigate(k.path)}
              style={{ ...glassLight, borderRadius: 10, padding: "12px 16px", flex: "0 0 auto", minWidth: 96, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${k.color}25`; (e.currentTarget as HTMLElement).style.borderColor = `${k.color}55`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = glassLight.background; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)"; }}>
              <k.icon style={{ width: 15, height: 15, color: k.color, marginBottom: 5 }} />
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{loading ? "—" : k.value}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </button>
          ))}
        </div>

        {/* Middle row: Table + Wheel */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

          {/* Activities Table */}
          <div style={{ ...glass, borderRadius: 12, overflow: "hidden", flex: "1 1 0", minWidth: 0 }}>
            <div style={{ padding: "10px 16px", background: "rgba(8,30,80,0.95)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{activeGroup}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                  · {activeGroup==="My Work" ? "Recent Requisitions" : activeGroup==="Procurement" ? "Purchase Orders" : "Goods Received"}
                </span>
              </div>
              <button onClick={() => navigate(pathForGroup[activeGroup])}
                style={{ color: "#60a5fa", background: "none", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                View all <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(10,28,72,0.7)" }}>
                  {activeColumns.map(col => (
                    <th key={col.key} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: "rgba(255,255,255,0.45)", fontSize: 9, borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {col.label}
                    </th>
                  ))}
                  <th style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}><td colSpan={activeColumns.length+1} style={{ padding: "10px 14px" }}>
                      <div style={{ height: 9, borderRadius: 3, background: "rgba(255,255,255,0.06)" }} />
                    </td></tr>
                  ))
                ) : activeRows.length === 0 ? (
                  <tr><td colSpan={activeColumns.length+1} style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                    No records — <button onClick={() => navigate(pathForGroup[activeGroup])} style={{ color: "#60a5fa", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Create one →</button>
                  </td></tr>
                ) : (
                  activeRows.map((row, i) => (
                    <tr key={i} onClick={() => navigate(pathForGroup[activeGroup])}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i%2===0 ? "rgba(255,255,255,0.015)" : "transparent", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(96,165,250,0.07)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i%2===0 ? "rgba(255,255,255,0.015)" : "transparent"}>
                      {activeColumns.map(col => {
                        const val = row[col.key];
                        if ((col as any).badge && val) {
                          const sc = STATUS_COLORS[val] || { bg: "rgba(243,244,246,0.9)", text: "#6b7280" };
                          return <td key={col.key} style={{ padding: "8px 14px" }}>
                            <span style={{ background: sc.bg, color: sc.text, padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "capitalize" }}>{val}</span>
                          </td>;
                        }
                        return <td key={col.key} style={{ padding: "8px 14px", color: (col as any).bold ? (col as any).color||"#60a5fa" : "rgba(255,255,255,0.75)", fontWeight: (col as any).bold ? 700 : 400, fontSize: 11.5 }}>
                          {(col as any).fmt ? (col as any).fmt(val) : (val || "—")}
                        </td>;
                      })}
                      <td style={{ padding: "8px 14px" }}><ChevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.18)" }} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ERP Wheel */}
          <div style={{ ...glass, borderRadius: 12, padding: "16px 12px 12px", width: 316, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>
              ERP Ecosystem
            </div>
            <ERPWheel navigate={navigate} />
            <p style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>Click any node to navigate</p>
          </div>
        </div>

        {/* ── QUICK ACTIONS TOOLBAR ── */}
        <div style={{ ...glass, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "rgba(8,30,80,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
            <Zap style={{ width: 14, height: 14, color: "#fbbf24" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Quick Actions</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>— one-click navigation to all modules</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(138px,1fr))", background: "rgba(255,255,255,0.03)" }}>
            {QUICK_ACTIONS.map((action) => {
              const isHov = hoveredQuick === action.label;
              return (
                <button key={action.label} onClick={() => navigate(action.path)}
                  onMouseEnter={() => setHoveredQuick(action.label)}
                  onMouseLeave={() => setHoveredQuick(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "13px 15px",
                    background: isHov ? `${action.color}18` : "transparent",
                    border: "none", borderRight: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: isHov ? `${action.color}35` : `${action.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${isHov ? action.color+"55" : "transparent"}` }}>
                    <action.icon style={{ width: 14, height: 14, color: action.color }} />
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: isHov ? "#fff" : "rgba(255,255,255,0.62)", lineHeight: 1.3 }}>
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
