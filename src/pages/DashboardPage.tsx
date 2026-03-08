import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, RefreshCw, ArrowRight, Plus, Calendar,
  FileCheck, BookMarked, PiggyBank, Building2, ChevronRight
} from "lucide-react";

const fmtKES = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K`
  : `KES ${n.toFixed(0)}`;

const MODULE_TILES = [
  { label: "REQUISITIONS",     path: "/requisitions",          icon: ClipboardList, color: "#0078d4", bg: "#003d80" },
  { label: "PURCHASE ORDERS",  path: "/purchase-orders",       icon: ShoppingCart,  color: "#107c10", bg: "#054205" },
  { label: "GOODS RECEIVED",   path: "/goods-received",        icon: Package,       color: "#e08000", bg: "#7a4400" },
  { label: "SUPPLIERS",        path: "/suppliers",             icon: Truck,         color: "#1F9090", bg: "#0a4f4f" },
  { label: "TENDERS",          path: "/tenders",               icon: Gavel,         color: "#8764b8", bg: "#3e1f73" },
  { label: "CONTRACTS",        path: "/contracts",             icon: FileCheck,     color: "#00b4b4", bg: "#005a5a" },
  { label: "VOUCHERS",         path: "/vouchers/payment",      icon: DollarSign,    color: "#d4a017", bg: "#5c3d00" },
  { label: "FINANCIALS",       path: "/financials/dashboard",  icon: BarChart3,     color: "#4da6ff", bg: "#003366" },
  { label: "INVENTORY",        path: "/items",                 icon: Building2,     color: "#78c950", bg: "#2a5200" },
  { label: "QUALITY",          path: "/quality/dashboard",     icon: Shield,        color: "#ff8c42", bg: "#6b2800" },
  { label: "PLANNING",         path: "/procurement-planning",  icon: Calendar,      color: "#a78bfa", bg: "#3b2080" },
  { label: "REPORTS",          path: "/reports",               icon: FileText,      color: "#94a3b8", bg: "#1e293b" },
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

// Glassmorphism card style
const glass = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.3)",
};

const glassHeader = {
  background: "rgba(10,37,88,0.85)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [recentReqs, setRecentReqs] = useState<any[]>([]);
  const [recentPOs,  setRecentPOs]  = useState<any[]>([]);
  const [recentGRNs, setRecentGRNs] = useState<any[]>([]);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [hoveredTile,  setHoveredTile]  = useState<string | null>(null);
  const [activeGroup,  setActiveGroup]  = useState<string>("My Work");

  const load = useCallback(async () => {
    setLoading(true);
    const [rr, rp, rg, ss] = await Promise.all([
      (supabase as any).from("requisitions").select("requisition_number,status,total_amount,requested_by_name,created_at").order("created_at",{ascending:false}).limit(8),
      (supabase as any).from("purchase_orders").select("po_number,status,total_amount,supplier_name,created_by_name,created_at").order("created_at",{ascending:false}).limit(8),
      (supabase as any).from("goods_received").select("grn_number,po_number,received_by_name,status,created_at").order("created_at",{ascending:false}).limit(8),
      (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"]),
    ]);
    setRecentReqs(rr.data || []);
    setRecentPOs(rp.data || []);
    setRecentGRNs(rg.data || []);
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

  const activeRows = activeGroup === "My Work" ? recentReqs
    : activeGroup === "Procurement" ? recentPOs : recentGRNs;

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

  const pathForGroup: Record<string,string> = {
    "My Work":     "/requisitions",
    "Procurement": "/purchase-orders",
    "Deliveries":  "/goods-received",
  };

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", minHeight: "calc(100vh - 57px)", padding: "0" }}>

      {/* ── CRM MODULE TILES ── */}
      <div style={{ background: "rgba(5,15,35,0.75)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(4px)", overflowX: "auto" }}>
        <div className="flex items-stretch" style={{ minHeight: 80 }}>
          {MODULE_TILES.map((tile) => {
            const isHov = hoveredTile === tile.label;
            return (
              <button
                key={tile.label}
                onClick={() => navigate(tile.path)}
                onMouseEnter={() => setHoveredTile(tile.label)}
                onMouseLeave={() => setHoveredTile(null)}
                className="flex flex-col items-center justify-center gap-1.5 px-4 shrink-0 transition-all"
                style={{
                  background: isHov ? tile.bg : "transparent",
                  borderBottom: `3px solid ${isHov ? tile.color : "transparent"}`,
                  minWidth: 82,
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="w-8 h-8 rounded flex items-center justify-center transition-all"
                  style={{ background: isHov ? `${tile.color}30` : `${tile.color}18` }}>
                  <tile.icon style={{ width: 17, height: 17, color: tile.color }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", color: isHov ? "#fff" : "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.2 }}>
                  {tile.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GROUP TABS ── */}
      <div style={{ background: "rgba(5,15,35,0.7)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(4px)" }}>
        <div className="flex items-center px-4">
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              style={{
                padding: "10px 18px",
                fontSize: 12,
                fontWeight: 600,
                color: activeGroup === g.key ? "#60a5fa" : "rgba(255,255,255,0.55)",
                borderBottom: activeGroup === g.key ? "2px solid #60a5fa" : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderBottom: activeGroup === g.key ? "2px solid #60a5fa" : "2px solid transparent",
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              {g.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pr-2 py-2">
            <button
              onClick={load}
              disabled={loading}
              style={{ background: "rgba(255,255,255,0.1)", color: "#93c5fd", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <RefreshCw style={{ width: 11, height: 11 }} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => navigate(pathForGroup[activeGroup])}
              style={{ background: "#0078d4", color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Plus style={{ width: 11, height: 11 }} />
              New {activeGroup === "My Work" ? "Requisition" : activeGroup === "Procurement" ? "PO" : "GRN"}
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Welcome strip */}
        <div style={{ ...glassHeader, borderRadius: 10, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 36, objectFit: "contain", borderRadius: 6 }} />}
            <div>
              <p style={{ color: "#fff", fontWeight: 900, fontSize: 15, margin: 0, lineHeight: 1 }}>{hospitalName}</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, margin: "3px 0 0" }}>
                {sysName} · {profile?.full_name || "User"} · {primaryRole}
              </p>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
              {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* ── ACTIVITIES TABLE ── */}
        <div style={{ ...glass, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          <div style={{ padding: "10px 16px", background: "rgba(10,37,88,0.9)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{activeGroup}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                · {activeGroup === "My Work" ? "Recent Requisitions" : activeGroup === "Procurement" ? "Recent Purchase Orders" : "Recent Goods Received"}
              </span>
            </div>
            <button
              onClick={() => navigate(pathForGroup[activeGroup])}
              style={{ color: "#60a5fa", background: "none", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              View all <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </div>

          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(15,30,70,0.5)" }}>
                {activeColumns.map((col) => (
                  <th key={col.key} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 700, color: "rgba(255,255,255,0.6)", fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeColumns.length + 1} style={{ padding: "28px", textAlign: "center" }}>
                  <RefreshCw style={{ width: 16, height: 16, color: "#60a5fa", margin: "0 auto", animation: "spin 1s linear infinite" }} />
                </td></tr>
              ) : activeRows.length === 0 ? (
                <tr><td colSpan={activeColumns.length + 1} style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No records found</td></tr>
              ) : (
                activeRows.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate(pathForGroup[activeGroup])}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(96,165,250,0.08)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"}
                  >
                    {activeColumns.map((col) => {
                      const val = row[col.key];
                      if ((col as any).badge && val) {
                        const sc = STATUS_COLORS[val] || { bg: "rgba(243,244,246,0.9)", text: "#6b7280" };
                        return (
                          <td key={col.key} style={{ padding: "9px 16px" }}>
                            <span style={{ background: sc.bg, color: sc.text, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "capitalize" }}>{val}</span>
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} style={{ padding: "9px 16px", color: (col as any).bold ? (col as any).color || "#60a5fa" : "rgba(255,255,255,0.8)", fontWeight: (col as any).bold ? 700 : 400, fontSize: 12 }}>
                          {(col as any).fmt ? (col as any).fmt(val) : (val || "—")}
                        </td>
                      );
                    })}
                    <td style={{ padding: "9px 16px" }}><ChevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.2)" }} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── QUICK LINKS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            {
              title: "Procurement", color: "#0078d4",
              links: [
                { label: "New Requisition",      path: "/requisitions",    icon: ClipboardList },
                { label: "Create Purchase Order", path: "/purchase-orders", icon: ShoppingCart },
                { label: "Record GRN",            path: "/goods-received",  icon: Package },
                { label: "Add Supplier",          path: "/suppliers",       icon: Truck },
              ],
            },
            {
              title: "Finance & Vouchers", color: "#107c10",
              links: [
                { label: "Payment Voucher", path: "/vouchers/payment",        icon: DollarSign },
                { label: "Receipt Voucher", path: "/vouchers/receipt",        icon: BookMarked },
                { label: "View Budgets",    path: "/financials/budgets",      icon: PiggyBank },
                { label: "Fixed Assets",   path: "/financials/fixed-assets", icon: Building2 },
              ],
            },
          ].map((section) => (
            <div key={section.title} style={{ ...glass, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              <div style={{ padding: "10px 16px", background: section.color }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>{section.title}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {section.links.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.06)", borderRight: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${section.color}10`}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${section.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <link.icon style={{ width: 14, height: 14, color: section.color }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#1e293b" }}>{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
