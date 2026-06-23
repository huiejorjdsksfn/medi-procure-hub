/**
 * EL5 MediProcure – Tracking & Approval Portal
 * Styled after Microsoft Office 365 portal:
 *   – Teal hero header with greeting + search
 *   – Coloured app-tile grid (quick actions)
 *   – "Recent items" section (pending approvals)
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, FileText, Package, Users, Bell,
  AlertTriangle, Database, CheckCircle2, XCircle,
  RefreshCw, Search, BarChart3, Settings, Shield,
  ClipboardList, Send, Stamp, Eye, ArrowRight,
  Clock, CheckSquare, Home, ChevronRight,
} from "lucide-react";

const db = supabase as any;

/* ── O365 design tokens ─────────────────────────────────── */
const O = {
  hero:     "#107C73",   // teal hero bg (Office 365 teal)
  heroHov:  "#0d6b62",
  topBar:   "#0a5a52",   // darker top bar
  white:    "#ffffff",
  bg:       "#f3f2f1",
  card:     "#ffffff",
  border:   "#edebe9",
  text:     "#323130",
  textSub:  "#605e5c",
  textMt:   "#a19f9d",
  blue:     "#0078d4",
  shadow:   "0 1.6px 3.6px rgba(0,0,0,.13)",
  shadowHov:"0 6.4px 14.4px rgba(0,0,0,.18)",
  font:     "'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

/* ── App tile definitions (O365-style coloured squares) ──── */
const TILES = [
  { label: "Requisitions",   icon: ShoppingCart,  color: "#0078d4", path: "/requisitions"      },
  { label: "Purchase Orders",icon: FileText,      color: "#107c10", path: "/purchase-orders"   },
  { label: "GRN Tracking",   icon: Package,       color: "#ca5010", path: "/goods-received"    },
  { label: "Bulk Approve",   icon: CheckSquare,   color: "#8764b8", path: "/tracking-approval?tab=bulk" },
  { label: "Notifications",  icon: Bell,          color: "#038387", path: "/notifications"     },
  { label: "Stock Alerts",   icon: AlertTriangle, color: "#a4262c", path: "/inventory"         },
  { label: "Audit Trail",    icon: ClipboardList, color: "#498205", path: "/audit-log"         },
  { label: "Backup / DB",    icon: Database,      color: "#003966", path: "/backup"            },
  { label: "Reports",        icon: BarChart3,     color: "#4b3867", path: "/reports"           },
  { label: "Users",          icon: Users,         color: "#004e8c", path: "/users"             },
  { label: "Security",       icon: Shield,        color: "#7a3b3f", path: "/admin/tracker"     },
  { label: "Settings",       icon: Settings,      color: "#605e5c", path: "/settings"          },
];

type ReqRow = { id: string; requisition_number: string; title?: string; department?: string; status: string; created_at: string; total_amount?: number; stamped?: boolean };

export default function TrackingApprovalPage() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [pending, setPending]     = useState<ReqRow[]>([]);
  const [counts, setCounts]       = useState({ reqs: 0, pos: 0, grns: 0 });

  // Documents approved/issued/received but not yet officially stamped
  const [needsStampReqs, setNeedsStampReqs] = useState<any[]>([]);
  const [needsStampPOs, setNeedsStampPOs]   = useState<any[]>([]);
  const [needsStampGRNs, setNeedsStampGRNs] = useState<any[]>([]);
  const [stampingId, setStampingId]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, poRes, grRes, stampReqRes, stampPoRes, stampGrnRes] = await Promise.allSettled([
        db.from("requisitions").select("id,requisition_number,title,department,status,created_at,total_amount")
          .in("status", ["pending","submitted"]).order("created_at",{ascending:false}).limit(20),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","open"]),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
        db.from("requisitions").select("id,requisition_number,total_amount,approved_at,approved_by_name,department")
          .eq("status","approved").or("stamped.is.null,stamped.eq.false").order("approved_at",{ascending:false}).limit(8),
        db.from("purchase_orders").select("id,po_number,total_amount,approved_at,supplier_name,status")
          .in("status",["approved","issued"]).or("stamped.is.null,stamped.eq.false").order("approved_at",{ascending:false}).limit(8),
        db.from("goods_received").select("id,grn_number,supplier_name,received_date,created_at,status")
          .in("status",["received","completed"]).or("stamped.is.null,stamped.eq.false").order("created_at",{ascending:false}).limit(8),
      ]);
      if (rRes.status === "fulfilled") setPending(rRes.value.data || []);
      if (stampReqRes.status === "fulfilled") setNeedsStampReqs(stampReqRes.value.data || []);
      if (stampPoRes.status === "fulfilled") setNeedsStampPOs(stampPoRes.value.data || []);
      if (stampGrnRes.status === "fulfilled") setNeedsStampGRNs(stampGrnRes.value.data || []);
      setCounts({
        reqs: rRes.status === "fulfilled" ? (rRes.value.data || []).length : 0,
        pos:  poRes.status === "fulfilled" ? (poRes.value.count || 0) : 0,
        grns: grRes.status === "fulfilled" ? (grRes.value.count || 0) : 0,
      });
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  // Officially stamp a document — real DB-backed action, mirrors the approved_by pattern
  const stampItem = async (table: "requisitions" | "purchase_orders" | "goods_received", id: string, defaultLabel: string) => {
    setStampingId(id);
    const now = new Date().toISOString();
    const stamper = profile?.full_name || "Admin";
    try {
      const { error } = await db.from(table).update({
        stamped: true,
        stamped_by_name: stamper,
        stamped_at: now,
        stamp_label: defaultLabel,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: "🔵 Officially Stamped", description: `${defaultLabel} stamp affixed by ${stamper}` });
      await load();
    } catch (err: any) {
      toast({ title: "Stamp failed", description: err.message || "Could not apply stamp", variant: "destructive" });
    }
    setStampingId(null);
  };

  const approve = async (id: string) => {
    await db.from("requisitions").update({ status: "approved" }).eq("id", id);
    toast({ title: "Approved", description: "Requisition approved successfully." });
    load();
  };

  const reject = async (id: string) => {
    await db.from("requisitions").update({ status: "rejected" }).eq("id", id);
    toast({ title: "Rejected", description: "Requisition rejected." });
    load();
  };

  const filtered = pending.filter(r =>
    !search ||
    (r.requisition_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div style={{ background: O.bg, minHeight: "100vh", fontFamily: O.font, color: O.text }}>

      {/* ── O365-style top bar ──────────────────────────────── */}
      <div style={{ background: O.topBar, padding: "0 24px", display: "flex", alignItems: "center", height: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,6px)", gap: 2 }}>
            {Array(9).fill(0).map((_,i)=>(
              <div key={i} style={{ width:6,height:6,background:"rgba(255,255,255,.7)",borderRadius:1 }} />
            ))}
          </div>
          <span style={{ color: O.white, fontWeight: 700, fontSize: 15, marginLeft: 8, letterSpacing: "-.01em" }}>EL5 MediProcure</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => nav("/notifications")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.8)", display: "flex", alignItems: "center" }}>
            <Bell size={17} />
          </button>
          <button onClick={() => nav("/settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.8)", display: "flex", alignItems: "center" }}>
            <Settings size={17} />
          </button>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
            <span style={{ color: O.white, fontWeight: 700, fontSize: 13 }}>
              {(profile?.full_name || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ── O365-style teal hero ────────────────────────────── */}
      <div style={{ background: O.hero, padding: "36px 24px 40px" }}>
        <h1 style={{ color: O.white, fontSize: 28, fontWeight: 300, margin: "0 0 20px", letterSpacing: "-.02em" }}>
          {greeting}, {profile?.full_name?.split(" ")[0] || "Administrator"}
        </h1>

        {/* Search bar — O365 style */}
        <div style={{ position: "relative", maxWidth: 380 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: O.textSub, pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search approvals, requisitions…"
            style={{ width: "100%", padding: "10px 16px 10px 36px", border: "1px solid rgba(255,255,255,.4)", borderRadius: 2, fontSize: 14, background: O.white, color: O.text, outline: "none", boxSizing: "border-box", fontFamily: O.font }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: O.textMt, fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      <div style={{ padding: "0 24px 32px" }}>

        {/* ── Pending badge strip ─────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginTop: 20, marginBottom: 24 }}>
          {[
            { label: "Pending Requisitions", val: pending.length, color: "#0078d4" },
            { label: "Pending POs",          val: counts.pos,      color: "#107c10" },
            { label: "Pending GRNs",         val: counts.grns,     color: "#ca5010" },
          ].map(b => (
            <div key={b.label} style={{ background: O.card, border: `1px solid ${O.border}`, borderTop: `3px solid ${b.color}`, borderRadius: 2, padding: "10px 18px", boxShadow: O.shadow }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: b.color }}>{loading ? "—" : b.val}</div>
              <div style={{ fontSize: 11, color: O.textSub, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{b.label}</div>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <button onClick={load} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: O.white, border: `1px solid ${O.border}`, borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer", color: O.text, boxShadow: O.shadow }}>
              <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>
        </div>

        {/* ── "Use the online apps" — O365 tile grid ─────────── */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: O.textSub, margin: "0 0 14px", fontWeight: 400 }}>Quick access</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TILES.map(t => (
              <button key={t.path} onClick={() => nav(t.path)}
                style={{ width: 88, height: 88, background: t.color, border: "none", borderRadius: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "opacity .15s,transform .15s,box-shadow .15s", boxShadow: O.shadow }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = ".88"; el.style.transform = "translateY(-2px)"; el.style.boxShadow = O.shadowHov; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = "1";   el.style.transform = "none";           el.style.boxShadow = O.shadow; }}>
                <t.icon size={24} color={O.white} strokeWidth={1.5} />
                <span style={{ color: O.white, fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2, padding: "0 4px" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${O.border}`, margin: "28px 0 20px" }} />

        {/* ── "Recent pending approvals" — O365 recent-docs style */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: O.textSub, margin: 0, fontWeight: 400 }}>Your pending approvals</p>
          <span style={{ fontSize: 12, color: O.textMt }}>Submitted date</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: O.textMt, fontSize: 13 }}>
            <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: 8 }}>Loading…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: O.textMt, fontSize: 13 }}>
            <CheckCircle2 size={32} color="#107c10" style={{ opacity: .5 }} />
            <div style={{ marginTop: 8 }}>No pending approvals{search ? ` matching "${search}"` : ""}</div>
          </div>
        ) : (
          <div style={{ background: O.card, border: `1px solid ${O.border}`, borderRadius: 2, boxShadow: O.shadow }}>
            {filtered.map((r, i) => (
              <div key={r.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${O.border}` : "none", transition: "background .1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f7f7f7"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                {/* Coloured file-type icon (O365 style) */}
                <div style={{ width: 36, height: 36, background: "#0078d4", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ShoppingCart size={16} color={O.white} strokeWidth={1.5} />
                </div>

                {/* Title + breadcrumb path */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: O.blue, fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onClick={() => nav(`/requisitions`)}>
                    {r.requisition_number || r.id.slice(0, 8)} — {r.title || "Procurement Request"}
                  </div>
                  <div style={{ fontSize: 11, color: O.textMt, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    EL5 MediProcure {"»"} Requisitions {"»"} {r.department || "General"}
                  </div>
                </div>

                {/* Approve / Reject buttons */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => approve(r.id)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#107c10", color: O.white, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <CheckCircle2 size={12} /> Approve
                  </button>
                  <button onClick={() => reject(r.id)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#a4262c", color: O.white, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <XCircle size={12} /> Reject
                  </button>
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: 11, color: O.textMt, flexShrink: 0, minWidth: 90, textAlign: "right" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── View all link ────────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <button onClick={() => nav("/requisitions")}
            style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: O.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            View all requisitions <ArrowRight size={13} />
          </button>
        )}

        {/* ── Divider ─────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${O.border}`, margin: "28px 0 20px" }} />

        {/* ── "Awaiting official stamp" — real DB-backed stamp action ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: O.textSub, margin: 0, fontWeight: 400 }}>Awaiting official stamp</p>
          <span style={{ fontSize: 12, color: O.textMt }}>
            {needsStampReqs.length + needsStampPOs.length + needsStampGRNs.length} document{needsStampReqs.length + needsStampPOs.length + needsStampGRNs.length === 1 ? "" : "s"}
          </span>
        </div>

        {!loading && needsStampReqs.length === 0 && needsStampPOs.length === 0 && needsStampGRNs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: O.textMt, fontSize: 13 }}>
            <Stamp size={32} color="#8764b8" style={{ opacity: .5 }} />
            <div style={{ marginTop: 8 }}>Nothing awaiting a stamp — all caught up</div>
          </div>
        ) : (
          <div style={{ background: O.card, border: `1px solid ${O.border}`, borderRadius: 2, boxShadow: O.shadow }}>
            {[
              ...needsStampReqs.map(r => ({
                id: r.id, table: "requisitions" as const, color: "#0078d4", icon: ShoppingCart,
                title: r.requisition_number || r.id.slice(0, 8), path: "Requisitions",
                meta: `${r.department || "General"} · KSh ${Number(r.total_amount || 0).toLocaleString()}`,
                date: r.approved_at, by: r.approved_by_name, defaultLabel: "Approved",
              })),
              ...needsStampPOs.map(p => ({
                id: p.id, table: "purchase_orders" as const, color: "#107c10", icon: FileText,
                title: p.po_number || p.id.slice(0, 8), path: "Purchase Orders",
                meta: `${p.supplier_name || "Supplier"} · KSh ${Number(p.total_amount || 0).toLocaleString()}`,
                date: p.approved_at, by: undefined, defaultLabel: p.status === "issued" ? "Issued" : "Approved",
              })),
              ...needsStampGRNs.map(g => ({
                id: g.id, table: "goods_received" as const, color: "#ca5010", icon: Package,
                title: g.grn_number || g.id.slice(0, 8), path: "GRN Tracking",
                meta: g.supplier_name || "Supplier",
                date: g.received_date || g.created_at, by: undefined, defaultLabel: "Received",
              })),
            ].map((row, i, arr) => (
              <div key={row.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${O.border}` : "none", transition: "background .1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f7f7f7"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                <div style={{ width: 36, height: 36, background: row.color, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <row.icon size={16} color={O.white} strokeWidth={1.5} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: O.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.title} <span style={{ color: "#107c10", fontWeight: 600 }}>· {row.defaultLabel}</span>
                  </div>
                  <div style={{ fontSize: 11, color: O.textMt, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    EL5 MediProcure {"»"} {row.path} {"»"} {row.meta}{row.by ? ` · by ${row.by}` : ""}
                  </div>
                </div>

                <button
                  onClick={() => stampItem(row.table, row.id, row.defaultLabel)}
                  disabled={stampingId === row.id}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: stampingId === row.id ? "#a496c4" : "#8764b8", color: O.white, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: stampingId === row.id ? "default" : "pointer", flexShrink: 0 }}>
                  <Stamp size={12} /> {stampingId === row.id ? "Stamping…" : "Stamp"}
                </button>

                <div style={{ fontSize: 11, color: O.textMt, flexShrink: 0, minWidth: 90, textAlign: "right" }}>
                  {row.date ? new Date(row.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
