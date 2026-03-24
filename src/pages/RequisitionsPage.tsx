import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, Clock, ClipboardList, Send, Trash2,
  AlertTriangle, ChevronDown, Download, Edit2
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement, sendNotification } from "@/lib/notify";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printRequisition } from "@/lib/printDocument";
import { useDepartments } from "@/hooks/useDropdownData";

const S: Record<string,{bg:string;color:string;label:string}> = {
  draft:     {bg:"#1e293b",color:"#94a3b8",label:"Draft"},
  submitted: {bg:"#1e3a5f",color:"#60a5fa",label:"Submitted"},
  pending:   {bg:"#3b2a00",color:"#fbbf24",label:"Pending"},
  approved:  {bg:"#052e16",color:"#4ade80",label:"Approved"},
  rejected:  {bg:"#3b0000",color:"#f87171",label:"Rejected"},
  ordered:   {bg:"#0c2340",color:"#38bdf8",label:"Ordered"},
  received:  {bg:"#022c22",color:"#34d399",label:"Received"},
};

const EMPTY_ITEM = {item_name:"",description:"",unit_of_measure:"pcs",quantity:1,unit_price:0,specifications:""};
const UNITS = ["pcs","box","carton","dozen","kg","g","mg","L","mL","vial","ampoule","tablet","capsule","pair","set","roll","pack","sheet","bottle","tube","sachet","ream"];
const PRIORITIES = ["low","normal","high","urgent"];
const WARDS = ["OPD","IPD","ICU","Theatre","Maternity","Paediatrics","Casualty/A&E","Laboratory","Pharmacy","Radiology","Dental","Eye Clinic","ENT","Physiotherapy","Stores","Admin","Maintenance","Kitchen","Laundry","Mortuary","Other"];

type Item = typeof EMPTY_ITEM;

