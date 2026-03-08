import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, RefreshCw, ArrowRight, Plus, Calendar,
  FileCheck, BookMarked, Scale, PiggyBank, Building2, Activity,
  ChevronRight
} from "lucide-react";

const fmtKES = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K`
  : `KES ${n.toFixed(0)}`;

// MS Dynamics CRM-style module tiles
const MODULE_TILES = [
  { label: "REQUISITIONS",     path: "/requisitions",          icon: ClipboardList, color: "#0078d4", darkColor: "#005a9e" },
  { label: "PURCHASE ORDERS",  path: "/purchase-orders",       icon: ShoppingCart,  color: "#107c10", darkColor: "#0a5c0a" },
  { label: "GOODS RECEIVED",   path: "/goods-received",        icon: Package,       color: "#C45911", darkColor: "#8f3f0a" },
  { label: "SUPPLIERS",        path: "/suppliers",             icon: Truck,         color: "#1F6090", darkColor: "#154366" },
  { label: "TENDERS",          path: "/tenders",               icon: Gavel,         color: "#5C2D91", darkColor: "#3d1f63" },
  { label: "CONTRACTS",        path: "/contracts",             icon: FileCheck,     color: "#008B8B", darkColor: "#005f5f" },
  { label: "VOUCHERS",         path: "/vouchers/payment",      icon: DollarSign,    color: "#7B3F00", darkColor: "#5a2d00" },
  { label: "FINANCIALS",       path: "/financials/dashboard",  icon: BarChart3,     color: "#1a3a6b", darkColor: "#0f2244" },
  { label: "INVENTORY",        path: "/items",                 icon: Building2,     color: "#375623", darkColor: "#25381a" },
  { label: "QUALITY",          path: "/quality/dashboard",     icon: Shield,        color: "#603913", darkColor: "#3d2509" },
  { label: "PLANNING",         path: "/procurement-planning",  icon: Calendar,      color: "#4b4b9b", darkColor: "#35356e" },
  { label: "REPORTS",          path: "/reports",               icon: FileText,      color: "#444444", darkColor: "#222222" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#fef3c7", text: "#92400e" },
  approved:   { bg: "#d1fae5", text: "#065f46" },
  rejected:   { bg: "#fee2e2", text: "#991b1b" },
  draft:      { bg: "#f3f4f6", text: "#374151" },
  active:     { bg: "#dbeafe", text: "#1e40af" },
  sent:       { bg: "#ede9fe", text: "#5b21b6" },
  paid:       { bg: "#d1fae5", text: "#065f46" },
  open:       { bg: "#fef3c7", text: "#92400e" },
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
  const [loading,  setLoading]  = useState(true);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("My Work");

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
    if (m.system_name)    setSysName(m.system_name);
    if (m.hospital_name)  setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const primaryRole = roles[0]?.replace(/_/g, " ") || "User";

  const groups = [
    { label: "My Work",    key: "My Work" },
    { label: "Procurement",key: "Procurement" },
    { label: "Finance",    key: "Finance" },
  ];

  const activeRows = activeGroup === "My Work" ? recentReqs
    : activeGroup === "Procurement" ? recentPOs
    : recentGRNs;

  const activeColumns = activeGroup === "My Work"
    ? [
        { key: "requisition_number", label: "Ref No.",  bold: true, color: "#0078d4" },
        { key: "requested_by_name",  label: "Requested By" },
        { key: "total_amount",       label: "Amount",   fmt: (v:any) => fmtKES(Number(v||0)) },
        { key: "status",             label: "Status",   badge: true },
        { key: "created_at",         label: "Date",     fmt: (v:any) => new Date(v).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}) },
      ]
    : activeGroup === "Procurement"
    ? [
        { key: "po_number",       label: "PO No.",    bold: true, color: "#107c10" },
        { key: "supplier_name",   label: "Supplier" },
        { key: "total_amount",    label: "Amount",    fmt: (v:any) => fmtKES(Number(v||0)) },
        { key: "status",          label: "Status",    badge: true },
        { key: "created_at",      label: "Date",      fmt: (v:any) => new Date(v).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}) },
      ]
    : [
        { key: "grn_number",      label: "GRN No.",   bold: true, color: "#C45911" },
        { key: "po_number",       label: "PO Ref." },
        { key: "received_by_name",label: "Received By" },
        { key: "status",          label: "Status",    badge: true },
        { key: "created_at",      label: "Date",      fmt: (v:any) => new Date(v).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}) },
      ];

  const pathForGroup: Record<string,string> = {
    "My Work": "/requisitions",
    "Procurement": "/purchase-orders",
    "Finance": "/goods-received",
  };

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f3f2f1", minHeight: "calc(100vh - 57px)" }}>

      {/* ── SECTION GROUPS BAR — like "My Work / Customers / Sales" in CRM ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #edebe9" }}>
        <div className="flex items-center">
          {groups.map((g, i) => (
            <div key={g.key} className="flex items-center">
              <button
                onClick={() => setActiveGroup(g.key)}
                className="px-5 py-2.5 text-xs font-semibold tracking-wide transition-all"
                style={{
                  color: activeGroup === g.key ? "#0078d4" : "#605e5c",
                  borderBottom: activeGroup === g.key ? "2px solid #0078d4" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {g.label}
              </button>
              {i < groups.length - 1 && <div style={{ width: 1, height: 14, background: "#edebe9" }} />}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 pr-4">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
              style={{ color: "#0078d4", background: "transparent", border: "1px solid #0078d4" }}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate(pathForGroup[activeGroup] || "/requisitions")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white"
              style={{ background: "#0078d4" }}
            >
              <Plus className="w-3 h-3" />
              New {activeGroup === "My Work" ? "Requisition" : activeGroup === "Procurement" ? "Purchase Order" : "GRN"}
            </button>
          </div>
        </div>
      </div>

      {/* ── CRM MODULE TILES ROW ── */}
      <div style={{ background: "#fff", borderBottom: "2px solid #edebe9", overflowX: "auto" }}>
        <div className="flex items-stretch">
          {MODULE_TILES.map((tile) => {
            const isHovered = hoveredTile === tile.label;
            return (
              <button
                key={tile.label}
                onClick={() => navigate(tile.path)}
                onMouseEnter={() => setHoveredTile(tile.label)}
                onMouseLeave={() => setHoveredTile(null)}
                className="flex flex-col items-center justify-center gap-1.5 px-5 py-4 transition-all shrink-0 relative"
                style={{
                  background: isHovered ? tile.color : "transparent",
                  borderBottom: `3px solid ${isHovered ? tile.darkColor : "transparent"}`,
                  minWidth: 80,
                  borderRight: "1px solid #f3f2f1",
                }}
              >
                <div
                  className="w-9 h-9 rounded flex items-center justify-center"
                  style={{
                    background: isHovered ? "rgba(255,255,255,0.2)" : `${tile.color}18`,
                  }}
                >
                  <tile.icon
                    className="w-4.5 h-4.5"
                    style={{ width: 18, height: 18, color: isHovered ? "#fff" : tile.color }}
                  />
                </div>
                <span
                  className="text-[9.5px] font-black tracking-widest text-center leading-tight"
                  style={{ color: isHovered ? "#fff" : "#323130" }}
                >
                  {tile.label}
                </span>
                {isHovered && (
                  <div
                    className="absolute bottom-0 left-1/2"
                    style={{
                      width: 0, height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: `6px solid #f3f2f1`,
                      transform: "translateX(-50%)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="p-4 space-y-4">

        {/* Welcome strip */}
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{
            background: "linear-gradient(90deg,#0a2558,#1a3a6b)",
            boxShadow: "0 2px 8px rgba(10,37,88,0.25)",
          }}
        >
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt="" className="h-8 object-contain rounded" />
            )}
            <div>
              <p className="text-white font-black text-sm">{hospitalName}</p>
              <p className="text-white/50 text-[10px]">
                {sysName} · {profile?.full_name || "User"} · {primaryRole}
              </p>
            </div>
          </div>
          <div className="text-white/40 text-[10px] text-right">
            <div className="font-semibold text-white/70">{new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
        </div>

        {/* ── ACTIVITIES TABLE — CRM Style ── */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "#fff", border: "1px solid #edebe9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {/* Table header bar */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ background: "#faf9f8", borderBottom: "1px solid #edebe9" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800">{activeGroup}</span>
              <span className="text-[10px] text-gray-400 font-medium">
                {activeGroup === "My Work" ? "Recent Requisitions" : activeGroup === "Procurement" ? "Recent Purchase Orders" : "Recent Goods Received"}
              </span>
            </div>
            <button
              onClick={() => navigate(pathForGroup[activeGroup])}
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: "#0078d4" }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#f3f2f1", borderBottom: "1px solid #edebe9" }}>
                {activeColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left font-semibold"
                    style={{ color: "#605e5c", fontSize: 11 }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left font-semibold" style={{ color: "#605e5c", fontSize: 11 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="px-4 py-8 text-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-300 mx-auto" />
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="px-4 py-8 text-center text-gray-400">
                    No records found
                  </td>
                </tr>
              ) : (
                activeRows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid #f3f2f1" }}
                    onClick={() => navigate(pathForGroup[activeGroup])}
                  >
                    {activeColumns.map((col) => {
                      const val = row[col.key];
                      if ((col as any).badge && val) {
                        const sc = STATUS_COLORS[val] || { bg: "#f3f4f6", text: "#6b7280" };
                        return (
                          <td key={col.key} className="px-4 py-2.5">
                            <span
                              className="px-2 py-0.5 rounded-sm text-[10px] font-semibold capitalize"
                              style={{ background: sc.bg, color: sc.text }}
                            >
                              {val}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className="px-4 py-2.5" style={{ color: (col as any).bold ? (col as any).color || "#0078d4" : "#323130", fontWeight: (col as any).bold ? 700 : 400 }}>
                          {(col as any).fmt ? (col as any).fmt(val) : (val || "—")}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── QUICK LINKS FOOTER (2-col) ── */}
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              title: "Procurement",
              color: "#0078d4",
              links: [
                { label: "New Requisition", path: "/requisitions", icon: ClipboardList },
                { label: "Create Purchase Order", path: "/purchase-orders", icon: ShoppingCart },
                { label: "Record GRN", path: "/goods-received", icon: Package },
                { label: "Add Supplier", path: "/suppliers", icon: Truck },
              ],
            },
            {
              title: "Finance & Vouchers",
              color: "#107c10",
              links: [
                { label: "Payment Voucher", path: "/vouchers/payment", icon: DollarSign },
                { label: "Receipt Voucher", path: "/vouchers/receipt", icon: BookMarked },
                { label: "View Budgets", path: "/financials/budgets", icon: PiggyBank },
                { label: "Fixed Assets", path: "/financials/fixed-assets", icon: Building2 },
              ],
            },
          ].map((section) => (
            <div
              key={section.title}
              className="rounded-lg overflow-hidden"
              style={{ background: "#fff", border: "1px solid #edebe9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
            >
              <div
                className="px-4 py-2.5"
                style={{ background: section.color, borderBottom: `1px solid ${section.color}` }}
              >
                <span className="text-xs font-black text-white tracking-wide">{section.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-0">
                {section.links.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-2.5 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                    style={{ borderBottom: "1px solid #f3f2f1", borderRight: "1px solid #f3f2f1" }}
                  >
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: `${section.color}12` }}>
                      <link.icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">{link.label}</span>
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
