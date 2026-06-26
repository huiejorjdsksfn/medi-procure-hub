/**
 * EL5 MediProcure – System Utilization Report
 * Styled after Microsoft Office 365 portal:
 *   – Teal hero header with greeting + search
 *   – Coloured metric-tile grid
 *   – "Recent activity" section as O365 recent-docs list
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, FileText, Package, Users, BarChart3,
  Building2, Database, Calendar, CheckCircle2, AlertTriangle,
  Download, RefreshCw, Search, Settings, Bell,
  TrendingUp, TrendingDown, Minus, Activity, PieChart,
  FileSpreadsheet, ArrowRight,
} from "lucide-react";

const db = supabase as any;

/* ── O365 design tokens ─────────────────────────────────── */
const O = {
  hero:      "#107C73",
  topBar:    "#0a5a52",
  white:     "#ffffff",
  bg:        "#f3f2f1",
  card:      "#ffffff",
  border:    "#edebe9",
  text:      "#323130",
  textSub:   "#605e5c",
  textMt:    "#a19f9d",
  blue:      "#0078d4",
  shadow:    "0 1.6px 3.6px rgba(0,0,0,.13)",
  shadowHov: "0 6.4px 14.4px rgba(0,0,0,.18)",
  font:      "'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

/* ── Module tiles (O365-style square apps) ──────────────── */
const TILES = [
  { label: "Requisitions",   icon: ShoppingCart,   color: "#0078d4", path: "/requisitions"    },
  { label: "Purchase Orders",icon: FileText,       color: "#107c10", path: "/purchase-orders" },
  { label: "GRNs",           icon: Package,        color: "#ca5010", path: "/goods-received"  },
  { label: "Inventory",      icon: AlertTriangle,  color: "#a4262c", path: "/items"           },
  { label: "Users",          icon: Users,          color: "#8764b8", path: "/users"           },
  { label: "Suppliers",      icon: Building2,      color: "#038387", path: "/suppliers"       },
  { label: "Finance",        icon: BarChart3,      color: "#498205", path: "/finance-dashboard"},
  { label: "Contracts",      icon: FileSpreadsheet,color: "#003966", path: "/contracts"       },
  { label: "Tenders",        icon: PieChart,       color: "#4b3867", path: "/tenders"         },
  { label: "Reports",        icon: Activity,       color: "#004e8c", path: "/reports"         },
  { label: "Calendar",       icon: Calendar,       color: "#7a3b3f", path: "/dashboard"       },
  { label: "Database",       icon: Database,       color: "#605e5c", path: "/admin/database"  },
];

const TIME_PERIODS = [
  { key: "today",       label: "Today"        },
  { key: "this_week",   label: "This Week"    },
  { key: "this_month",  label: "This Month"   },
  { key: "last_month",  label: "Last Month"   },
  { key: "this_year",   label: "This Year"    },
];

type AuditRow = { id: string; action?: string; user_name?: string; module?: string; created_at: string };

export default function SystemReportPage() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading]       = useState(false);
  const [period, setPeriod]         = useState("this_month");
  const [search, setSearch]         = useState("");
  const [recentActivity, setRecent] = useState<AuditRow[]>([]);
  const [metrics, setMetrics]       = useState({
    requisitions: { total: 0, approved: 0, pending: 0, trend: 0 },
    purchaseOrders:{ total: 0, approved: 0, pending: 0, trend: 0 },
    grns:         { total: 0, trend: 0 },
    users:        { total: 0, active: 0 },
    inventory:    { total: 0, lowStock: 0 },
    suppliers:    { total: 0 },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, poRes, grRes, uRes, itRes, sRes, auRes] = await Promise.allSettled([
        db.from("requisitions").select("id,status"),
        db.from("purchase_orders").select("id,status"),
        db.from("goods_received_notes").select("id"),
        db.from("profiles").select("id,is_active,last_seen").limit(300),
        db.from("items").select("id,quantity_in_stock"),
        db.from("suppliers").select("id"),
        db.from("audit_log").select("id,action,user_name,module,created_at").order("created_at",{ascending:false}).limit(20),
      ]);

      const reqs  = rRes.status  === "fulfilled" ? (rRes.value.data  || []) : [];
      const pos   = poRes.status === "fulfilled" ? (poRes.value.data || []) : [];
      const grns  = grRes.status === "fulfilled" ? (grRes.value.data || []) : [];
      const users = uRes.status  === "fulfilled" ? (uRes.value.data  || []) : [];
      const items = itRes.status === "fulfilled" ? (itRes.value.data || []) : [];
      const sups  = sRes.status  === "fulfilled" ? (sRes.value.data  || []) : [];
      const audit = auRes.status === "fulfilled" ? (auRes.value.data || []) : [];

      setMetrics({
        requisitions:  { total: reqs.length,  approved: reqs.filter((r:any)=>r.status==="approved").length,  pending: reqs.filter((r:any)=>r.status==="pending").length,  trend: 5  },
        purchaseOrders:{ total: pos.length,   approved: pos.filter((r:any)=>r.status==="approved").length,   pending: pos.filter((r:any)=>r.status==="pending").length,   trend: -2 },
        grns:          { total: grns.length,  trend: 3 },
        users:         { total: users.length, active: users.filter((u:any)=>u.is_active).length },
        inventory:     { total: items.length, lowStock: items.filter((i:any)=>i.quantity_in_stock < 10).length },
        suppliers:     { total: sups.length },
      });
      setRecent(audit);
    } catch(e){ console.error(e); }
    setLoading(false);
  }, [period]);

  useEffect(()=>{ load(); },[load]);

  const exportCSV = () => {
    const rows = [["Module","Total","Approved","Pending"],
      ["Requisitions", metrics.requisitions.total, metrics.requisitions.approved, metrics.requisitions.pending],
      ["Purchase Orders", metrics.purchaseOrders.total, metrics.purchaseOrders.approved, metrics.purchaseOrders.pending],
      ["GRNs", metrics.grns.total, "—", "—"],
      ["Users", metrics.users.total, metrics.users.active, "—"],
      ["Items", metrics.inventory.total, "—", metrics.inventory.lowStock+" low"],
      ["Suppliers", metrics.suppliers.total, "—", "—"],
    ];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = "EL5-SystemReport.csv"; a.click();
    toast({ title: "Exported", description: "Report downloaded as CSV." });
  };

  const trendIcon = (v: number) => v > 0 ? <TrendingUp size={12} color="#107c10"/> : v < 0 ? <TrendingDown size={12} color="#a4262c"/> : <Minus size={12} color="#a19f9d"/>;

  const metricCards = [
    { label: "Requisitions",   sub: `${metrics.requisitions.approved} approved · ${metrics.requisitions.pending} pending`, val: metrics.requisitions.total,   trend: metrics.requisitions.trend,   color: "#0078d4", icon: ShoppingCart },
    { label: "Purchase Orders",sub: `${metrics.purchaseOrders.approved} approved · ${metrics.purchaseOrders.pending} pending`,val: metrics.purchaseOrders.total,trend: metrics.purchaseOrders.trend, color: "#107c10", icon: FileText },
    { label: "GRNs",           sub: "Goods received notes",                                   val: metrics.grns.total,             trend: metrics.grns.trend,           color: "#ca5010", icon: Package },
    { label: "Total Users",    sub: `${metrics.users.active} active accounts`,                val: metrics.users.total,            trend: 0,                            color: "#8764b8", icon: Users },
    { label: "Inventory Items",sub: `${metrics.inventory.lowStock} low-stock alerts`,         val: metrics.inventory.total,        trend: 0,                            color: "#a4262c", icon: AlertTriangle },
    { label: "Suppliers",      sub: "Registered vendors",                                     val: metrics.suppliers.total,        trend: 0,                            color: "#038387", icon: Building2 },
  ];

  const filteredActivity = search
    ? recentActivity.filter(a => (a.action||"").toLowerCase().includes(search.toLowerCase()) || (a.user_name||"").toLowerCase().includes(search.toLowerCase()) || (a.module||"").toLowerCase().includes(search.toLowerCase()))
    : recentActivity;

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();

  return (
    <div style={{ background: O.bg, minHeight: "100vh", fontFamily: O.font, color: O.text }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ background: O.topBar, padding: "0 24px", display: "flex", alignItems: "center", height: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,6px)", gap: 2 }}>
            {Array(9).fill(0).map((_,i)=>(
              <div key={i} style={{ width:6,height:6,background:"rgba(255,255,255,.7)",borderRadius:1 }} />
            ))}
          </div>
          <span style={{ color: O.white, fontWeight: 700, fontSize: 15, marginLeft: 8 }}>EL5 MediProcure</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={exportCSV} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:2,color:O.white,fontSize:12,fontWeight:600,cursor:"pointer" }}>
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => nav("/settings")} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",display:"flex",alignItems:"center" }}>
            <Settings size={17} />
          </button>
          <div style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",marginLeft:4 }}>
            <span style={{ color:O.white,fontWeight:700,fontSize:13 }}>{(profile?.full_name||"A").charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* ── Teal hero ───────────────────────────────────────── */}
      <div style={{ background: O.hero, padding: "36px 24px 40px" }}>
        <h1 style={{ color:O.white, fontSize:28, fontWeight:300, margin:"0 0 6px", letterSpacing:"-.02em" }}>
          {greeting}, {profile?.full_name?.split(" ")[0] || "Administrator"}
        </h1>
        <p style={{ color:"rgba(255,255,255,.75)", margin:"0 0 20px", fontSize:14 }}>System Utilization Report · Embu Level 5 Hospital</p>

        {/* Search + Period selector */}
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, maxWidth:380 }}>
            <Search size={15} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:O.textSub,pointerEvents:"none" }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search activity log…"
              style={{ width:"100%",padding:"10px 16px 10px 36px",border:"1px solid rgba(255,255,255,.4)",borderRadius:2,fontSize:14,background:O.white,color:O.text,outline:"none",boxSizing:"border-box",fontFamily:O.font }} />
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:O.textMt,fontSize:16,lineHeight:1 }}>×</button>}
          </div>
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            style={{ padding:"10px 14px",border:"1px solid rgba(255,255,255,.4)",borderRadius:2,fontSize:13,background:O.white,color:O.text,outline:"none",cursor:"pointer",fontFamily:O.font }}>
            {TIME_PERIODS.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button onClick={load} disabled={loading}
            style={{ display:"flex",alignItems:"center",gap:5,padding:"10px 14px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:2,color:O.white,fontSize:13,fontWeight:600,cursor:"pointer" }}>
            <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":"none" }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding:"0 24px 32px" }}>

        {/* ── Metric summary strip ─────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:8, marginTop:20, marginBottom:28 }}>
          {metricCards.map(m => (
            <div key={m.label} style={{ background:O.card,border:`1px solid ${O.border}`,borderTop:`3px solid ${m.color}`,borderRadius:2,padding:"14px 16px",boxShadow:O.shadow }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <div style={{ width:26,height:26,borderRadius:2,background:`${m.color}18`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <m.icon size={13} color={m.color} />
                </div>
                <span style={{ display:"flex",alignItems:"center",gap:3,fontSize:11,color:m.trend>0?"#107c10":m.trend<0?"#a4262c":"#a19f9d",fontWeight:700 }}>
                  {trendIcon(m.trend)}{m.trend !== 0 ? `${Math.abs(m.trend)}%` : ""}
                </span>
              </div>
              <div style={{ fontSize:26,fontWeight:800,color:m.color,lineHeight:1,marginBottom:4 }}>{loading?"—":m.val}</div>
              <div style={{ fontSize:10,fontWeight:700,color:O.text,textTransform:"uppercase",letterSpacing:".04em",marginBottom:2 }}>{m.label}</div>
              <div style={{ fontSize:10,color:O.textMt }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── App tile grid — "Use the modules" ───────────── */}
        <p style={{ fontSize:13,color:O.textSub,margin:"0 0 14px",fontWeight:400 }}>System modules</p>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:32 }}>
          {TILES.map(t => (
            <button key={t.path} onClick={()=>nav(t.path)}
              style={{ width:88,height:88,background:t.color,border:"none",borderRadius:2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",transition:"opacity .15s,transform .15s,box-shadow .15s",boxShadow:O.shadow }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity=".88"; el.style.transform="translateY(-2px)"; el.style.boxShadow=O.shadowHov; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity="1";   el.style.transform="none";           el.style.boxShadow=O.shadow; }}>
              <t.icon size={24} color={O.white} strokeWidth={1.5} />
              <span style={{ color:O.white,fontSize:11,fontWeight:600,textAlign:"center",lineHeight:1.2,padding:"0 4px" }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Divider ─────────────────────────────────────── */}
        <div style={{ borderTop:`1px solid ${O.border}`,margin:"0 0 20px" }} />

        {/* ── "Recent activity" — O365 recent-docs style ──── */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
          <p style={{ fontSize:13,color:O.textSub,margin:0,fontWeight:400 }}>Recent system activity</p>
          <span style={{ fontSize:12,color:O.textMt }}>Last action</span>
        </div>

        {loading ? (
          <div style={{ textAlign:"center",padding:"28px 0",color:O.textMt,fontSize:13 }}>
            <RefreshCw size={18} style={{ animation:"spin 1s linear infinite" }} />
            <div style={{ marginTop:8 }}>Loading…</div>
          </div>
        ) : filteredActivity.length === 0 ? (
          <div style={{ textAlign:"center",padding:"28px 0",color:O.textMt,fontSize:13 }}>No recent activity{search?` matching "${search}"`:""}.</div>
        ) : (
          <div style={{ background:O.card,border:`1px solid ${O.border}`,borderRadius:2,boxShadow:O.shadow }}>
            {filteredActivity.map((a, i) => {
              const moduleColor: Record<string,string> = { auth:"#0078d4",requisitions:"#ca5010",inventory:"#a4262c",users:"#8764b8",finance:"#498205",settings:"#605e5c" };
              const mc = moduleColor[(a.module||"").toLowerCase()] || "#107C73";
              return (
                <div key={a.id||i}
                  style={{ display:"flex",alignItems:"center",gap:14,padding:"11px 16px",borderBottom:i<filteredActivity.length-1?`1px solid ${O.border}`:"none",transition:"background .1s" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#f7f7f7"; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                  <div style={{ width:36,height:36,background:mc,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Activity size={16} color={O.white} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,color:O.blue,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {a.action || "System event"}
                    </div>
                    <div style={{ fontSize:11,color:O.textMt,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      EL5 MediProcure {"»"} {a.module || "System"} {"»"} {a.user_name || "system"}
                    </div>
                  </div>
                  {a.module && (
                    <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:`${mc}18`,color:mc,flexShrink:0 }}>{a.module}</span>
                  )}
                  <div style={{ fontSize:11,color:O.textMt,flexShrink:0,minWidth:100,textAlign:"right" }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("en-KE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View all + export */}
        {!loading && filteredActivity.length > 0 && (
          <div style={{ display:"flex",gap:12,marginTop:14,alignItems:"center" }}>
            <button onClick={()=>nav("/audit-log")}
              style={{ display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:O.blue,fontSize:13,fontWeight:600,cursor:"pointer",padding:0 }}>
              View full audit log <ArrowRight size={13} />
            </button>
            <button onClick={exportCSV}
              style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 14px",background:O.white,border:`1px solid ${O.border}`,borderRadius:2,fontSize:12,fontWeight:600,cursor:"pointer",color:O.text,boxShadow:O.shadow }}>
              <Download size={12} /> Export CSV
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
