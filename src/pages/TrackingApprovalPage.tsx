/**
 * EL5 MediProcure — Tracking & Approval Portal v3.0
 * 2026 ERP redesign: P2P pipeline tracker, elevated card system, refined
 * typography. Same data + actions as v2 — visual layer only.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DocumentStamp, QuickStampButton } from "@/components/DocumentStamp";
import BrandConfirmation from "@/components/BrandConfirmation";
import { T } from "@/lib/theme";
import {
  ShoppingCart, FileText, Package, Users, Bell, AlertTriangle,
  Database, CheckCircle2, XCircle, RefreshCw, Search, BarChart3,
  Settings, Shield, ClipboardList, Stamp, ArrowRight,
  Clock, CheckSquare, Inbox, ChevronRight, Tag, Filter, ArrowUpRight,
} from "lucide-react";

const db = supabase as any;

/* ── Visual tokens (colours pulled from the shared theme so GUI-editor
   customisation still applies; layout/type/spacing is the 2026 pass) ── */
const V = {
  font: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
};

const TILES = [
  { label:"Requisitions",    icon:ShoppingCart, color:"#0078d4", path:"/requisitions"    },
  { label:"Purchase Orders", icon:FileText,     color:"#107c10", path:"/purchase-orders"  },
  { label:"GRN Tracking",    icon:Package,      color:"#ca5010", path:"/goods-received"  },
  { label:"Notifications",   icon:Bell,         color:"#038387", path:"/notifications"   },
  { label:"Stock Alerts",    icon:AlertTriangle,color:"#a4262c", path:"/inventory"       },
  { label:"Audit Trail",     icon:ClipboardList,color:"#498205", path:"/audit-log"       },
  { label:"Backup / DB",     icon:Database,     color:"#003966", path:"/backup"          },
  { label:"Reports",         icon:BarChart3,    color:"#4b3867", path:"/reports"         },
  { label:"Users",           icon:Users,        color:"#004e8c", path:"/users"           },
  { label:"Security",        icon:Shield,       color:"#7a3b3f", path:"/admin/tracker"   },
  { label:"Settings",        icon:Settings,     color:"#605e5c", path:"/settings"        },
];

const DOC_META: Record<string,{label:string;color:string;icon:any;path:string}> = {
  requisition:    { label:"Requisition",    color:"#0078d4", icon:ShoppingCart, path:"/requisitions"    },
  purchase_order: { label:"Purchase Order", color:"#107c10", icon:FileText,     path:"/purchase-orders" },
  grn:            { label:"GRN",            color:"#ca5010", icon:Package,      path:"/goods-received"  },
  voucher:        { label:"Voucher",        color:"#8764b8", icon:Tag,          path:"/vouchers"        },
  tender:         { label:"Tender",         color:"#1d4ed8", icon:ClipboardList,path:"/tenders"         },
  contract:       { label:"Contract",       color:"#065f46", icon:FileText,     path:"/contracts"       },
};

const PRIO_STYLE: Record<string,{bg:string;color:string}> = {
  urgent: { bg:"#fee2e2", color:"#dc2626" },
  high:   { bg:"#ffedd5", color:"#ea580c" },
  normal: { bg:"#dcfce7", color:"#16a34a" },
  low:    { bg:"#dbeafe", color:"#2563eb" },
};

type QueueRow = {
  id:string; document_type:string; document_id:string; document_number:string;
  document_title:string; department:string; amount:number; pushed_by_name:string;
  pushed_at:string; priority:string; notes:string; queue_status:string;
};
type ReqRow = { id:string; requisition_number:string; title?:string; department?:string; status:string; created_at:string; total_amount?:number };

