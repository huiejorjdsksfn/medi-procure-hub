/**
 * EL5 MediProcure — Tracking & Approval Portal v2
 * O365-style portal with prominent Approval Queue inbox
 * Documents pushed from any page appear here for action
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DocumentStamp, QuickStampButton } from "@/components/DocumentStamp";
import {
  ShoppingCart, FileText, Package, Users, Bell, AlertTriangle,
  Database, CheckCircle2, XCircle, RefreshCw, Search, BarChart3,
  Settings, Shield, ClipboardList, Send, Stamp, Eye, ArrowRight,
  Clock, CheckSquare, Home, Inbox, ChevronRight, Tag, Filter,
} from "lucide-react";

const db = supabase as any;

const O = {
  hero:"#107C73", topBar:"#0a5a52", white:"#ffffff",
  bg:"#f3f2f1", card:"#ffffff", border:"#edebe9",
  text:"#323130", textSub:"#605e5c", textMt:"#a19f9d",
  blue:"#0078d4", shadow:"0 1.6px 3.6px rgba(0,0,0,.13)",
  shadowHov:"0 6.4px 14.4px rgba(0,0,0,.18)",
  font:"'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

const TILES = [
  { label:"Requisitions",    icon:ShoppingCart, color:"#0078d4", path:"/requisitions"    },
  { label:"Purchase Orders", icon:FileText,     color:"#107c10", path:"/purchase-orders"  },
  { label:"GRN Tracking",    icon:Package,      color:"#ca5010", path:"/goods-received"  },
  { label:"Bulk Approve",    icon:CheckSquare,  color:"#8764b8", path:"/tracking-approval"},
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
      await load();
    } catch(e:any){
      toast({ title:"Action failed", description:e.message, variant:"destructive" });
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
      await load();
    } catch(e:any){ toast({ title:"Stamp failed", description:e.message, variant:"destructive" }); }
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

  return (
    <div style={{ background:O.bg, minHeight:"100vh", fontFamily:O.font, color:O.text }}>

      {/* Top bar */}
      <div style={{ background:O.topBar, height:44, display:"flex", alignItems:"center", padding:"0 24px", gap:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,5px)", gap:2 }}>
          {Array(9).fill(0).map((_,i)=><div key={i} style={{ width:5,height:5,background:"rgba(255,255,255,.7)",borderRadius:1 }}/>)}
        </div>
        <span style={{ color:O.white, fontWeight:700, fontSize:14, marginLeft:6 }}>EL5 MediProcure</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
          <button onClick={()=>nav("/notifications")} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",display:"flex" }}><Bell size={16}/></button>
          <button onClick={()=>nav("/settings")} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",display:"flex" }}><Settings size={16}/></button>
          <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:O.white,fontWeight:700,fontSize:11 }}>{(profile?.full_name||"A").charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Teal hero */}
      <div style={{ background:O.hero, padding:"28px 24px 34px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:16 }}>
          <div>
            <h1 style={{ color:O.white, fontSize:24, fontWeight:300, margin:"0 0 4px", letterSpacing:"-.02em" }}>
              {greeting}, {profile?.full_name?.split(" ")[0]||"Administrator"}
            </h1>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:12 }}>
              Tracking & Approval Portal · {counts.inQueue} item{counts.inQueue!==1?"s":""} in queue
            </div>
          </div>
          <QuickStampButton label="Official Stamp" size="md" variant="outline"/>
        </div>
        {/* Search */}
        <div style={{ position:"relative", maxWidth:400, display:"flex", gap:8 }}>
          <div style={{ position:"relative", flex:1 }}>
            <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:O.textMt, pointerEvents:"none" }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search queue, approvals…"
              style={{ width:"100%", padding:"8px 16px 8px 30px", border:"1px solid rgba(255,255,255,.4)", borderRadius:2, fontSize:13, background:O.white, color:O.text, outline:"none", boxSizing:"border-box", fontFamily:O.font }}/>
            {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:O.textMt,fontSize:16,lineHeight:1 }}>×</button>}
          </div>
          <button onClick={load} disabled={loading}
            style={{ padding:"8px 12px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:2,color:O.white,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
            <RefreshCw size={11} style={{ animation:loading?"spin 1s linear infinite":"none" }}/> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding:"0 24px 32px" }}>

        {/* KPI strip */}
        <div style={{ display:"flex", gap:10, marginTop:16, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { label:"In Approval Queue", val:counts.inQueue, color:"#0078d4", hot:queue.some(q=>q.priority==="urgent") },
            { label:"Pending Reqs",      val:counts.reqs,    color:"#ca5010", hot:false },
            { label:"Pending POs",       val:counts.pos,     color:"#107c10", hot:false },
            { label:"Pending GRNs",      val:counts.grns,    color:"#8764b8", hot:false },
          ].map(b=>(
            <div key={b.label} style={{ background:O.card, border:`1px solid ${b.hot?"#dc2626":O.border}`, borderTop:`3px solid ${b.color}`, borderRadius:2, padding:"10px 16px", boxShadow:O.shadow, position:"relative" }}>
              {b.hot&&<span style={{ position:"absolute",top:-8,right:8,background:"#dc2626",color:"#fff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:99 }}>URGENT</span>}
              <div style={{ fontSize:22, fontWeight:800, color:b.color }}>{loading?"—":b.val}</div>
              <div style={{ fontSize:10, color:O.textSub, fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* O365 tile grid */}
        <p style={{ fontSize:12, color:O.textSub, margin:"0 0 10px" }}>Quick access</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:24 }}>
          {TILES.map(t=>(
            <button key={t.path} onClick={()=>nav(t.path)}
              style={{ width:82,height:82,background:t.color,border:"none",borderRadius:2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",boxShadow:O.shadow,transition:"opacity .15s,transform .15s" }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity=".85"; el.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity="1"; el.style.transform="none"; }}>
              <t.icon size={22} color={O.white} strokeWidth={1.5}/>
              <span style={{ color:O.white,fontSize:10,fontWeight:700,textAlign:"center",lineHeight:1.2,padding:"0 3px" }}>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop:`1px solid ${O.border}`, marginBottom:16 }}/>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${O.border}`, marginBottom:18 }}>
          {TAB_DEFS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
              style={{ padding:"9px 16px", background:"none", border:"none", borderBottom:activeTab===tab.id?`2px solid ${O.blue}`:"2px solid transparent", cursor:"pointer", fontSize:12, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?O.blue:O.textSub, display:"flex",alignItems:"center",gap:6, transition:"color .1s", position:"relative", top:1 }}>
              {tab.id==="queue"&&<Inbox size={13}/>}
              {tab.id==="pending"&&<Clock size={13}/>}
              {tab.id==="stamp"&&<Stamp size={13}/>}
              {tab.label}
              {tab.count>0&&<span style={{ fontSize:10,fontWeight:800,padding:"0 5px",borderRadius:99,background:tab.urgent?"#dc2626":activeTab===tab.id?O.blue:"#e5e7eb",color:tab.urgent||activeTab===tab.id?"#fff":O.textSub }}>{tab.count}</span>}
            </button>
          ))}

          {activeTab==="queue"&&(
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, paddingBottom:6 }}>
              <Filter size={11} color={O.textMt}/>
              {["all","urgent","high","normal","low"].map(p=>(
                <button key={p} onClick={()=>setQFilter(p)}
                  style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, border:"none", cursor:"pointer",
                    background:qFilter===p?(PRIO_STYLE[p]?.bg||O.blueLt||"#deecf9"):"transparent",
                    color:qFilter===p?(PRIO_STYLE[p]?.color||O.blue):O.textMt }}>
                  {p==="all"?"All":p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── TAB: Approval Queue ─────────────────────────────────────── */}
        {activeTab==="queue"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:12, color:O.textSub }}>{filteredQueue.length} item{filteredQueue.length!==1?"s":""} awaiting action</span>
              <span style={{ fontSize:11, color:O.textMt }}>Pushed at</span>
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:"32px 0", color:O.textMt }}>
                <RefreshCw size={18} style={{ animation:"spin 1s linear infinite" }}/>
                <div style={{ marginTop:8, fontSize:13 }}>Loading…</div>
              </div>
            ) : filteredQueue.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:O.textMt }}>
                <Inbox size={36} style={{ opacity:.3 }}/>
                <div style={{ marginTop:10, fontSize:14, fontWeight:600 }}>Approval queue is empty</div>
                <div style={{ fontSize:12, marginTop:4 }}>Documents pushed from any page appear here for action</div>
              </div>
            ) : (
              <div style={{ background:O.card, border:`1px solid ${O.border}`, borderRadius:3, boxShadow:O.shadow }}>
                {filteredQueue.map((item,i)=>{
                  const meta = DOC_META[item.document_type]||DOC_META.requisition;
                  const prio = PRIO_STYLE[item.priority]||PRIO_STYLE.normal;
                  const busy = resolving===item.id;
                  return (
                    <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<filteredQueue.length-1?`1px solid ${O.border}`:"none", transition:"background .1s" }}
                      onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#f7f7f7"; }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>

                      {/* Type icon */}
                      <div style={{ width:38,height:38,background:meta.color,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <meta.icon size={17} color={O.white} strokeWidth={1.5}/>
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:13, color:O.blue, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}
                            onClick={()=>nav(meta.path)}>
                            {item.document_number} {item.document_title&&item.document_title!==item.document_number?`— ${item.document_title}`:""}
                          </span>
                          <span style={{ fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:99,background:prio.bg,color:prio.color,flexShrink:0,textTransform:"uppercase" }}>
                            {item.priority}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:O.textMt, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          EL5 MediProcure » {meta.label} » {item.department||"General"}
                          {item.amount>0&&` · KES ${Number(item.amount).toLocaleString()}`}
                          {item.pushed_by_name&&` · Pushed by ${item.pushed_by_name}`}
                        </div>
                        {item.notes&&<div style={{ fontSize:11,color:"#92400e",marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📝 {item.notes}</div>}
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                        <button onClick={()=>resolveQueue(item,"approved")} disabled={busy}
                          style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:busy?"#9ca3af":"#107c10",color:O.white,border:"none",borderRadius:2,fontSize:12,fontWeight:700,cursor:busy?"default":"pointer" }}>
                          <CheckCircle2 size={12}/> Approve
                        </button>
                        <button onClick={()=>resolveQueue(item,"rejected")} disabled={busy}
                          style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:busy?"#9ca3af":"#a4262c",color:O.white,border:"none",borderRadius:2,fontSize:12,fontWeight:700,cursor:busy?"default":"pointer" }}>
                          <XCircle size={12}/> Reject
                        </button>
                      </div>

                      {/* Timestamp */}
                      <div style={{ fontSize:11,color:O.textMt,flexShrink:0,textAlign:"right",minWidth:80 }}>
                        {item.pushed_at?new Date(item.pushed_at).toLocaleDateString("en-KE",{day:"numeric",month:"short"}):"—"}
                        <div style={{ fontSize:9,color:O.textMt }}>
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
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:12, color:O.textSub }}>Your pending requisition approvals</span>
              <span style={{ fontSize:11, color:O.textMt }}>Submitted date</span>
            </div>
            {loading?(
              <div style={{ textAlign:"center",padding:"32px 0",color:O.textMt }}>
                <RefreshCw size={18} style={{ animation:"spin 1s linear infinite" }}/><div style={{ marginTop:8,fontSize:13 }}>Loading…</div>
              </div>
            ):filteredPending.length===0?(
              <div style={{ textAlign:"center",padding:"40px 0",color:O.textMt }}>
                <CheckCircle2 size={32} color="#107c10" style={{ opacity:.5 }}/>
                <div style={{ marginTop:8,fontSize:14,fontWeight:600 }}>All caught up!</div>
                <div style={{ fontSize:12,marginTop:4 }}>No pending approvals{search?` matching "${search}"`:"."}</div>
              </div>
            ):(
              <div style={{ background:O.card,border:`1px solid ${O.border}`,borderRadius:3,boxShadow:O.shadow }}>
                {filteredPending.map((r,i)=>(
                  <div key={r.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<filteredPending.length-1?`1px solid ${O.border}`:"none",transition:"background .1s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#f7f7f7"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                    <div style={{ width:36,height:36,background:"#0078d4",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <ShoppingCart size={16} color={O.white} strokeWidth={1.5}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,color:O.blue,fontWeight:600,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} onClick={()=>nav("/requisitions")}>
                        {r.requisition_number||`REQ/${r.department||"General"}`} — {r.title||"Procurement Request"}
                      </div>
                      <div style={{ fontSize:11,color:O.textMt,marginTop:2 }}>
                        EL5 MediProcure » Requisitions » {r.department||"General"}
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                      <button onClick={()=>approve(r.id)} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:"#107c10",color:O.white,border:"none",borderRadius:2,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                        <CheckCircle2 size={12}/> Approve
                      </button>
                      <button onClick={()=>reject(r.id)} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:"#a4262c",color:O.white,border:"none",borderRadius:2,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                        <XCircle size={12}/> Reject
                      </button>
                    </div>
                    <div style={{ fontSize:11,color:O.textMt,flexShrink:0,minWidth:80,textAlign:"right" }}>
                      {r.created_at?new Date(r.created_at).toLocaleDateString("en-KE",{day:"numeric",month:"short"}):"—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading&&filteredPending.length>0&&(
              <button onClick={()=>nav("/requisitions")} style={{ marginTop:14,display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:O.blue,fontSize:13,fontWeight:600,cursor:"pointer",padding:0 }}>
                View all requisitions <ArrowRight size={13}/>
              </button>
            )}
          </>
        )}

        {/* ── TAB: Awaiting Stamp ─────────────────────────────────────── */}
        {activeTab==="stamp"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:12,color:O.textSub }}>Approved documents awaiting official stamp</span>
              <span style={{ fontSize:11,color:O.textMt }}>{stampDocs.length} document{stampDocs.length!==1?"s":""}</span>
            </div>
            {loading?(
              <div style={{ textAlign:"center",padding:"32px 0",color:O.textMt }}>
                <RefreshCw size={18} style={{ animation:"spin 1s linear infinite" }}/><div style={{ marginTop:8,fontSize:13 }}>Loading…</div>
              </div>
            ):stampDocs.length===0?(
              <div style={{ textAlign:"center",padding:"40px 0",color:O.textMt }}>
                <Stamp size={32} color="#8764b8" style={{ opacity:.5 }}/>
                <div style={{ marginTop:8,fontSize:14,fontWeight:600 }}>Nothing awaiting a stamp</div>
              </div>
            ):(
              <div style={{ background:O.card,border:`1px solid ${O.border}`,borderRadius:3,boxShadow:O.shadow }}>
                {stampDocs.map((row,i)=>(
                  <div key={row.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<stampDocs.length-1?`1px solid ${O.border}`:"none",transition:"background .1s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#f7f7f7"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                    <div style={{ width:36,height:36,background:row.color,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <row.icon size={16} color={O.white} strokeWidth={1.5}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,color:O.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {row.title} <span style={{ color:"#107c10" }}>· {row.label}</span>
                      </div>
                      <div style={{ fontSize:11,color:O.textMt,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {row.meta}{row.by?` · by ${row.by}`:""}
                      </div>
                    </div>
                    <div style={{ flexShrink:0,opacity:stampingId===row.id?.4:0.85,transition:"opacity .3s" }}>
                      <DocumentStamp status={row.label.toLowerCase()} size={50} rotate={-8}/>
                    </div>
                    <button onClick={()=>stampItem(row.table,row.id,row.label)} disabled={stampingId===row.id}
                      style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:stampingId===row.id?"#a496c4":"#8764b8",color:O.white,border:"none",borderRadius:2,fontSize:12,fontWeight:700,cursor:stampingId===row.id?"default":"pointer",flexShrink:0 }}>
                      <Stamp size={12}/>{stampingId===row.id?"Stamping…":"Stamp"}
                    </button>
                    <div style={{ fontSize:11,color:O.textMt,flexShrink:0,minWidth:80,textAlign:"right" }}>
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
    </div>
  );
}
