import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, X, LogOut, User,
  TrendingUp, Package, FileText, DollarSign,
  AlertTriangle, CheckCircle, Clock, ShoppingCart,
  Gavel, Shield, BarChart2, Mail, BookOpen, Archive
} from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import { useSystemSettings } from "@/hooks/useSystemSettings";

/* ── Polar helpers ─────────────────────────────────────────── */
const P = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arc = (cx: number, cy: number, OR: number, IR: number, s: number, e: number, gap = 5) => {
  const sa = s + gap / 2, ea = e - gap / 2;
  const o1 = P(cx, cy, OR, sa), o2 = P(cx, cy, OR, ea);
  const i1 = P(cx, cy, IR, ea), i2 = P(cx, cy, IR, sa);
  const lg = ea - sa > 180 ? 1 : 0;
  return `M${o1.x},${o1.y} A${OR},${OR} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${IR},${IR} 0 ${lg},0 ${i2.x},${i2.y} Z`;
};

/* ── Role-based access map ─────────────────────────────────── */
const ROLE_ACCESS: Record<string, string[]> = {
  admin:               ["procurement", "finance", "operations"],
  procurement_manager: ["procurement", "finance", "operations"],
  procurement_officer: ["procurement", "operations"],
  inventory_manager:   ["operations", "procurement"],
  warehouse_officer:   ["operations"],
  requisitioner:       ["procurement"],
};

type Link = { label: string; path: string; roles?: string[] };
type Seg  = { id: string; label: string; sub: string; g1: string; g2: string; g3: string; glow: string; start: number; end: number; links: Link[] };

const SEGS: Seg[] = [
  {
    id: "procurement", label: "PROCUREMENT", sub: "Ordering & Sourcing",
    g1: "#1a6bb5", g2: "#0d4a87", g3: "#5ba0d4", glow: "#3b82f680",
    start: 0, end: 120,
    links: [
      { label: "Requisitions",        path: "/requisitions",         roles: ["admin","procurement_manager","procurement_officer","requisitioner"] },
      { label: "Purchase Orders",      path: "/purchase-orders",      roles: ["admin","procurement_manager","procurement_officer"] },
      { label: "Goods Received",       path: "/goods-received",       roles: ["admin","procurement_manager","procurement_officer","warehouse_officer"] },
      { label: "Suppliers",            path: "/suppliers",            roles: ["admin","procurement_manager","procurement_officer"] },
      { label: "Tenders",              path: "/tenders",              roles: ["admin","procurement_manager"] },
      { label: "Contracts",            path: "/contracts",            roles: ["admin","procurement_manager"] },
      { label: "Bid Evaluations",      path: "/bid-evaluations",      roles: ["admin","procurement_manager"] },
      { label: "Procurement Planning", path: "/procurement-planning", roles: ["admin","procurement_manager"] },
    ],
  },
  {
    id: "finance", label: "FINANCE", sub: "Accounts & Budgeting",
    g1: "#0e7a6e", g2: "#065f52", g3: "#2aaa97", glow: "#10b98180",
    start: 120, end: 240,
    links: [
      { label: "Financial Dashboard", path: "/financials/dashboard",        roles: ["admin","procurement_manager"] },
      { label: "Payment Vouchers",    path: "/vouchers/payment",            roles: ["admin","procurement_manager","procurement_officer"] },
      { label: "Journal Vouchers",    path: "/vouchers/journal",            roles: ["admin","procurement_manager"] },
      { label: "Purchase Vouchers",   path: "/vouchers/purchase",           roles: ["admin","procurement_manager","procurement_officer"] },
      { label: "Receipt Vouchers",    path: "/vouchers/receipt",            roles: ["admin","procurement_manager"] },
      { label: "Budgets",             path: "/financials/budgets",          roles: ["admin","procurement_manager"] },
      { label: "Chart of Accounts",   path: "/financials/chart-of-accounts",roles: ["admin","procurement_manager"] },
      { label: "Fixed Assets",        path: "/financials/fixed-assets",     roles: ["admin","procurement_manager"] },
    ],
  },
  {
    id: "operations", label: "OPERATIONS", sub: "Inventory & Quality",
    g1: "#7c3aed", g2: "#5b21b6", g3: "#a855f7", glow: "#8b5cf680",
    start: 240, end: 360,
    links: [
      { label: "Inventory / Items",  path: "/items",                   roles: ["admin","inventory_manager","warehouse_officer","procurement_manager"] },
      { label: "Categories",         path: "/categories",              roles: ["admin","inventory_manager","procurement_manager"] },
      { label: "Departments",        path: "/departments",             roles: ["admin","procurement_manager"] },
      { label: "Barcode Scanner",    path: "/scanner",                 roles: ["admin","inventory_manager","warehouse_officer"] },
      { label: "Quality Dashboard",  path: "/quality/dashboard",       roles: ["admin","procurement_manager","inventory_manager"] },
      { label: "QC Inspections",     path: "/quality/inspections",     roles: ["admin","procurement_manager","inventory_manager","warehouse_officer"] },
      { label: "Non-Conformance",    path: "/quality/non-conformance", roles: ["admin","procurement_manager","inventory_manager"] },
      { label: "Reports",            path: "/reports",                 roles: ["admin","procurement_manager","procurement_officer","inventory_manager"] },
    ],
  },
];