export default function TrackingApprovalPage() {
  const nav = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [qFilter,   setQFilter]   = useState("all");   // all | urgent | high | normal
  const [queue,     setQueue]     = useState<QueueRow[]>([]);
  const [pending,   setPending]   = useState<ReqRow[]>([]);
  const [counts,    setCounts]    = useState({ reqs:0, pos:0, grns:0, inQueue:0 });
  const [resolving, setResolving] = useState<string|null>(null);
  const [needsStampReqs,  setNeedsStampReqs]  = useState<any[]>([]);
  const [needsStampPOs,   setNeedsStampPOs]   = useState<any[]>([]);
  const [needsStampGRNs,  setNeedsStampGRNs]  = useState<any[]>([]);
  const [stampingId, setStampingId] = useState<string|null>(null);
  const [activeTab,  setActiveTab]  = useState<"queue"|"pending"|"stamp">("queue");
  const [confirm, setConfirm] = useState<{ title:string; message:string; status:"success"|"error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, rRes, poRes, grRes, sReqRes, sPoRes, sGrnRes] = await Promise.allSettled([
        db.from("approval_queue")
          .select("*")
          .eq("queue_status","queued")
          .order("pushed_at",{ascending:false})
          .limit(50),
        db.from("requisitions").select("id,requisition_number,title,department,status,created_at,total_amount")
          .in("status",["pending","submitted"]).order("created_at",{ascending:false}).limit(20),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","open"]),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
        db.from("requisitions").select("id,requisition_number,total_amount,approved_at,approved_by_name,department")
          .eq("status","approved").or("stamped.is.null,stamped.eq.false").order("approved_at",{ascending:false}).limit(8),
        db.from("purchase_orders").select("id,po_number,total_amount,approved_at,supplier_name,status")
          .in("status",["approved","issued"]).or("stamped.is.null,stamped.eq.false").order("approved_at",{ascending:false}).limit(8),
        db.from("goods_received").select("id,grn_number,supplier_name,received_date,created_at,status")
          .in("status",["received","completed"]).or("stamped.is.null,stamped.eq.false").order("created_at",{ascending:false}).limit(8),
      ]);
      if (qRes.status==="fulfilled")    setQueue(qRes.value.data||[]);
      if (rRes.status==="fulfilled")    setPending(rRes.value.data||[]);
      if (sReqRes.status==="fulfilled") setNeedsStampReqs(sReqRes.value.data||[]);
      if (sPoRes.status==="fulfilled")  setNeedsStampPOs(sPoRes.value.data||[]);
      if (sGrnRes.status==="fulfilled") setNeedsStampGRNs(sGrnRes.value.data||[]);
      setCounts({
        reqs:   rRes.status==="fulfilled"  ? (rRes.value.data||[]).length : 0,
        pos:    poRes.status==="fulfilled" ? (poRes.value.count||0) : 0,
        grns:   grRes.status==="fulfilled" ? (grRes.value.count||0) : 0,
        inQueue:qRes.status==="fulfilled"  ? (qRes.value.data||[]).length : 0,
      });
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  /* Resolve a queue item (approve or reject) */
  const resolveQueue = async (item: QueueRow, action: "approved"|"rejected") => {
    setResolving(item.id);
    try {
      // Update queue record
      await db.from("approval_queue").update({
        queue_status:     action,
        resolved_by_name: profile?.full_name||"Admin",
        resolved_at:      new Date().toISOString(),
      }).eq("id", item.id);

      // Also update the source document status
      const tableMap: Record<string,string> = {
        requisition:"requisitions", purchase_order:"purchase_orders",
        grn:"goods_received", voucher:"vouchers", tender:"tenders", contract:"contracts",
      };
      const table = tableMap[item.document_type];
      if (table) {
        const statusMap: Record<string,string> = {
          requisition:    action==="approved" ? "approved"  : "rejected",
          purchase_order: action==="approved" ? "approved"  : "cancelled",
          grn:            action==="approved" ? "received"  : "rejected",
          voucher:        action==="approved" ? "approved"  : "rejected",
          tender:         action==="approved" ? "published" : "cancelled",
          contract:       action==="approved" ? "active"    : "cancelled",
        };
        await db.from(table).update({
          status:           statusMap[item.document_type],
          approved_by:      user?.id,
          approved_by_name: profile?.full_name||"Admin",
          approved_at:      new Date().toISOString(),
        }).eq("id", item.document_id);
      }

      toast({ title:`${action==="approved"?"✅ Approved":"❌ Rejected"}: ${item.document_number}` });
      setConfirm({
        title: action==="approved" ? "Document has been approved." : "Document has been rejected.",
        message: `${item.document_number} was ${action} by ${profile?.full_name||"Admin"}.`,
        status: "success",
      });
      await load();
    } catch(e:any){
      toast({ title:"Action failed", description:e.message, variant:"destructive" });
      setConfirm({ title:"Action failed.", message:e.message, status:"error" });
    }
    setResolving(null);
  };

  /* Stamp a document */
  const stampItem = async (table:"requisitions"|"purchase_orders"|"goods_received", id:string, label:string) => {
    setStampingId(id);
    try {
      await db.from(table).update({ stamped:true, stamped_by_name:profile?.full_name||"Admin",
        stamped_at:new Date().toISOString(), stamp_label:label }).eq("id",id);
      toast({ title:`🔵 ${label} stamp affixed` });
      setConfirm({
        title: "Document has been stamped.",
        message: `Officially stamped "${label}" by ${profile?.full_name||"Admin"}.`,
        status: "success",
      });
      await load();
    } catch(e:any){
      toast({ title:"Stamp failed", description:e.message, variant:"destructive" });
      setConfirm({ title:"Stamp failed.", message:e.message, status:"error" });
    }
    setStampingId(null);
  };

  const approve = async (id:string) => {
    await db.from("requisitions").update({ status:"approved", approved_by_name:profile?.full_name, approved_at:new Date().toISOString() }).eq("id",id);
    toast({ title:"✅ Approved" }); load();
  };
  const reject = async (id:string) => {
    await db.from("requisitions").update({ status:"rejected" }).eq("id",id);
    toast({ title:"❌ Rejected" }); load();
  };

  const greeting = (() => { const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; })();

  const filteredQueue = queue.filter(q => {
    const matchSearch = !search ||
      (q.document_number||"").toLowerCase().includes(search.toLowerCase()) ||
      (q.document_title||"").toLowerCase().includes(search.toLowerCase()) ||
      (q.department||"").toLowerCase().includes(search.toLowerCase()) ||
      (q.pushed_by_name||"").toLowerCase().includes(search.toLowerCase());
    const matchPrio = qFilter==="all" || q.priority===qFilter;
    return matchSearch && matchPrio;
  });

  const filteredPending = pending.filter(r =>
    !search || (r.requisition_number||"").toLowerCase().includes(search.toLowerCase()) ||
    (r.title||"").toLowerCase().includes(search.toLowerCase())
  );

  const stampDocs = [
    ...needsStampReqs.map(r=>({ id:r.id, table:"requisitions" as const, color:"#0078d4", icon:ShoppingCart, title:r.requisition_number||`REQ/${r.department||"General"}`, meta:`${r.department||"General"} · KES ${Number(r.total_amount||0).toLocaleString()}`, date:r.approved_at, by:r.approved_by_name, label:"Approved" })),
    ...needsStampPOs.map(p=>({ id:p.id, table:"purchase_orders" as const, color:"#107c10", icon:FileText, title:p.po_number||`PO/${p.supplier_name||"Supplier"}`, meta:`${p.supplier_name||"Supplier"} · KES ${Number(p.total_amount||0).toLocaleString()}`, date:p.approved_at, by:undefined, label:p.status==="issued"?"Issued":"Approved" })),
    ...needsStampGRNs.map(g=>({ id:g.id, table:"goods_received" as const, color:"#ca5010", icon:Package, title:g.grn_number||`GRN/${g.supplier_name||"Received"}`, meta:g.supplier_name||"Supplier", date:g.received_date||g.created_at, by:undefined, label:"Received" })),
  ];

  const TAB_DEFS = [
    { id:"queue",   label:"Approval Queue",   count:counts.inQueue,  urgent:queue.some(q=>q.priority==="urgent") },
    { id:"pending", label:"Pending Approvals",count:counts.reqs,     urgent:false },
    { id:"stamp",   label:"Awaiting Stamp",   count:stampDocs.length,urgent:false },
  ];

  /* Procure-to-pay pipeline — the flow this whole page exists to move
     documents through, laid out as connected live stages. */
  const PIPELINE = [
    { label:"Requisitions",   sub:"awaiting approval", count:counts.reqs,          icon:ShoppingCart, color:"#0078d4" },
    { label:"Approval Queue", sub:"pushed for action",  count:counts.inQueue,       icon:Inbox,        color:"#8764b8" },
    { label:"Purchase Orders",sub:"pending / open",     count:counts.pos,          icon:FileText,     color:"#107c10" },
    { label:"Goods Received", sub:"pending GRN",        count:counts.grns,         icon:Package,      color:"#ca5010" },
    { label:"Stamping",       sub:"official seal due",  count:stampDocs.length,    icon:Stamp,        color:"#a4262c" },
  ];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:V.font, color:T.fg }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ background:T.card, borderBottom:`1px solid ${T.border}`, padding:"16px 28px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", boxShadow:"0 1px 2px rgba(16,24,40,.04)" }}>
        <div style={{ width:44, height:44, borderRadius:T.rLg, background:`${T.primary}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Inbox size={21} color={T.primary}/>
        </div>
        <div style={{ minWidth:0 }}>
          <h1 style={{ margin:0, fontSize:19, fontWeight:700, color:T.fg, letterSpacing:"-.01em" }}>
            Tracking &amp; Approval
          </h1>
          <div style={{ fontSize:12.5, color:T.fgMuted, marginTop:1 }}>
            {greeting}, {profile?.full_name?.split(" ")[0]||"Administrator"} · {counts.inQueue} item{counts.inQueue!==1?"s":""} need{counts.inQueue===1?"s":""} your action
          </div>
        </div>

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.fgDim, pointerEvents:"none" }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search queue, approvals…"
              style={{ width:240, padding:"8px 12px 8px 32px", border:`1px solid ${T.border}`, borderRadius:T.r, fontSize:13, background:T.bg, color:T.fg, outline:"none", boxSizing:"border-box", fontFamily:V.font }}/>
            {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.fgDim,fontSize:16,lineHeight:1 }}>×</button>}
          </div>
          <button onClick={load} disabled={loading}
            style={{ padding:"8px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:T.r,color:T.fgMuted,fontSize:12.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
            <RefreshCw size={13} style={{ animation:loading?"spin 1s linear infinite":"none" }}/> Refresh
          </button>
          <QuickStampButton label="Official Stamp" size="md" variant="outline"/>
        </div>
      </div>

      <div style={{ padding:"22px 28px 36px", maxWidth:1400, margin:"0 auto" }}>

        {/* ── KPI band ──────────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:12, marginBottom:20 }}>
          {[
            { label:"In Approval Queue", val:counts.inQueue, color:"#8764b8", icon:Inbox,        hot:queue.some(q=>q.priority==="urgent") },
            { label:"Pending Reqs",      val:counts.reqs,    color:"#0078d4", icon:ShoppingCart,  hot:false },
            { label:"Pending POs",       val:counts.pos,     color:"#107c10", icon:FileText,      hot:false },
            { label:"Pending GRNs",      val:counts.grns,    color:"#ca5010", icon:Package,       hot:false },
          ].map(b=>(
            <div key={b.label} style={{ background:T.card, border:`1px solid ${b.hot?"#dc262655":T.border}`, borderRadius:T.rLg, padding:"14px 16px", boxShadow:T.shadow, position:"relative", display:"flex", alignItems:"center", gap:12 }}>
              {b.hot&&<span style={{ position:"absolute",top:-8,right:12,background:"#dc2626",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:99,letterSpacing:".02em" }}>URGENT</span>}
              <div style={{ width:38, height:38, borderRadius:T.rMd, background:`${b.color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <b.icon size={18} color={b.color}/>
              </div>
              <div>
                <div style={{ fontSize:23, fontWeight:800, color:T.fg, lineHeight:1.1 }}>{loading?"—":b.val}</div>
                <div style={{ fontSize:11, color:T.fgMuted, fontWeight:600, marginTop:1 }}>{b.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Signature: Procure-to-Pay pipeline tracker ───────────────── */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl, boxShadow:T.shadow, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.fg }}>Procure-to-Pay Pipeline</div>
            <div style={{ fontSize:11.5, color:T.fgDim }}>Live document flow across every stage</div>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:0, overflowX:"auto" }}>
            {PIPELINE.map((stage,i)=>(
              <div key={stage.label} style={{ display:"flex", alignItems:"flex-start", flex:i<PIPELINE.length-1?1:"0 0 auto", minWidth:i<PIPELINE.length-1?140:120 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, minWidth:104 }}>
                  <div style={{
                    width:52, height:52, borderRadius:"50%",
                    background: stage.count>0 ? `${stage.color}16` : T.bg2,
                    border:`2px solid ${stage.count>0?stage.color:T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    position:"relative", transition:"all .2s",
                  }}>
                    <stage.icon size={20} color={stage.count>0?stage.color:T.fgDim} strokeWidth={1.75}/>
                    {stage.count>0&&(
                      <span style={{ position:"absolute", top:-6, right:-6, background:stage.color, color:"#fff", fontSize:10.5, fontWeight:800, minWidth:20, height:20, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px", border:`2px solid ${T.card}` }}>
                        {loading?"–":stage.count}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.fg, whiteSpace:"nowrap" }}>{stage.label}</div>
                    <div style={{ fontSize:10.5, color:T.fgDim, marginTop:1, whiteSpace:"nowrap" }}>{stage.sub}</div>
                  </div>
                </div>
                {i<PIPELINE.length-1&&(
                  <div style={{ flex:1, display:"flex", alignItems:"center", height:52, minWidth:36, position:"relative", top:0 }}>
                    <div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${stage.color}55, ${PIPELINE[i+1].color}55)`, position:"relative" }}>
                      <ArrowRight size={13} color={T.fgDim} style={{ position:"absolute", right:-2, top:"50%", transform:"translateY(-50%)" }}/>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.fgDim, textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>Quick access</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {TILES.map(t=>(
              <button key={t.path} onClick={()=>nav(t.path)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px 8px 8px", background:T.card, border:`1px solid ${T.border}`, borderRadius:99, cursor:"pointer", transition:"all .15s", boxShadow:T.shadow }}
                onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.borderColor=t.color; el.style.transform="translateY(-1px)"; el.style.boxShadow=T.shadowMd; }}
                onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.borderColor=T.border; el.style.transform="none"; el.style.boxShadow=T.shadow; }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:`${t.color}16`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <t.icon size={13} color={t.color} strokeWidth={2}/>
                </div>
                <span style={{ color:T.fg, fontSize:12.5, fontWeight:600, whiteSpace:"nowrap" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabs + filter ─────────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:16 }}>
          <div style={{ display:"flex", gap:4, background:T.bg2, padding:4, borderRadius:T.rLg }}>
            {TAB_DEFS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
                style={{ padding:"7px 14px", background:activeTab===tab.id?T.card:"transparent", border:"none", borderRadius:T.rMd, cursor:"pointer", fontSize:12.5, fontWeight:activeTab===tab.id?700:600, color:activeTab===tab.id?T.fg:T.fgMuted, display:"flex",alignItems:"center",gap:7, transition:"all .12s", boxShadow:activeTab===tab.id?T.shadow:"none" }}>
                {tab.id==="queue"&&<Inbox size={13}/>}
                {tab.id==="pending"&&<Clock size={13}/>}
                {tab.id==="stamp"&&<Stamp size={13}/>}
                {tab.label}
                {tab.count>0&&<span style={{ fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:99,background:tab.urgent?"#dc2626":activeTab===tab.id?T.primary:T.bg2,color:tab.urgent||activeTab===tab.id?"#fff":T.fgMuted }}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {activeTab==="queue"&&(
            <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:"auto" }}>
              <Filter size={12} color={T.fgDim}/>
              {["all","urgent","high","normal","low"].map(p=>(
                <button key={p} onClick={()=>setQFilter(p)}
                  style={{ padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:700, border:"none", cursor:"pointer",
                    background:qFilter===p?(PRIO_STYLE[p]?.bg||T.primaryBg):"transparent",
                    color:qFilter===p?(PRIO_STYLE[p]?.color||T.primary):T.fgDim }}>
                  {p==="all"?"All":p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── TAB: Approval Queue ─────────────────────────────────────── */}
        {activeTab==="queue"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:12, color:T.fgMuted }}>
              <span>{filteredQueue.length} item{filteredQueue.length!==1?"s":""} awaiting action</span>
              <span style={{ color:T.fgDim }}>Pushed at</span>
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:T.fgDim }}>
                <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }}/>
                <div style={{ marginTop:10, fontSize:13 }}>Loading…</div>
              </div>
            ) : filteredQueue.length===0 ? (
              <div style={{ textAlign:"center", padding:"56px 0", color:T.fgDim, background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl }}>
                <Inbox size={36} style={{ opacity:.3 }}/>
                <div style={{ marginTop:12, fontSize:14, fontWeight:700, color:T.fgMuted }}>Approval queue is empty</div>
                <div style={{ fontSize:12, marginTop:4 }}>Documents pushed from any page appear here for action</div>
              </div>
            ) : (
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl, boxShadow:T.shadow, overflow:"hidden" }}>
                {filteredQueue.map((item,i)=>{
                  const meta = DOC_META[item.document_type]||DOC_META.requisition;
                  const prio = PRIO_STYLE[item.priority]||PRIO_STYLE.normal;
                  const busy = resolving===item.id;
                  return (
                    <div key={item.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:i<filteredQueue.length-1?`1px solid ${T.border}`:"none", transition:"background .12s" }}
                      onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=T.bg; }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>

                      {/* Type icon */}
                      <div style={{ width:40,height:40,background:`${meta.color}16`,borderRadius:T.rMd,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <meta.icon size={18} color={meta.color} strokeWidth={1.75}/>
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13.5, color:T.fg, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}
                            onClick={()=>nav(meta.path)}>
                            {item.document_number} {item.document_title&&item.document_title!==item.document_number?`— ${item.document_title}`:""}
                          </span>
                          <span style={{ fontSize:9.5,fontWeight:800,padding:"2px 7px",borderRadius:99,background:prio.bg,color:prio.color,flexShrink:0,textTransform:"uppercase",letterSpacing:".02em" }}>
                            {item.priority}
                          </span>
                        </div>
                        <div style={{ fontSize:11.5, color:T.fgDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {meta.label} · {item.department||"General"}
                          {item.amount>0&&` · KES ${Number(item.amount).toLocaleString()}`}
                          {item.pushed_by_name&&` · Pushed by ${item.pushed_by_name}`}
                        </div>
                        {item.notes&&<div style={{ fontSize:11.5,color:T.warning,marginTop:3,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📝 {item.notes}</div>}
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <button onClick={()=>resolveQueue(item,"approved")} disabled={busy}
                          style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:busy?T.bg2:T.success,color:"#fff",border:"none",borderRadius:T.r,fontSize:12,fontWeight:700,cursor:busy?"default":"pointer" }}>
                          <CheckCircle2 size={13}/> Approve
                        </button>
                        <button onClick={()=>resolveQueue(item,"rejected")} disabled={busy}
                          style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:busy?T.bg2:"transparent",color:busy?T.fgDim:T.error,border:`1px solid ${busy?T.border:T.error}55`,borderRadius:T.r,fontSize:12,fontWeight:700,cursor:busy?"default":"pointer" }}>
                          <XCircle size={13}/> Reject
                        </button>
                      </div>

                      {/* Timestamp */}
                      <div style={{ fontSize:11.5,color:T.fgDim,flexShrink:0,textAlign:"right",minWidth:78 }}>
                        {item.pushed_at?new Date(item.pushed_at).toLocaleDateString("en-KE",{day:"numeric",month:"short"}):"—"}
                        <div style={{ fontSize:9.5, color:T.fgDim }}>
                          {item.pushed_at?new Date(item.pushed_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}):""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Pending Approvals ─────────────────────────────────── */}
        {activeTab==="pending"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:12, color:T.fgMuted }}>
              <span>Your pending requisition approvals</span>
              <span style={{ color:T.fgDim }}>Submitted date</span>
            </div>
            {loading?(
              <div style={{ textAlign:"center",padding:"48px 0",color:T.fgDim }}>
                <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }}/><div style={{ marginTop:10,fontSize:13 }}>Loading…</div>
              </div>
            ):filteredPending.length===0?(
              <div style={{ textAlign:"center",padding:"56px 0",color:T.fgDim, background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl }}>
                <CheckCircle2 size={36} color={T.success} style={{ opacity:.5 }}/>
                <div style={{ marginTop:12,fontSize:14,fontWeight:700, color:T.fgMuted }}>All caught up!</div>
                <div style={{ fontSize:12,marginTop:4 }}>No pending approvals{search?` matching "${search}"`:"."}</div>
              </div>
            ):(
              <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rXl,boxShadow:T.shadow, overflow:"hidden" }}>
                {filteredPending.map((r,i)=>(
                  <div key={r.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<filteredPending.length-1?`1px solid ${T.border}`:"none",transition:"background .12s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=T.bg; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                    <div style={{ width:40,height:40,background:`${T.primary}16`,borderRadius:T.rMd,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <ShoppingCart size={18} color={T.primary} strokeWidth={1.75}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13.5,color:T.fg,fontWeight:700,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} onClick={()=>nav("/requisitions")}>
                        {r.requisition_number||`REQ/${r.department||"General"}`} — {r.title||"Procurement Request"}
                      </div>
                      <div style={{ fontSize:11.5,color:T.fgDim,marginTop:2 }}>
                        Requisitions · {r.department||"General"}
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                      <button onClick={()=>approve(r.id)} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:T.success,color:"#fff",border:"none",borderRadius:T.r,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                        <CheckCircle2 size={13}/> Approve
                      </button>
                      <button onClick={()=>reject(r.id)} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:"transparent",color:T.error,border:`1px solid ${T.error}55`,borderRadius:T.r,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                        <XCircle size={13}/> Reject
                      </button>
                    </div>
                    <div style={{ fontSize:11.5,color:T.fgDim,flexShrink:0,minWidth:78,textAlign:"right" }}>
                      {r.created_at?new Date(r.created_at).toLocaleDateString("en-KE",{day:"numeric",month:"short"}):"—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading&&filteredPending.length>0&&(
              <button onClick={()=>nav("/requisitions")} style={{ marginTop:14,display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:T.primary,fontSize:13,fontWeight:600,cursor:"pointer",padding:0 }}>
                View all requisitions <ArrowUpRight size={14}/>
              </button>
            )}
          </>
        )}

        {/* ── TAB: Awaiting Stamp ─────────────────────────────────────── */}
        {activeTab==="stamp"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:12, color:T.fgMuted }}>
              <span>Approved documents awaiting official stamp</span>
              <span style={{ color:T.fgDim }}>{stampDocs.length} document{stampDocs.length!==1?"s":""}</span>
            </div>
            {loading?(
              <div style={{ textAlign:"center",padding:"48px 0",color:T.fgDim }}>
                <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }}/><div style={{ marginTop:10,fontSize:13 }}>Loading…</div>
              </div>
            ):stampDocs.length===0?(
              <div style={{ textAlign:"center",padding:"56px 0",color:T.fgDim, background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl }}>
                <Stamp size={36} color="#8764b8" style={{ opacity:.5 }}/>
                <div style={{ marginTop:12,fontSize:14,fontWeight:700, color:T.fgMuted }}>Nothing awaiting a stamp</div>
              </div>
            ):(
              <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rXl,boxShadow:T.shadow, overflow:"hidden" }}>
                {stampDocs.map((row,i)=>(
                  <div key={row.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<stampDocs.length-1?`1px solid ${T.border}`:"none",transition:"background .12s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=T.bg; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                    <div style={{ width:40,height:40,background:`${row.color}16`,borderRadius:T.rMd,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <row.icon size={18} color={row.color} strokeWidth={1.75}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13.5,color:T.fg,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {row.title} <span style={{ color:T.success, fontWeight:600 }}>· {row.label}</span>
                      </div>
                      <div style={{ fontSize:11.5,color:T.fgDim,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {row.meta}{row.by?` · by ${row.by}`:""}
                      </div>
                    </div>
                    <div style={{ flexShrink:0,opacity:stampingId===row.id?.4:0.85,transition:"opacity .3s" }}>
                      <DocumentStamp status={row.label.toLowerCase()} size={50} rotate={-8}/>
                    </div>
                    <button onClick={()=>stampItem(row.table,row.id,row.label)} disabled={stampingId===row.id}
                      style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 13px",background:stampingId===row.id?"#a496c4":"#8764b8",color:"#fff",border:"none",borderRadius:T.r,fontSize:12,fontWeight:700,cursor:stampingId===row.id?"default":"pointer",flexShrink:0 }}>
                      <Stamp size={13}/>{stampingId===row.id?"Stamping…":"Stamp"}
                    </button>
                    <div style={{ fontSize:11.5,color:T.fgDim,flexShrink:0,minWidth:78,textAlign:"right" }}>
                      {row.date?new Date(row.date).toLocaleDateString("en-KE",{day:"numeric",month:"short"}):"—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <BrandConfirmation
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message}
        status={confirm?.status || "success"}
        autoDismissMs={3500}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