export default function RequisitionsPage() {
  const { user, profile, roles } = useAuth();
  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const canCreate  = !roles.includes("warehouse_officer") && !roles.includes("inventory_manager");

  const [reqs, setReqs]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setFilter]   = useState("all");
  const [viewReq, setViewReq]       = useState<any>(null);
  const [editReq, setEditReq]       = useState<any>(null);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [rejectId, setRejectId]     = useState<string|null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { get: getSetting } = useSystemSettings();
  const { departments } = useDepartments();

  const EMPTY_FORM = {
    title:"", department:"", requester_name: profile?.full_name||"",
    priority:"normal", notes:"", delivery_date:"", required_date:"",
    delivery_location:"", hospital_ward:"", purpose:"", reference_number:"",
    is_urgent: false,
  };
  const [form, setForm]   = useState<any>(EMPTY_FORM);
  const [items, setItems] = useState<Item[]>([{...EMPTY_ITEM}]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("requisitions")
      .select("*,requisition_items(*)")
      .order("created_at",{ascending:false});
    setReqs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch=(supabase as any).channel("reqs-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[load]);

  // ── item helpers ──────────────────────────────────────
  const setItem = (i:number, k:keyof Item, v:any) => setItems(p=>p.map((it,idx)=>idx===i?{...it,[k]:v}:it));
  const addItem = () => setItems(p=>[...p,{...EMPTY_ITEM}]);
  const delItem = (i:number) => setItems(p=>p.length>1?p.filter((_,idx)=>idx!==i):p);
  const totalAmt = items.reduce((s,it)=>s+(Number(it.quantity)||0)*(Number(it.unit_price)||0),0);

  const openNew = () => {
    setEditReq(null);
    setForm({...EMPTY_FORM, requester_name: profile?.full_name||""});
    setItems([{...EMPTY_ITEM}]);
    setShowForm(true);
  };

  const openEdit = (r:any) => {
    setEditReq(r);
    setForm({
      title:r.title||"", department:r.department||"",
      requester_name:r.requester_name||profile?.full_name||"",
      priority:r.priority||"normal", notes:r.notes||"",
      delivery_date:r.delivery_date||"", required_date:r.required_date||"",
      delivery_location:r.delivery_location||"", hospital_ward:r.hospital_ward||"",
      purpose:r.purpose||"", reference_number:r.reference_number||"",
      is_urgent:r.is_urgent||false,
    });
    setItems((r.requisition_items||[]).length>0
      ? r.requisition_items.map((it:any)=>({
          item_name:it.item_name||"", description:it.description||"",
          unit_of_measure:it.unit_of_measure||"pcs", quantity:it.quantity||1,
          unit_price:it.unit_price||0, specifications:it.specifications||"",
        }))
      : [{...EMPTY_ITEM}]);
    setShowForm(true);
  };

  const save = async () => {
    if(!form.title.trim()){toast({title:"Title is required",variant:"destructive"});return;}
    if(!form.department){toast({title:"Department is required",variant:"destructive"});return;}
    const validItems = items.filter(it=>it.item_name.trim());
    if(validItems.length===0){toast({title:"Add at least one item",variant:"destructive"});return;}
    setSaving(true);
    const total = validItems.reduce((s,it)=>s+(Number(it.quantity)||0)*(Number(it.unit_price)||0),0);
    try {
      if(editReq) {
        // UPDATE
        await (supabase as any).from("requisitions").update({
          ...form, total_amount:total, updated_at:new Date().toISOString()
        }).eq("id",editReq.id);
        await (supabase as any).from("requisition_items").delete().eq("requisition_id",editReq.id);
        if(validItems.length>0)
          await (supabase as any).from("requisition_items").insert(validItems.map(it=>({...it,requisition_id:editReq.id})));
        logAudit(user?.id,profile?.full_name,"update","requisitions",editReq.id,{title:form.title});
        toast({title:"Requisition Updated ✓"});
      } else {
        // INSERT
        const num=`RQQ/EL5H/${new Date().getFullYear()}/${String(reqs.length+1).padStart(4,"0")}`;
        const {data,error}=await (supabase as any).from("requisitions").insert({
          ...form, requisition_number:num, status:"draft",
          requested_by:user?.id, requester_name:form.requester_name||profile?.full_name,
          total_amount:total,
        }).select().single();
        if(error) throw error;
        if(validItems.length>0)
          await (supabase as any).from("requisition_items").insert(validItems.map(it=>({...it,requisition_id:data.id})));
        logAudit(user?.id,profile?.full_name,"create","requisitions",data.id,{title:form.title});
        await notifyProcurement({title:"New Requisition",message:`${profile?.full_name||"Staff"} submitted ${num}`,type:"procurement",module:"Procurement",actionUrl:"/requisitions"});
        toast({title:"Requisition Created ✓",description:num});
      }
      setShowForm(false);
      load();
    } catch(e:any){
      toast({title:"Save failed",description:e.message,variant:"destructive"});
    } finally { setSaving(false); }
  };

  const submit = async (id:string) => {
    await (supabase as any).from("requisitions").update({status:"submitted"}).eq("id",id);
    toast({title:"Submitted for approval"});
    load();
  };

  const approve = async (id:string) => {
    const req = reqs.find(r=>r.id===id);
    await (supabase as any).from("requisitions").update({
      status:"approved", approved_by:user?.id,
      approved_by_name:profile?.full_name, approved_at:new Date().toISOString()
    }).eq("id",id);
    logAudit(user?.id,profile?.full_name,"approve","requisitions",id,{});
    toast({title:"Requisition Approved ✓"});
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Approved ✓",message:`Your requisition "${req.title||req.requisition_number}" has been approved.`,type:"success",module:"Procurement",actionUrl:"/requisitions"});
    load();
  };

  const reject = async () => {
    if(!rejectId) return;
    await (supabase as any).from("requisitions").update({status:"rejected",rejected_reason:rejectReason}).eq("id",rejectId);
    logAudit(user?.id,profile?.full_name,"reject","requisitions",rejectId,{reason:rejectReason});
    toast({title:"Requisition Rejected",variant:"destructive"});
    setRejectId(null); setRejectReason(""); load();
  };

  const del = async (id:string) => {
    if(!confirm("Delete this requisition?")) return;
    await (supabase as any).from("requisition_items").delete().eq("requisition_id",id);
    await (supabase as any).from("requisitions").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const printReq = (r:any) => printRequisition(r,{
    hospitalName:getSetting("hospital_name","Embu Level 5 Hospital"),
    sysName:getSetting("system_name","EL5 MediProcure"),
    currencySymbol:getSetting("currency_symbol","KES"),
    logoUrl:getSetting("logo_url"),
    hospitalAddress:getSetting("hospital_address"),
    hospitalPhone:getSetting("hospital_phone"),
    hospitalEmail:getSetting("hospital_email"),
    showStamp:getSetting("show_stamp","true")==="true",
  });

  const exportExcel = () => {
    const wb=XLSX.utils.book_new();
    const rows=filtered.map(r=>({
      "Req No.":r.requisition_number,"Title":r.title,"Department":r.department,
      "Ward":r.hospital_ward||"","Priority":r.priority,"Status":r.status,
      "Requester":r.requester_name,"Amount":r.total_amount||0,
      "Date":r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"",
      "Required Date":r.required_date||"","Notes":r.notes||"",
    }));
    const ws=XLSX.utils.json_to_sheet(rows);
    ws["!cols"]=Object.keys(rows[0]||{}).map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb,ws,"Requisitions");
    XLSX.writeFile(wb,`Requisitions_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  };

  const filtered = reqs.filter(r=>{
    if(statusFilter!=="all"&&r.status!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return (r.title||"").toLowerCase().includes(q)||(r.requisition_number||"").toLowerCase().includes(q)||(r.department||"").toLowerCase().includes(q)||(r.requester_name||"").toLowerCase().includes(q);}
    return true;
  });

  const fmtKES=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
  const totalVal=reqs.reduce((s,r)=>s+Number(r.total_amount||0),0);
  const appVal=reqs.filter(r=>r.status==="approved").reduce((s,r)=>s+Number(r.total_amount||0),0);

  const inp:React.CSSProperties={width:"100%",padding:"8px 10px",border:"1.5px solid #334155",borderRadius:7,fontSize:12.5,outline:"none",background:"#1e293b",color:"#f1f5f9",boxSizing:"border-box"};
  const lbl:React.CSSProperties={display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#94a3b8",marginBottom:4};

  return (
    <><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      .req-row:hover{background:rgba(255,255,255,0.03)!important}
      .act-btn:hover{opacity:0.8}
    `}</style>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:10,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* KPI TILES */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
        {[
          {label:"Total Value",val:fmtKES(totalVal),bg:"linear-gradient(135deg,#7f1d1d,#c0392b)"},
          {label:"Approved Value",val:fmtKES(appVal),bg:"linear-gradient(135deg,#064e3b,#0e6655)"},
          {label:"Pending",val:reqs.filter(r=>r.status==="pending"||r.status==="submitted").length,bg:"linear-gradient(135deg,#3b2a00,#92400e)"},
          {label:"Total Records",val:reqs.length,bg:"linear-gradient(135deg,#1e1b4b,#4c1d95)"},
          {label:"Approved",val:reqs.filter(r=>r.status==="approved").length,bg:"linear-gradient(135deg,#022c22,#065f46)"},
        ].map(k=>(
          <div key={k.label} style={{borderRadius:10,padding:"12px 14px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:9.5,fontWeight:700,marginTop:5,opacity:0.8,letterSpacing:"0.05em"}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* HEADER BAR */}
      <div style={{borderRadius:12,background:"linear-gradient(90deg,#0a2558,#1a3a6b)",boxShadow:"0 4px 16px rgba(26,58,107,0.35)",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <ClipboardList style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Requisitions</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.45)",margin:0}}>{filtered.length} of {reqs.length} records</p>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <button onClick={load} disabled={loading} style={{padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",cursor:"pointer"}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:"rgba(52,211,153,0.85)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
            <FileSpreadsheet style={{width:14,height:14}}/>Export
          </button>
          {canCreate&&(
            <button onClick={openNew} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"#fff",color:"#1e3a8a",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>
              <Plus style={{width:14,height:14}}/>New Requisition
            </button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        {["all","draft","submitted","pending","approved","rejected","ordered","received"].map(k=>(
          <button key={k} onClick={()=>setFilter(k)}
            style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",
              background:statusFilter===k?"#1a3a6b":"rgba(255,255,255,0.07)",
              color:statusFilter===k?"#fff":"rgba(255,255,255,0.6)"}}>
            {k.charAt(0).toUpperCase()+k.slice(1)}
            <span style={{marginLeft:5,fontSize:9,opacity:0.75}}>
              {k==="all"?reqs.length:reqs.filter(r=>r.status===k).length}
            </span>
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#64748b"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
            style={{paddingLeft:30,paddingRight:28,paddingTop:6,paddingBottom:6,borderRadius:20,border:"1.5px solid #334155",fontSize:12,outline:"none",background:"#1e293b",color:"#f1f5f9",width:200}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X style={{width:12,height:12,color:"#64748b"}}/></button>}
        </div>
      </div>

      {/* TABLE */}
      <div style={{borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#0a2558"}}>
                {["#","Req Number","Title","Department","Ward","Priority","Status","Requester","Amount","Date","Actions"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",color:"rgba(255,255,255,0.7)",fontWeight:700,fontSize:9.5,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={11} style={{padding:10}}><div style={{height:10,background:"rgba(255,255,255,0.05)",borderRadius:4}}/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={11} style={{padding:"40px 16px",textAlign:"center",color:"#64748b"}}>No requisitions found</td></tr>
              ):filtered.map((r,i)=>{
                const st=S[r.status]||{bg:"#1e293b",color:"#94a3b8",label:r.status};
                const isPending=r.status==="submitted"||r.status==="pending";
                const isDraft=r.status==="draft";
                return (
                  <tr key={r.id} className="req-row" style={{borderBottom:"1px solid rgba(255,255,255,0.05)",transition:"background 0.12s"}}>
                    <td style={{padding:"9px 12px",color:"#475569"}}>{i+1}</td>
                    <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#60a5fa",whiteSpace:"nowrap"}}>{r.requisition_number||"—"}</td>
                    <td style={{padding:"9px 12px",fontWeight:600,color:"#f1f5f9",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title||"—"}</td>
                    <td style={{padding:"9px 12px",color:"#cbd5e1"}}>{r.department||"—"}</td>
                    <td style={{padding:"9px 12px",color:"#94a3b8",fontSize:11}}>{r.hospital_ward||"—"}</td>
                    <td style={{padding:"9px 12px"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",
                        background:r.priority==="urgent"?"#3b0000":r.priority==="high"?"#3b1500":r.priority==="normal"?"#1e3a5f":"#1e293b",
                        color:r.priority==="urgent"?"#f87171":r.priority==="high"?"#fb923c":r.priority==="normal"?"#60a5fa":"#94a3b8"}}>
                        {r.priority||"normal"}
                      </span>
                    </td>
                    <td style={{padding:"9px 12px"}}>
                      <span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:st.bg,color:st.color}}>{st.label}</span>
                    </td>
                    <td style={{padding:"9px 12px",color:"#cbd5e1"}}>{r.requester_name||"—"}</td>
                    <td style={{padding:"9px 12px",fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap"}}>{r.total_amount?`KES ${Number(r.total_amount).toLocaleString()}`:r.requisition_items?.length>0?`${r.requisition_items.length} items`:"—"}</td>
                    <td style={{padding:"9px 12px",color:"#64748b",fontSize:10,whiteSpace:"nowrap"}}>{r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"—"}</td>
                    <td style={{padding:"9px 12px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"nowrap"}}>
                        <button className="act-btn" onClick={()=>setViewReq(r)} title="View" style={{padding:5,borderRadius:6,background:"#1e3a5f",color:"#60a5fa",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12}}/></button>
                        {canCreate&&<button className="act-btn" onClick={()=>openEdit(r)} title="Edit" style={{padding:5,borderRadius:6,background:"#1e293b",color:"#94a3b8",border:"none",cursor:"pointer"}}><Edit2 style={{width:12,height:12}}/></button>}
                        {isDraft&&canCreate&&<button className="act-btn" onClick={()=>submit(r.id)} title="Submit" style={{padding:5,borderRadius:6,background:"#1e3a5f",color:"#38bdf8",border:"none",cursor:"pointer"}}><Send style={{width:12,height:12}}/></button>}
                        {canApprove&&isPending&&(
                          <>
                            <button className="act-btn" onClick={()=>approve(r.id)} title="Approve" style={{padding:5,borderRadius:6,background:"#052e16",color:"#4ade80",border:"none",cursor:"pointer"}}><CheckCircle style={{width:12,height:12}}/></button>
                            <button className="act-btn" onClick={()=>{setRejectId(r.id);setRejectReason("");}} title="Reject" style={{padding:5,borderRadius:6,background:"#3b0000",color:"#f87171",border:"none",cursor:"pointer"}}><XCircle style={{width:12,height:12}}/></button>
                          </>
                        )}
                        <button className="act-btn" onClick={()=>printReq(r)} title="Print" style={{padding:5,borderRadius:6,background:"#0f172a",color:"#cbd5e1",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12}}/></button>
                        {(isDraft||r.status==="rejected")&&canCreate&&<button className="act-btn" onClick={()=>del(r.id)} title="Delete" style={{padding:5,borderRadius:6,background:"#3b0000",color:"#f87171",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12}}/></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 16px",background:"rgba(255,255,255,0.03)",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:11,color:"#64748b"}}>
          {filtered.length} record{filtered.length!==1?"s":""}{filtered.length>0&&` · Total: KES ${filtered.reduce((s,r)=>s+Number(r.total_amount||0),0).toLocaleString()}`}
        </div>
      </div>

      {/* ═══ CREATE / EDIT MODAL ═══ */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:24,paddingBottom:24,overflowY:"auto"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)"}} onClick={()=>setShowForm(false)}/>
          <div style={{position:"relative",background:"#0f172a",borderRadius:16,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",width:"min(820px,98%)",border:"1px solid #1e293b",overflow:"hidden"}}>
            {/* modal header */}
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#0a2558,#1a3a6b)"}}>
              <h3 style={{fontSize:14,fontWeight:900,color:"#fff",margin:0,display:"flex",alignItems:"center",gap:8}}>
                <ClipboardList style={{width:16,height:16}}/>{editReq?"Edit Requisition":"New Requisition"}
              </h3>
              <button onClick={()=>setShowForm(false)} style={{padding:5,borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>

              {/* Row 1: title + ref */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                <div>
                  <label style={lbl}>Requisition Title *</label>
                  <input value={form.title} onChange={e=>setForm((p:any)=>({...p,title:e.target.value}))} placeholder="e.g. Medical Supplies Q1" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Reference / LPO No.</label>
                  <input value={form.reference_number} onChange={e=>setForm((p:any)=>({...p,reference_number:e.target.value}))} placeholder="Optional" style={inp}/>
                </div>
              </div>

              {/* Row 2: dept + ward + requester */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div>
                  <label style={lbl}>Department *</label>
                  <select value={form.department} onChange={e=>setForm((p:any)=>({...p,department:e.target.value}))} style={inp}>
                    <option value="">Select Department</option>
                    {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Hospital Ward / Unit</label>
                  <select value={form.hospital_ward} onChange={e=>setForm((p:any)=>({...p,hospital_ward:e.target.value}))} style={inp}>
                    <option value="">Select Ward</option>
                    {WARDS.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Requested By</label>
                  <input value={form.requester_name} onChange={e=>setForm((p:any)=>({...p,requester_name:e.target.value}))} placeholder="Full name" style={inp}/>
                </div>
              </div>

              {/* Row 3: priority + dates */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                <div>
                  <label style={lbl}>Priority</label>
                  <select value={form.priority} onChange={e=>setForm((p:any)=>({...p,priority:e.target.value}))} style={inp}>
                    {PRIORITIES.map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Required Date</label>
                  <input type="date" value={form.required_date} onChange={e=>setForm((p:any)=>({...p,required_date:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Delivery Date</label>
                  <input type="date" value={form.delivery_date} onChange={e=>setForm((p:any)=>({...p,delivery_date:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Delivery Location</label>
                  <input value={form.delivery_location} onChange={e=>setForm((p:any)=>({...p,delivery_location:e.target.value}))} placeholder="e.g. Main Store" style={inp}/>
                </div>
              </div>

              {/* Row 4: purpose + notes */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={lbl}>Purpose / Justification</label>
                  <textarea value={form.purpose} onChange={e=>setForm((p:any)=>({...p,purpose:e.target.value}))} rows={2} placeholder="Why is this needed?" style={{...inp,resize:"vertical"}}/>
                </div>
                <div>
                  <label style={lbl}>Additional Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm((p:any)=>({...p,notes:e.target.value}))} rows={2} placeholder="Any other info..." style={{...inp,resize:"vertical"}}/>
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <label style={{...lbl,marginBottom:0}}>Items Required *</label>
                  <button onClick={addItem} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,background:"#1a3a6b",color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>
                    <Plus style={{width:12,height:12}}/>Add Item
                  </button>
                </div>
                <div style={{border:"1px solid #1e293b",borderRadius:10,overflow:"hidden"}}>
                  <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{background:"#0a2558"}}>
                        {["#","Item Name","Description / Specs","Unit","Qty","Unit Price (KES)","Total",""].map((h,i)=>(
                          <th key={i} style={{padding:"8px 10px",textAlign:"left",color:"rgba(255,255,255,0.7)",fontSize:9.5,textTransform:"uppercase",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid #1e293b"}}>
                          <td style={{padding:"6px 10px",color:"#64748b",textAlign:"center"}}>{i+1}</td>
                          <td style={{padding:"4px 6px"}}><input value={it.item_name} onChange={e=>setItem(i,"item_name",e.target.value)} placeholder="Item name" style={{...inp,fontSize:11.5}}/></td>
                          <td style={{padding:"4px 6px"}}><input value={it.description} onChange={e=>setItem(i,"description",e.target.value)} placeholder="Specifications / details" style={{...inp,fontSize:11.5}}/></td>
                          <td style={{padding:"4px 6px",width:90}}>
                            <select value={it.unit_of_measure} onChange={e=>setItem(i,"unit_of_measure",e.target.value)} style={{...inp,fontSize:11.5}}>
                              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"4px 6px",width:70}}><input type="number" min="0.01" step="0.01" value={it.quantity} onChange={e=>setItem(i,"quantity",Number(e.target.value))} style={{...inp,fontSize:11.5,textAlign:"right"}}/></td>
                          <td style={{padding:"4px 6px",width:120}}><input type="number" min="0" step="0.01" value={it.unit_price} onChange={e=>setItem(i,"unit_price",Number(e.target.value))} placeholder="0.00" style={{...inp,fontSize:11.5,textAlign:"right"}}/></td>
                          <td style={{padding:"6px 10px",fontWeight:700,color:"#60a5fa",whiteSpace:"nowrap",textAlign:"right"}}>
                            {((Number(it.quantity)||0)*(Number(it.unit_price)||0)).toLocaleString("en-KE",{minimumFractionDigits:2})}
                          </td>
                          <td style={{padding:"4px 6px",textAlign:"center"}}>
                            <button onClick={()=>delItem(i)} style={{padding:4,borderRadius:5,background:"#3b0000",color:"#f87171",border:"none",cursor:"pointer"}}><Trash2 style={{width:11,height:11}}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"#0a2558"}}>
                        <td colSpan={5} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"rgba(255,255,255,0.7)",fontSize:11}}>TOTAL AMOUNT:</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:900,color:"#4ade80",fontSize:13}}>KES {totalAmt.toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
                        <td colSpan={2}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* urgent toggle */}
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}>
                <input type="checkbox" checked={form.is_urgent} onChange={e=>setForm((p:any)=>({...p,is_urgent:e.target.checked}))} style={{width:16,height:16,accentColor:"#ef4444"}}/>
                <span style={{fontSize:12,color:"#f87171",fontWeight:700}}>Mark as URGENT</span>
                {form.is_urgent&&<AlertTriangle style={{width:14,height:14,color:"#f87171"}}/>}
              </label>

              {/* footer buttons */}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4,borderTop:"1px solid #1e293b"}}>
                <button onClick={()=>setShowForm(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:13}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:9,color:"#fff",fontSize:13,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",background:"linear-gradient(90deg,#1a3a6b,#2563eb)",opacity:saving?0.7:1}}>
                  {saving?<RefreshCw style={{width:14,height:14,animation:"spin 1s linear infinite"}}/>:<Send style={{width:14,height:14}}/>}
                  {saving?"Saving...":(editReq?"Update Requisition":"Create Requisition")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REJECT MODAL ═══ */}
      {rejectId&&(
        <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)"}} onClick={()=>setRejectId(null)}/>
          <div style={{position:"relative",background:"#0f172a",borderRadius:12,padding:24,width:"min(420px,95%)",border:"1px solid #3b0000"}}>
            <h3 style={{color:"#f87171",fontWeight:800,margin:"0 0 12px"}}>Reject Requisition</h3>
            <label style={lbl}>Rejection Reason</label>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3} placeholder="State reason for rejection..." style={{...inp,resize:"vertical",marginBottom:14}}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setRejectId(null)} style={{padding:"7px 16px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>Cancel</button>
              <button onClick={reject} style={{padding:"7px 16px",borderRadius:7,background:"#7f1d1d",color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VIEW MODAL ═══ */}
      {viewReq&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)"}} onClick={()=>setViewReq(null)}/>
          <div style={{position:"relative",background:"#0f172a",borderRadius:16,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",width:"min(740px,98%)",maxHeight:"90vh",display:"flex",flexDirection:"column",border:"1px solid #1e293b",overflow:"hidden"}}>
            <div style={{padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#0a2558,#1a3a6b)"}}>
              <div>
                <h3 style={{fontSize:14,fontWeight:900,color:"#fff",margin:0}}>{viewReq.requisition_number}</h3>
                <p style={{fontSize:10,color:"rgba(255,255,255,0.4)",margin:0}}>{viewReq.title}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                {canCreate&&<button onClick={()=>{setViewReq(null);openEdit(viewReq);}} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,color:"#fff",fontSize:11,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",cursor:"pointer"}}><Edit2 style={{width:11,height:11}}/>Edit</button>}
                <button onClick={()=>printReq(viewReq)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,color:"#fff",fontSize:11,border:"none",background:"rgba(255,255,255,0.1)",cursor:"pointer"}}><Printer style={{width:11,height:11}}/>Print</button>
                {canApprove&&(viewReq.status==="submitted"||viewReq.status==="pending")&&(
                  <>
                    <button onClick={()=>{approve(viewReq.id);setViewReq(null);}} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,color:"#fff",fontSize:11,border:"none",background:"#052e16",cursor:"pointer"}}><CheckCircle style={{width:11,height:11}}/>Approve</button>
                    <button onClick={()=>{setRejectId(viewReq.id);setViewReq(null);}} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,color:"#fff",fontSize:11,border:"none",background:"#7f1d1d",cursor:"pointer"}}><XCircle style={{width:11,height:11}}/>Reject</button>
                  </>
                )}
                <button onClick={()=>setViewReq(null)} style={{padding:5,borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer"}}><X style={{width:15,height:15}}/></button>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
                {[
                  {l:"Department",v:viewReq.department},{l:"Ward",v:viewReq.hospital_ward},
                  {l:"Priority",v:viewReq.priority},{l:"Status",v:viewReq.status},
                  {l:"Requester",v:viewReq.requester_name},{l:"Amount",v:viewReq.total_amount?`KES ${Number(viewReq.total_amount).toLocaleString()}`:"—"},
                  {l:"Required Date",v:viewReq.required_date||"—"},{l:"Delivery Date",v:viewReq.delivery_date||"—"},
                ].map(r=>(
                  <div key={r.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 12px"}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#64748b"}}>{r.l}</div>
                    <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600,marginTop:2}}>{r.v||"—"}</div>
                  </div>
                ))}
              </div>
              {viewReq.purpose&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid #1e293b"}}><p style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#64748b",marginBottom:4}}>Purpose</p><p style={{fontSize:13,color:"#cbd5e1"}}>{viewReq.purpose}</p></div>}
              {viewReq.notes&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid #1e293b"}}><p style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#64748b",marginBottom:4}}>Notes</p><p style={{fontSize:13,color:"#cbd5e1"}}>{viewReq.notes}</p></div>}
              {viewReq.rejected_reason&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:"#3b0000",border:"1px solid #7f1d1d"}}><p style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#f87171",marginBottom:4}}>Rejection Reason</p><p style={{fontSize:13,color:"#fca5a5"}}>{viewReq.rejected_reason}</p></div>}
              {(viewReq.requisition_items||[]).length>0&&(
                <div>
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#64748b",marginBottom:8}}>Items ({viewReq.requisition_items.length})</p>
                  <table style={{width:"100%",fontSize:12,borderCollapse:"collapse",borderRadius:8,overflow:"hidden"}}>
                    <thead><tr style={{background:"#0a2558"}}>{["#","Item","Description","Unit","Qty","Unit Price","Total"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 10px",color:"rgba(255,255,255,0.7)",fontSize:9.5,textTransform:"uppercase",fontWeight:700}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {viewReq.requisition_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:"1px solid #1e293b"}}>
                          <td style={{padding:"7px 10px",color:"#64748b"}}>{i+1}</td>
                          <td style={{padding:"7px 10px",fontWeight:600,color:"#e2e8f0"}}>{it.item_name||"—"}</td>
                          <td style={{padding:"7px 10px",color:"#94a3b8"}}>{it.description||it.specifications||"—"}</td>
                          <td style={{padding:"7px 10px",color:"#94a3b8"}}>{it.unit_of_measure||"—"}</td>
                          <td style={{padding:"7px 10px",color:"#e2e8f0"}}>{it.quantity}</td>
                          <td style={{padding:"7px 10px",color:"#e2e8f0"}}>KES {Number(it.unit_price||0).toLocaleString()}</td>
                          <td style={{padding:"7px 10px",fontWeight:700,color:"#4ade80"}}>KES {Number((it.quantity||0)*(it.unit_price||0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{background:"#0a2558"}}>
                      <td colSpan={5} style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"rgba(255,255,255,0.7)",fontSize:11}}>TOTAL:</td>
                      <td colSpan={2} style={{padding:"7px 10px",fontWeight:900,color:"#4ade80",fontSize:13}}>KES {viewReq.requisition_items.reduce((s:number,it:any)=>s+(it.quantity||0)*(it.unit_price||0),0).toLocaleString()}</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
