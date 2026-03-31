/**
 * ProcurBosse — Requisitions Page v3.0
 * ERP-style: status tabs, search bar, KPI tiles, professional table
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, Clock, ClipboardList, Send, AlertTriangle,
  Download, Edit3, ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement, sendNotification, triggerRequisitionEvent } from "@/lib/notify";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printRequisition } from "@/lib/printDocument";
import { useDepartments } from "@/hooks/useDropdownData";

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string,{bg:string;color:string;border:string;label:string;dot:string}> = {
  draft:     {bg:"#f1f5f9",      color:"#475569", border:"#cbd5e1", label:"Draft",     dot:"#94a3b8"},
  submitted: {bg:"#dbeafe",      color:"#1d4ed8", border:"#93c5fd", label:"Submitted", dot:"#3b82f6"},
  pending:   {bg:"#fef9c3",      color:"#854d0e", border:"#fde047", label:"Pending",   dot:"#eab308"},
  approved:  {bg:"#dcfce7",      color:"#15803d", border:"#86efac", label:"Approved",  dot:"#22c55e"},
  rejected:  {bg:"#fee2e2",      color:"#dc2626", border:"#fca5a5", label:"Rejected",  dot:"#ef4444"},
  ordered:   {bg:"#e0f2fe",      color:"#0369a1", border:"#7dd3fc", label:"Ordered",   dot:"#0ea5e9"},
  received:  {bg:"#d1fae5",      color:"#065f46", border:"#6ee7b7", label:"Received",  dot:"#10b981"},
};

// ── Styles ───────────────────────────────────────────────────────────────────
const CARD_STYLE: React.CSSProperties = {
  background:"#fff",
  border:"1px solid #e5e7eb",
  borderRadius:12,
  padding:"14px 18px",
  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
};

// ── Format helpers ────────────────────────────────────────────────────────────
const fmtKES = (n:number) => {
  if(n>=1_000_000) return `KES ${(n/1_000_000).toFixed(1)}M`;
  if(n>=1000)      return `KES ${(n/1000).toFixed(0)}K`;
  return `KES ${n.toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
};
const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";

export default function RequisitionsPage() {
  const { user, profile, roles } = useAuth();
  const canApprove = roles?.includes("admin")||roles?.includes("procurement_manager");
  const canCreate  = !roles?.includes("warehouse_officer");
  const { getSetting } = useSystemSettings();
  const { departments } = useDepartments();
  const currencySymbol = getSetting("currency_symbol","KES");

  const [reqs,       setReqs]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusTab,  setStatusTab]  = useState("all");
  const [priority,   setPriority]   = useState("all");
  const [viewReq,    setViewReq]    = useState<any>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editReq,    setEditReq]    = useState<any>(null);
  const [saving,     setSaving]     = useState(false);
  const [sortCol,    setSortCol]    = useState("created_at");
  const [sortAsc,    setSortAsc]    = useState(false);
  const [rejectId,   setRejectId]   = useState<string|null>(null);
  const [rejectReason,setRejectReason]=useState("");

  const EMPTY_FORM = {title:"",department:"",priority:"normal",notes:"",delivery_date:"",justification:"",cost_centre:"",fund_source:"County Fund"};
  const [form, setForm] = useState({...EMPTY_FORM});

  const load = useCallback(async ()=>{
    setLoading(true);
    const {data} = await (supabase as any).from("requisitions")
      .select("*,requisition_items(count)")
      .order(sortCol,{ascending:sortAsc});
    setReqs(data||[]);
    setLoading(false);
  },[sortCol,sortAsc]);

  useEffect(()=>{load();},[load]);

  // Real-time
  useEffect(()=>{
    const ch=(supabase as any).channel("reqs-v3").on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},load).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[load]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function approve(id:string){
    const req=reqs.find(r=>r.id===id);
    await (supabase as any).from("requisitions").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name,approved_at:new Date().toISOString()}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"approve","requisitions",id,{});
    triggerRequisitionEvent("approved", id, { approvedBy: user?.id }).catch(()=>{});
    toast({title:"✅ Requisition Approved"});
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Approved ✓",message:`Your requisition "${req.title||req.requisition_number}" has been approved.`,type:"success",module:"Procurement",actionUrl:"/requisitions"});
    load();
  }

  async function rejectConfirm(){
    if(!rejectId) return;
    const req=reqs.find(r=>r.id===rejectId);
    await (supabase as any).from("requisitions").update({status:"rejected",rejection_reason:rejectReason||"Rejected by manager"}).eq("id",rejectId);
    logAudit(user?.id,profile?.full_name,"reject","requisitions",rejectId,{reason:rejectReason});
    toast({title:"Requisition rejected"});
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Rejected",message:`Your requisition "${req.title||req.requisition_number}" was rejected. Reason: ${rejectReason||"See manager"}`,type:"error",module:"Procurement",actionUrl:"/requisitions"});
    setRejectId(null); setRejectReason(""); load();
  }

  async function submit(id:string){
    await (supabase as any).from("requisitions").update({status:"submitted"}).eq("id",id);
    toast({title:"Requisition submitted for approval"});
    await notifyProcurement({title:"New Requisition Submitted",message:`${profile?.full_name||"Staff"} submitted a requisition`,type:"procurement",module:"Procurement",actionUrl:"/requisitions"});
    load();
  }

  async function save(){
    if(!form.title.trim()){toast({title:"Requisition title is required",variant:"destructive"});return;}
    setSaving(true);
    const num = editReq?.requisition_number||`RQQ/EL5H/${new Date().getFullYear()}/${String(reqs.length+1).padStart(4,"0")}`;
    const payload={...form,requisition_number:num,status:editReq?.status||"draft",requested_by:user?.id,requester_name:profile?.full_name};
    let error:any;
    if(editReq){
      ({error}=await (supabase as any).from("requisitions").update(payload).eq("id",editReq.id));
    } else {
      ({error}=await (supabase as any).from("requisitions").insert(payload));
    }
    if(error){toast({title:"Save failed",description:error.message||"Database error",variant:"destructive"});setSaving(false);return;}
    toast({title:editReq?"Requisition updated ✓":"Requisition created ✓",description:num});
    setShowForm(false); setEditReq(null); setForm({...EMPTY_FORM}); load();
    setSaving(false);
  }

  function exportExcel(){
    const wb=XLSX.utils.book_new();
    const header=[[getSetting("hospital_name","Embu Level 5 Hospital")],[getSetting("system_name","EL5 MediProcure")+" — Requisitions Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows=filtered.map(r=>({
      "Req No":r.requisition_number,"Title":r.title,"Department":r.department||"","Priority":r.priority,
      "Status":r.status,"Requester":r.requester_name||"","Date":fmtDate(r.created_at),
      "Delivery Date":fmtDate(r.delivery_date),"Total Amount":r.total_amount||0,"Notes":r.notes||"",
    }));
    const ws=XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(ws,rows,{origin:"A5"});
    XLSX.utils.book_append_sheet(wb,ws,"Requisitions");
    XLSX.writeFile(wb,`Requisitions_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  }

  // ── Filter & stats ───────────────────────────────────────────────────────────
  const filtered = reqs.filter(r=>{
    if(statusTab!=="all"&&r.status!==statusTab) return false;
    if(priority!=="all"&&r.priority!==priority) return false;
    if(search){
      const q=search.toLowerCase();
      return (r.requisition_number||"").toLowerCase().includes(q)||(r.title||"").toLowerCase().includes(q)||(r.requester_name||"").toLowerCase().includes(q)||(r.department||"").toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b)=>{
    const va=a[sortCol]||""; const vb=b[sortCol]||"";
    return sortAsc?va.localeCompare(vb):vb.localeCompare(va);
  });

  const COUNTS={all:reqs.length,draft:reqs.filter(r=>r.status==="draft").length,submitted:reqs.filter(r=>r.status==="submitted").length,pending:reqs.filter(r=>r.status==="pending").length,approved:reqs.filter(r=>r.status==="approved").length,rejected:reqs.filter(r=>r.status==="rejected").length,ordered:reqs.filter(r=>r.status==="ordered").length};
  const totalValue=reqs.reduce((s,r)=>s+Number(r.total_amount||0),0);
  const approvedValue=reqs.filter(r=>r.status==="approved").reduce((s,r)=>s+Number(r.total_amount||0),0);
  const pendingCount=COUNTS.submitted+COUNTS.pending;

  const toggleSort=(col:string)=>{if(sortCol===col)setSortAsc(a=>!a);else{setSortCol(col);setSortAsc(true);}};
  const SortInd=({col}:{col:string})=>sortCol===col?<span style={{fontSize:9,marginLeft:3}}>{sortAsc?"▲":"▼"}</span>:null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#0d1b35",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* ── KPI TILES ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:0,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        {[
          {label:"Total Value",     val:fmtKES(totalValue),    bg:"#dc2626",  icon:"💰"},
          {label:"Approved Value",  val:fmtKES(approvedValue), bg:"#059669",  icon:"✅"},
          {label:"Pending Approval",val:String(pendingCount),  bg:"#d97706",  icon:"⏳"},
          {label:"Total Records",   val:String(reqs.length),   bg:"#6366f1",  icon:"📋"},
          {label:"Approved",        val:String(COUNTS.approved),bg:"#0078d4", icon:"👍"},
        ].map((kpi,i)=>(
          <div key={i} style={{background:kpi.bg,color:"#fff",padding:"14px 18px",textAlign:"center",borderRight:i<4?"1px solid rgba(255,255,255,0.15)":"none"}}>
            <div style={{fontSize:9,fontWeight:600,opacity:0.8,letterSpacing:"0.06em",textTransform:"uppercase"}}>{kpi.label}</div>
            <div style={{fontSize:20,fontWeight:900,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* ── PAGE HEADER ── */}
      <div style={{padding:"16px 20px 0",display:"flex",alignItems:"center",gap:10,background:"transparent"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#059669,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ClipboardList style={{width:18,height:18,color:"#fff"}}/>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>Requisitions</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Purchase requisition management · {reqs.length} records</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>exportExcel()} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:12,fontWeight:600,color:"#e2e8f0"}}>
            <Download style={{width:13,height:13}}/> Export
          </button>
          <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:12,fontWeight:600,color:"#e2e8f0"}}>
            <RefreshCw style={{width:13,height:13}}/> Refresh
          </button>
          {canCreate&&(
            <button onClick={()=>{setEditReq(null);setForm({...EMPTY_FORM});setShowForm(true);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#059669,#0d9488)",cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff",boxShadow:"0 2px 8px rgba(5,150,105,0.35)"}}>
              <Plus style={{width:14,height:14}}/> New Requisition
            </button>
          )}
        </div>
      </div>

      {/* ── STATUS TABS ── */}
      <div style={{padding:"10px 20px 0",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" as const,background:"transparent"}}>
        {Object.entries({all:"All",...Object.fromEntries(Object.entries(STATUS_CFG).map(([k,v])=>[k,v.label]))}).map(([key,label])=>{
          const cnt=COUNTS[key as keyof typeof COUNTS]??0;
          const isActive=statusTab===key;
          const cfg=STATUS_CFG[key];
          return (
            <button key={key} onClick={()=>setStatusTab(key)}
              style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isActive?(cfg?.border||"#3b82f6"):"#e5e7eb"}`,background:isActive?(cfg?.bg||"#dbeafe"):"rgba(255,255,255,0.06)",cursor:"pointer",fontSize:12,fontWeight:isActive?700:500,color:isActive?(cfg?.color||"#1d4ed8"):"#6b7280",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
              {cfg?.dot&&isActive&&<span style={{width:6,height:6,borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>}
              {label} ({key==="all"?reqs.length:cnt})
            </button>
          );
        })}
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <select value={priority} onChange={e=>setPriority(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",fontSize:12,color:"#e2e8f0",cursor:"pointer"}}>
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div style={{padding:"10px 20px"}}>
        <div style={{position:"relative",maxWidth:"100%"}}>
          <Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:15,height:15,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requisition number, title, requester, department…"
            style={{width:"100%",padding:"9px 12px 9px 36px",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,background:"rgba(255,255,255,0.08)",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:2}}><X style={{width:14,height:14,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={{margin:"0 20px 20px",background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 4px 20px rgba(0,0,0,0.4)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:"2px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)"}}>
                {[
                  {col:"requisition_number",label:"REQ NO",    w:150},
                  {col:"title",            label:"TITLE",      w:220},
                  {col:"department",       label:"DEPARTMENT", w:120},
                  {col:"priority",         label:"PRIORITY",   w:90},
                  {col:"requester_name",   label:"REQUESTER",  w:140},
                  {col:"created_at",       label:"DATE",       w:100},
                  {col:"delivery_date",    label:"DELIVERY",   w:100},
                  {col:"total_amount",     label:"AMOUNT",     w:110},
                  {col:"status",           label:"STATUS",     w:110},
                  {col:"",                 label:"ACTIONS",    w:90},
                ].map(h=>(
                  <th key={h.col} onClick={()=>h.col&&toggleSort(h.col)}
                    style={{padding:"10px 14px",textAlign:"left",fontSize:10.5,fontWeight:700,color:"#9ca3af",letterSpacing:"0.06em",whiteSpace:"nowrap",cursor:h.col?"pointer":"default",userSelect:"none",width:h.w}}>
                    {h.label}{h.col&&<SortInd col={h.col}/>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading&&(
                <tr><td colSpan={10} style={{padding:40,textAlign:"center",color:"#9ca3af",fontSize:13}}>Loading requisitions…</td></tr>
              )}
              {!loading&&filtered.length===0&&(
                <tr><td colSpan={10} style={{padding:40,textAlign:"center"}}>
                  <ClipboardList style={{width:32,height:32,color:"#d1d5db",display:"block",margin:"0 auto 8px"}}/>
                  <div style={{fontSize:13,color:"#9ca3af"}}>No requisitions found{search?` for "${search}"`:""}.</div>
                  {canCreate&&!search&&<button onClick={()=>setShowForm(true)} style={{marginTop:12,padding:"7px 16px",borderRadius:8,border:"none",background:"#059669",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>Create First Requisition</button>}
                </td></tr>
              )}
              {!loading&&filtered.map((r,ri)=>{
                const cfg=STATUS_CFG[r.status]||STATUS_CFG.draft;
                const isPending=r.status==="submitted"||r.status==="pending";
                const isDraft=r.status==="draft";
                const prioColor={urgent:"#dc2626",high:"#d97706",normal:"#059669",low:"#6b7280"}[r.priority as string]||"#6b7280";

                return (
                  <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:ri%2===0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.06)",transition:"background 0.1s"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(59,130,246,0.15)")}
                    onMouseLeave={e=>(e.currentTarget.style.background=ri%2===0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.06)")}>

                    <td style={{padding:"10px 14px",fontWeight:700,color:"#60a5fa",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap",fontSize:12}}>
                      {r.requisition_number||"—"}
                    </td>
                    <td style={{padding:"10px 14px",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      <div style={{fontWeight:600,color:"#f1f5f9",fontSize:12}}>{r.title||"Untitled"}</div>
                      {r.notes&&<div style={{fontSize:10,color:"#9ca3af",marginTop:1,overflow:"hidden",textOverflow:"ellipsis"}}>{r.notes.slice(0,50)}</div>}
                    </td>
                    <td style={{padding:"10px 14px",color:"rgba(255,255,255,0.45)",fontSize:12,whiteSpace:"nowrap"}}>{r.department||"—"}</td>
                    <td style={{padding:"10px 14px"}}>
                      <span style={{padding:"2px 8px",borderRadius:12,background:`${prioColor}18`,color:prioColor,fontSize:10,fontWeight:700,textTransform:"capitalize"}}>{r.priority||"normal"}</span>
                    </td>
                    <td style={{padding:"10px 14px",color:"#94a3b8",fontSize:12,whiteSpace:"nowrap"}}>{r.requester_name||"—"}</td>
                    <td style={{padding:"10px 14px",color:"rgba(255,255,255,0.45)",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(r.created_at)}</td>
                    <td style={{padding:"10px 14px",color:"rgba(255,255,255,0.45)",fontSize:11,whiteSpace:"nowrap"}}>{r.delivery_date?fmtDate(r.delivery_date):"—"}</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:"#f1f5f9",fontSize:12,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>
                      {r.total_amount?`${currencySymbol} ${Number(r.total_amount).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:16,background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:600,border:`1px solid ${cfg.border}`}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                        <button title="View" onClick={()=>setViewReq(r)} style={{padding:5,borderRadius:6,border:"none",background:"#f0f9ff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Eye style={{width:13,height:13,color:"#0369a1"}}/>
                        </button>
                        {(isDraft||r.requested_by===user?.id)&&(
                          <button title="Edit" onClick={()=>{setEditReq(r);setForm({title:r.title||"",department:r.department||"",priority:r.priority||"normal",notes:r.notes||"",delivery_date:r.delivery_date||"",justification:r.justification||"",cost_centre:r.cost_centre||"",fund_source:r.fund_source||"County Fund"});setShowForm(true);}} style={{padding:5,borderRadius:6,border:"none",background:"#f0fdf4",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Edit3 style={{width:13,height:13,color:"#059669"}}/>
                          </button>
                        )}
                        {isDraft&&(
                          <button title="Submit" onClick={()=>submit(r.id)} style={{padding:5,borderRadius:6,border:"none",background:"#eff6ff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Send style={{width:13,height:13,color:"#3b82f6"}}/>
                          </button>
                        )}
                        {isPending&&canApprove&&(
                          <>
                            <button title="Approve" onClick={()=>approve(r.id)} style={{padding:5,borderRadius:6,border:"none",background:"#f0fdf4",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <CheckCircle style={{width:13,height:13,color:"#059669"}}/>
                            </button>
                            <button title="Reject" onClick={()=>setRejectId(r.id)} style={{padding:5,borderRadius:6,border:"none",background:"#fff1f2",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <XCircle style={{width:13,height:13,color:"#dc2626"}}/>
                            </button>
                          </>
                        )}
                        <button title="Print" onClick={()=>printRequisition(r,{hospitalName:getSetting("hospital_name","Embu Level 5 Hospital"),sysName:getSetting("system_name","EL5 MediProcure"),docFooter:getSetting("doc_footer",""),currencySymbol,logoUrl:getSetting("logo_url")||getSetting("system_logo_url")||"",printFont:getSetting("print_font","Times New Roman"),printFontSize:getSetting("print_font_size","11"),showStamp:getSetting("show_stamp","true")==="true"})} style={{padding:5,borderRadius:6,border:"none",background:"#fefce8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Printer style={{width:13,height:13,color:"#ca8a04"}}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div style={{padding:"8px 16px",borderTop:"1px solid rgba(255,255,255,0.07)",background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:"#9ca3af"}}>
          <span>Showing {filtered.length} of {reqs.length} requisitions</span>
          <span>{reqs.length>0&&`Total value: ${fmtKES(totalValue)}`}</span>
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#059669,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ClipboardList style={{width:18,height:18,color:"#fff"}}/>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>{editReq?"Edit Requisition":"New Requisition"}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>Embu Level 5 Hospital · {editReq?.requisition_number||"New"}</div>
              </div>
              <button onClick={()=>{setShowForm(false);setEditReq(null);setForm({...EMPTY_FORM});}} style={{marginLeft:"auto",padding:8,borderRadius:8,border:"none",background:"#f3f4f6",cursor:"pointer",lineHeight:0}}>
                <X style={{width:16,height:16,color:"rgba(255,255,255,0.45)"}}/>
              </button>
            </div>
            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[
                {k:"title",l:"Requisition Title *",p:"e.g. Medical Supplies — Pharmacy",span:2,req:true},
                {k:"department",l:"Department",p:"e.g. Pharmacy",span:1},
                {k:"priority",l:"Priority",p:"",span:1,type:"select",opts:["urgent","high","normal","low"]},
                {k:"delivery_date",l:"Required By Date",p:"",span:1,type:"date"},
                {k:"cost_centre",l:"Cost Centre",p:"e.g. PHARM-001",span:1},
                {k:"fund_source",l:"Fund Source",p:"County Fund",span:1,type:"select",opts:["County Fund","National Fund","Donor Fund","NHIF","Other"]},
                {k:"justification",l:"Justification",p:"Why is this needed?",span:2,type:"textarea"},
                {k:"notes",l:"Additional Notes",p:"Any other information…",span:2,type:"textarea"},
              ].map(field=>(
                <div key={field.k} style={{gridColumn:field.span===2?"span 2":"span 1"}}>
                  <label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#94a3b8",marginBottom:4}}>{field.l}</label>
                  {field.type==="select"?(
                    <select value={(form as any)[field.k]||""} onChange={e=>setForm(p=>({...p,[field.k]:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none"}}>
                      {field.opts?.map(o=><option key={o} value={o} style={{textTransform:"capitalize"}}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  ):field.type==="textarea"?(
                    <textarea value={(form as any)[field.k]||""} onChange={e=>setForm(p=>({...p,[field.k]:e.target.value}))} placeholder={field.p} rows={2} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                  ):(
                    <input type={field.type||"text"} value={(form as any)[field.k]||""} onChange={e=>setForm(p=>({...p,[field.k]:e.target.value}))} placeholder={field.p} style={{width:"100%",padding:"8px 10px",border:`1.5px solid ${field.req&&!(form as any)[field.k]?"#fca5a5":"#e5e7eb"}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid #f3f4f6",display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowForm(false);setEditReq(null);setForm({...EMPTY_FORM});}} style={{padding:"9px 20px",borderRadius:9,border:"1px solid #d1d5db",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:13,fontWeight:600,color:"#e2e8f0"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{padding:"9px 22px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#059669,#0d9488)",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",opacity:saving?0.7:1}}>
                {saving?"Saving…":editReq?"Update Requisition":"Create Requisition"}
              </button>
              {!editReq&&(
                <button onClick={async()=>{await save();/* submit after save handled by status */}} disabled={saving} style={{padding:"9px 22px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",opacity:saving?0.7:1}}>
                  Save &amp; Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW DETAIL MODAL ── */}
      {viewReq&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:700,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0369a1,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ClipboardList style={{width:18,height:18,color:"#fff"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{viewReq.requisition_number}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>{viewReq.title}</div>
              </div>
              <span style={{padding:"4px 12px",borderRadius:16,background:STATUS_CFG[viewReq.status]?.bg||"#f3f4f6",color:STATUS_CFG[viewReq.status]?.color||"#374151",fontSize:12,fontWeight:700,border:`1px solid ${STATUS_CFG[viewReq.status]?.border||"#e5e7eb"}`}}>
                {STATUS_CFG[viewReq.status]?.label||viewReq.status}
              </span>
              <button onClick={()=>setViewReq(null)} style={{padding:8,borderRadius:8,border:"none",background:"#f3f4f6",cursor:"pointer",lineHeight:0}}>
                <X style={{width:16,height:16,color:"rgba(255,255,255,0.45)"}}/>
              </button>
            </div>
            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {l:"Requisition Number",v:viewReq.requisition_number},
                {l:"Status",v:STATUS_CFG[viewReq.status]?.label||viewReq.status},
                {l:"Title",v:viewReq.title},
                {l:"Department",v:viewReq.department||"—"},
                {l:"Priority",v:viewReq.priority||"normal"},
                {l:"Requester",v:viewReq.requester_name||"—"},
                {l:"Date Raised",v:fmtDate(viewReq.created_at)},
                {l:"Required By",v:viewReq.delivery_date?fmtDate(viewReq.delivery_date):"—"},
                {l:"Total Amount",v:viewReq.total_amount?`${currencySymbol} ${Number(viewReq.total_amount).toLocaleString("en-KE",{minimumFractionDigits:2})}`: "—"},
                {l:"Fund Source",v:viewReq.fund_source||"—"},
                {l:"Cost Centre",v:viewReq.cost_centre||"—"},
                {l:"Approved By",v:viewReq.approved_by_name||"—"},
                {l:"Justification",v:viewReq.justification||"—",span:2},
                {l:"Notes",v:viewReq.notes||"—",span:2},
                ...(viewReq.status==="rejected"?[{l:"Rejection Reason",v:viewReq.rejection_reason||"—",span:2,warn:true}]:[]),
              ].map((row:any,i:number)=>(
                <div key={i} style={{gridColumn:row.span===2?"span 2":"span 1",padding:"8px 12px",background:row.warn?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.05)",borderRadius:8,border: `1px solid ${row.warn?"#fca5a5":"#f0f0f0"}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:row.warn?"#dc2626":"#9ca3af",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:2}}>{row.l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:row.warn?"#dc2626":"#1f2937"}}>{row.v}</div>
                </div>
              ))}
            </div>
            <div style={{padding:"12px 22px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap" as const}}>
              {(viewReq.status==="submitted"||viewReq.status==="pending")&&canApprove&&(
                <>
                  <button onClick={()=>{approve(viewReq.id);setViewReq(null);}} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"#059669",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>✓ Approve</button>
                  <button onClick={()=>{setRejectId(viewReq.id);setViewReq(null);}} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>✗ Reject</button>
                </>
              )}
              {viewReq.status==="draft"&&(
                <button onClick={()=>{submit(viewReq.id);setViewReq(null);}} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"#3b82f6",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>⇪ Submit for Approval</button>
              )}
              <button onClick={()=>printRequisition(viewReq,{hospitalName:getSetting("hospital_name","Embu Level 5 Hospital"),sysName:getSetting("system_name","EL5 MediProcure"),docFooter:getSetting("doc_footer",""),currencySymbol,logoUrl:getSetting("logo_url")||"",printFont:getSetting("print_font","Times New Roman"),printFontSize:getSetting("print_font_size","11"),showStamp:true})} style={{padding:"8px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:12,fontWeight:600,color:"#e2e8f0"}}>🖨 Print</button>
              <button onClick={()=>setViewReq(null)} style={{padding:"8px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:12,fontWeight:600,color:"#e2e8f0"}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT DIALOG ── */}
      {rejectId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:440,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <AlertTriangle style={{width:22,height:22,color:"#dc2626"}}/>
              <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>Reject Requisition</div>
            </div>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Enter reason for rejection (required)…" rows={3} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",marginBottom:14}}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setRejectId(null);setRejectReason("");}} style={{padding:"8px 18px",borderRadius:9,border:"1px solid #d1d5db",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:13,fontWeight:600,color:"#e2e8f0"}}>Cancel</button>
              <button onClick={rejectConfirm} disabled={!rejectReason.trim()} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,opacity:!rejectReason.trim()?0.5:1}}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