const ALL_QUICK = [
  { label: "Requisitions", path: "/requisitions",   roles: [] as string[] },
  { label: "Reports",      path: "/reports",         roles: ["admin","procurement_manager","procurement_officer"] },
  { label: "Mail",         path: "/email",            roles: [] },
  { label: "Documents",    path: "/documents",        roles: [] },
  { label: "Audit Log",    path: "/audit-log",        roles: ["admin","procurement_manager"] },
  { label: "Users",        path: "/users",            roles: ["admin"] },
  { label: "Admin",        path: "/admin/panel",      roles: ["admin"] },
  { label: "Settings",     path: "/settings",         roles: ["admin"] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator", procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer", inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer", requisitioner: "Requisitioner",
};

const fmtK = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);

const CX = 270, CY = 270, OR = 210, IR = 92;

export default function DashboardPage() {
  const nav = useNavigate();
  const { profile, roles, primaryRole, signOut } = useAuth() as any;
  const [active, setActive] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const [clock, setClock] = useState("");
  const [kpi, setKpi] = useState({ reqs: 0, pos: 0, pendPV: 0, lowStock: 0, openNCR: 0, contracts: 0 });
  const [greeting, setGreeting] = useState("");
  const { get: getSetting } = useSystemSettings();
  const sysName  = getSetting("system_name", "EL5 MediProcure");
  const hospital = getSetting("hospital_name", "Embu Level 5 Hospital");
  const logoUrl  = getSetting("logo_url") || getSetting("system_logo_url") || null;

  /* clock */
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening");
    const tick = () => setClock(new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  /* live KPIs — initial load */
  const loadKpi = async () => {
    try {
      const [r, p, pv, ls, ncr, c] = await Promise.all([
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
        (supabase as any).from("payment_vouchers").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("items").select("id", { count: "exact", head: true }).lt("quantity_in_stock", 20),
        (supabase as any).from("non_conformance").select("id", { count: "exact", head: true }).eq("status", "open"),
        (supabase as any).from("contracts").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setKpi({ reqs: r.count || 0, pos: p.count || 0, pendPV: pv.count || 0, lowStock: ls.count || 0, openNCR: ncr.count || 0, contracts: c.count || 0 });
    } catch { /* silent */ }
  };

  useEffect(() => { loadKpi(); }, []);

  /* Real-time KPI refresh — listen to all key tables */
  useEffect(() => {
    const ch = (supabase as any).channel("dashboard-kpi-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "requisitions" },       () => loadKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" },    () => loadKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_vouchers" },   () => loadKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "items" },              () => loadKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "non_conformance" },    () => loadKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" },          () => loadKpi())
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, []);

  const accessedSegs = ROLE_ACCESS[primaryRole || "requisitioner"] || ["procurement"];
  const segActive = (s: Seg) => accessedSegs.includes(s.id);
  const seg = SEGS.find(s => s.id === active);
  const openSeg = (id: string) => {
    if (!segActive(SEGS.find(s => s.id === id)!)) return;
    setActive(a => a === id ? null : id);
  };
  const visLinks = (s: Seg) => s.links.filter(lk => !lk.roles || lk.roles.some(r => roles?.includes(r)));
  const QUICK = ALL_QUICK.filter(lk => !lk.roles.length || lk.roles.some(r => roles?.includes(r)));

  /* KPI tile data */
  const KPI_TILES = [
    { icon: <FileText style={{ width: 20, height: 20 }} />,   label: "Pending Requisitions",  val: kpi.reqs,      col: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)", path: "/requisitions" },
    { icon: <ShoppingCart style={{ width: 20, height: 20 }}/>, label: "Open Purchase Orders",  val: kpi.pos,       col: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.35)", path: "/purchase-orders" },
    { icon: <DollarSign style={{ width: 20, height: 20 }} />,  label: "Pending Vouchers",      val: kpi.pendPV,    col: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)", path: "/vouchers/payment" },
    { icon: <AlertTriangle style={{ width: 20, height: 20 }}/>,label: "Low Stock Items",        val: kpi.lowStock,  col: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)",  path: "/items" },
    { icon: <Shield style={{ width: 20, height: 20 }} />,      label: "Open Non-Conformance",  val: kpi.openNCR,   col: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)", path: "/quality/non-conformance" },
    { icon: <CheckCircle style={{ width: 20, height: 20 }} />, label: "Active Contracts",       val: kpi.contracts, col: "#06b6d4", bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.35)",  path: "/contracts" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes ringPulse { 0%,100%{opacity:0.25} 50%{opacity:0.6} }
        @keyframes kpiPulse { 0%{box-shadow:0 0 0 0 rgba(255,255,255,0.12)} 70%{box-shadow:0 0 0 6px rgba(255,255,255,0)} 100%{box-shadow:0 0 0 0 rgba(255,255,255,0)} }
        .seg-btn { cursor: pointer; transition: filter 0.2s; }
        .seg-btn:hover { filter: brightness(1.18); }
        .qk-btn { padding: 5px 14px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05);
          cursor: pointer; font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,0.68); white-space: nowrap; transition: all 0.15s; }
        .qk-btn:hover { background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.3); }
        .panel-link { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 9px;
          border: none; background: transparent; cursor: pointer; text-align: left; margin-bottom: 2px; transition: background 0.12s; }
        .kpi-tile { transition: all 0.18s; cursor: pointer; }
        .kpi-tile:hover { transform: translateY(-2px); filter: brightness(1.1); }
      `}</style>

      {/* ── BACKGROUND ── */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${procBg})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.28)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(4,16,52,0.88) 0%,rgba(0,0,0,0.68) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* ── TOP BAR ── */}
      <div style={{ position: "relative", zIndex: 100, height: 50, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 20px", background: "rgba(0,0,0,0.58)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <img src={logoUrl || logoImg} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "contain", background: "rgba(255,255,255,0.08)", padding: 3 }} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{sysName}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", marginTop: 2, letterSpacing: "0.04em" }}>{hospital}</div>
          </div>
        </div>

        {/* Clock */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", fontVariantNumeric: "tabular-nums", marginRight: 14 }}>{clock}</div>

        {/* Live alert pills */}
        <div style={{ display: "flex", gap: 6, marginRight: 10 }}>
          {kpi.reqs > 0 && <div style={{ padding: "2px 9px", borderRadius: 20, background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.4)", fontSize: 9.5, fontWeight: 700, color: "#fcd34d" }}>{kpi.reqs} Pending</div>}
          {kpi.lowStock > 0 && <div style={{ padding: "2px 9px", borderRadius: 20, background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", fontSize: 9.5, fontWeight: 700, color: "#fca5a5" }}>{kpi.lowStock} Low Stock</div>}
        </div>

        {/* Role badge */}
        <div style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.62)", marginRight: 8 }}>
          {ROLE_LABELS[primaryRole || roles?.[0]] || "Staff"}
        </div>

        {/* Actions — Mail + Profile + Logout (NO notification bell) */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button onClick={() => nav("/email")} title="Mail"
            style={{ padding: "5px 8px", borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", lineHeight: 0, display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Mail style={{ width: 15, height: 15 }} />
          </button>
          <button onClick={() => nav("/profile")} title="Profile"
            style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", lineHeight: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <User style={{ width: 15, height: 15 }} />
          </button>
          <button onClick={() => { signOut(); nav("/login"); }} title="Sign Out"
            style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", lineHeight: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── WHEEL STAGE ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 0 }}>

          {/* Greeting overlay (when no panel) */}
          {!active && (
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none", zIndex: 10 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", letterSpacing: "0.05em" }}>
                {greeting}, <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>{profile?.full_name?.split(" ")[0] || "Staff"}</span>
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2, letterSpacing: "0.04em" }}>Click a segment to navigate</div>
            </div>
          )}

          <svg width={540} height={540} viewBox="0 0 540 540"
            style={{ filter: "drop-shadow(0 10px 36px rgba(0,0,0,0.65))", overflow: "visible", flexShrink: 0 }}>
            <defs>
              {SEGS.map(s => (
                <radialGradient key={s.id} id={`grad-${s.id}`} cx="50%" cy="50%" r="55%" fx="35%" fy="35%">
                  <stop offset="0%" stopColor={s.g3} />
                  <stop offset="50%" stopColor={s.g1} />
                  <stop offset="100%" stopColor={s.g2} />
                </radialGradient>
              ))}
              <radialGradient id="grad-center" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="45%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
              <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Outer halo ring */}
            <circle cx={CX} cy={CY} r={OR + 22} fill="none"
              stroke="rgba(255,255,255,0.04)" strokeWidth={20}
              style={{ animation: "ringPulse 3.5s ease-in-out infinite" }} />
            <circle cx={CX} cy={CY} r={OR + 22} fill="none"
              stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

            {/* ── MAIN SEGMENTS ── */}
            {SEGS.map(s => {
              const isActive = active === s.id;
              const isHov = hov === s.id;
              const hasAccess = segActive(s);
              const scale = isActive ? 1.05 : isHov && hasAccess ? 1.025 : 1;
              const mid = (s.start + s.end) / 2;
              const labelR = (OR + IR) / 2 + 6;
              const lp = P(CX, CY, labelR, mid);
              const subR = labelR - 24;
              const sp = P(CX, CY, subR, mid);

              return (
                <g key={s.id}
                  onClick={() => openSeg(s.id)}
                  onMouseEnter={() => setHov(s.id)}
                  onMouseLeave={() => setHov(null)}
                  className={hasAccess ? "seg-btn" : ""}
                  style={{
                    opacity: hasAccess ? 1 : 0.3,
                    transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
                    transform: `scale(${scale})`,
                    transformOrigin: `${CX}px ${CY}px`,
                  }}>

                  {/* Active glow */}
                  {isActive && (
                    <path d={arc(CX, CY, OR + 5, IR - 5, s.start, s.end, 3)}
                      fill={s.glow} filter="url(#glow2)" />
                  )}

                  {/* Main fill */}
                  <path d={arc(CX, CY, OR, IR, s.start, s.end)}
                    fill={isActive ? s.g3 : `url(#grad-${s.id})`}
                    stroke={isActive ? "rgba(255,255,255,0.6)" : isHov ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}
                    strokeWidth={isActive ? 2 : 1} />

                  {/* Inner highlight */}
                  <path d={arc(CX, CY, OR, OR - 18, s.start, s.end, 3)}
                    fill="rgba(255,255,255,0.08)" />

                  {/* Label */}
                  {s.label.split(" ").map((word, wi, arr) => (
                    <text key={wi} x={lp.x} y={lp.y + (wi - (arr.length - 1) / 2) * 15}
                      textAnchor="middle" dominantBaseline="central"
                      fill={isActive ? "#fff" : "rgba(255,255,255,0.92)"}
                      fontSize={11.5} fontWeight={900} letterSpacing={2}
                      style={{ pointerEvents: "none", userSelect: "none", textShadow: "0 2px 8px rgba(0,0,0,0.85)", filter: isActive ? "drop-shadow(0 0 5px rgba(255,255,255,0.7))" : "none" }}>
                      {word}
                    </text>
                  ))}

                  {/* Subtitle */}
                  <text x={sp.x} y={sp.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill={isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)"}
                    fontSize={7} fontWeight={500} letterSpacing={0.5}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {s.sub}
                  </text>

                  {/* Module count */}
                  {hasAccess && (() => {
                    const bp = P(CX, CY, OR - 30, mid);
                    return (
                      <g>
                        <circle cx={bp.x} cy={bp.y} r={11}
                          fill={isActive ? s.g3 : s.g2}
                          stroke="rgba(255,255,255,0.28)" strokeWidth={1} />
                        <text x={bp.x} y={bp.y} textAnchor="middle" dominantBaseline="central"
                          fill="#fff" fontSize={8} fontWeight={800}
                          style={{ pointerEvents: "none" }}>
                          {visLinks(s).length}
                        </text>
                      </g>
                    );
                  })()}

                  {/* Edge dots when active */}
                  {isActive && [s.start, s.end].map((deg, di) => {
                    const tp = P(CX, CY, OR + 6, deg);
                    return <circle key={di} cx={tp.x} cy={tp.y} r={4}
                      fill={s.g3} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />;
                  })}
                </g>
              );
            })}

            {/* ── CENTER DISK ── */}
            <circle cx={CX} cy={CY} r={IR + 2} fill="rgba(0,0,0,0.52)"
              stroke="rgba(255,215,0,0.18)" strokeWidth={2}
              style={{ animation: "ringPulse 2.8s ease-in-out infinite" }} />
            <circle cx={CX} cy={CY} r={IR - 4} fill="url(#grad-center)"
              stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />
            <circle cx={CX} cy={CY} r={IR - 18} fill="none"
              stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} strokeDasharray="4 3" />

            {/* Logo in center */}
            <image href={logoImg} x={CX - 24} y={CY - 36} width={48} height={48}
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />

            <text x={CX} y={CY + 22} textAnchor="middle" fill="rgba(255,255,255,0.9)"
              fontSize={6} fontWeight={800} letterSpacing={1.5}
              style={{ pointerEvents: "none" }}>
              {sysName.toUpperCase()}
            </text>
            <text x={CX} y={CY + 32} textAnchor="middle" fill="rgba(255,255,255,0.38)"
              fontSize={5} letterSpacing={0.8}
              style={{ pointerEvents: "none" }}>
              EMBU LEVEL 5 HOSPITAL
            </text>

            {/* LIVE dot */}
            <circle cx={CX - 5} cy={CY + 43} r={3} fill="#ef4444"
              style={{ animation: "pulse 2s ease-in-out infinite" }} />
            <text x={CX + 3} y={CY + 43} dominantBaseline="central"
              fill="rgba(255,255,255,0.45)" fontSize={6} fontWeight={700}
              style={{ pointerEvents: "none" }}>LIVE</text>
          </svg>

          {/* ── SLIDE-IN PANEL ── */}
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0,
            width: seg && active ? 295 : 0,
            background: "rgba(6,14,42,0.95)",
            backdropFilter: "blur(22px)",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
            zIndex: 50,
          }}>
            {seg && active && (
              <div style={{ width: 295, padding: "14px 0", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "0 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{seg.sub}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginTop: 2 }}>{seg.label}</div>
                    <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{visLinks(seg).length} accessible modules</div>
                  </div>
                  <button onClick={() => setActive(null)}
                    style={{ padding: 6, borderRadius: 7, background: "rgba(255,255,255,0.07)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", lineHeight: 0 }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <div style={{ height: 2, background: `linear-gradient(90deg,${seg.g1},${seg.g3},transparent)`, opacity: 0.65 }} />
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {visLinks(seg).map(lk => (
                    <button key={lk.path} onClick={() => nav(lk.path)}
                      className="panel-link"
                      onMouseEnter={e => (e.currentTarget.style.background = `${seg.g2}55`)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: seg.g3, flexShrink: 0, boxShadow: `0 0 5px ${seg.glow}` }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>{lk.label}</span>
                      <ChevronRight style={{ width: 11, height: 11, color: "rgba(255,255,255,0.22)" }} />
                    </button>
                  ))}
                </div>
                <div style={{ padding: "7px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 8.5, color: "rgba(255,255,255,0.18)", textAlign: "center" }}>
                  Role: {ROLE_LABELS[primaryRole] || "Staff"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── D365-STYLE KPI TILES ── */}
        <div style={{ position: "relative", zIndex: 80, padding: "8px 16px", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
            {KPI_TILES.map((tile, i) => (
              <button key={i} onClick={() => nav(tile.path)}
                className="kpi-tile"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "10px 6px", borderRadius: 10,
                  background: tile.bg,
                  border: `1px solid ${tile.border}`,
                  cursor: "pointer", minHeight: 72,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${tile.bg.replace("0.12", "0.22")}`)}
                onMouseLeave={e => (e.currentTarget.style.background = tile.bg)}>
                <span style={{ color: tile.col, marginBottom: 4 }}>{tile.icon}</span>
                <div style={{ fontSize: 22, fontWeight: 900, color: tile.col, lineHeight: 1 }}>{fmtK(tile.val)}</div>
                <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.45)", marginTop: 4, textAlign: "center", lineHeight: 1.3 }}>{tile.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── QUICK LINKS BAR ── */}
        <div style={{ position: "relative", zIndex: 100, height: 44, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, paddingBottom: 2, flexShrink: 0 }}>
          {QUICK.map(lk => (
            <button key={lk.path} onClick={() => nav(lk.path)} className="qk-btn">{lk.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
