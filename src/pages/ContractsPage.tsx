import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { notifyProcurement } from "@/lib/notify";
import { Plus, Search, RefreshCw, Eye, FileText, X, Save, Download, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const genNo = () => `CNT/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${Math.random().toString(36).substring(2,6).toUpperCase()}`;
const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE")}`;
const fmtDate = (d:string) => d?new Date(d).toLocaleDateString("en-KE",{dateStyle:"medium"}):"—";

const S_CFG:Record<string,{bg:string;color:string;label:string;icon:any}> = {
  active:    {bg:"#dcfce7",color:"#15803d",label:"Active",icon:CheckCircle},
  expired:   {bg:"#fef3c7",color:"#92400e",label:"Expired",icon:Clock},
  terminated:{bg:"#fee2e2",color:"#dc2626",label:"Terminated",icon:AlertTriangle},
  suspended: {bg:"#e0f2fe",color:"#0369a1",label:"Suspended",icon:Clock},
  draft:     {bg:"#f3f4f6",color:"#6b7280",label:"Draft",icon:FileText},
};
const sc = (s:string) => S_CFG[s]||S_CFG.draft;

const LBL = ({children}:{children:any}) => <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{children}</div>;
const INP = (v:any,cb:any,p="",t="text") => (
  <input type={t} value={v} onChange={e=>cb(e.target.value)} placeholder={p}
    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",background:"#fff",boxSizing:"border-box" as const}}/>
);

export default function ContractsPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");

  const [rows,     setRows]     = useState<any[]>([]);
  const [suppliers,setSuppliers]= useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [stFilter, setStFilter] = useState("all");
  const [showNew,  setShowNew]  = useState(false);
  const [editing,  setEditing]  = useState<any>(null);
  const [detail,   setDetail]   = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({contract_number:"",supplier_id:"",title:"",description:"",start_date:"",end_date:"",total_value:"",status:"active",payment_terms:"",delivery_terms:"",performance_score:"0"});

  const load = useCallback(async () => {
    setLoading(true);
    const [{data:c},{data:s}] = await Promise.all([
      (supabase as any).from("contracts").select("*,suppliers(name)").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
    ]);
    setRows(c||[]); setSuppliers(s||[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=(supabase as any).channel("contracts-rt").on("postgres_changes",{event:"*",schema:"public",table:"contracts"},load).subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[load]);

  const openNew = (v?:any) => {
    if(v){setEditing(v);setForm({contract_number:v.contract_number||"",supplier_id:v.supplier_id||"",title:v.title||"",description:v.description||"",start_date:v.start_date||"",end_date:v.end_date||"",total_value:String(v.total_value||""),status:v.status||"active",payment_terms:v.payment_terms||"",delivery_terms:v.delivery_terms||"",performance_score:String(v.performance_score||"0")});}
    else{setEditing(null);setForm({contract_number:"",supplier_id:"",title:"",description:"",start_date:"",end_date:"",total_value:"",status:"active",payment_terms:"",delivery_terms:"",performance_score:"0"});}
    setShowNew(true);
  };

  const save = async () => {
    if(!form.title.trim()){toast({title:"Contract title is required",variant:"destructive"});return;}
    if(!form.start_date){toast({title:"Start date is required",variant:"destructive"});return;}
    if(!form.end_date){toast({title:"End date is required",variant:"destructive"});return;}
    if(form.start_date&&form.end_date&&new Date(form.end_date)<=new Date(form.start_date)){toast({title:"End date must be after start date",variant:"destructive"});return;}
    if(form.value&&isNaN(Number(form.value))){toast({title:"Contract value must be a number",variant:"destructive"});return;}
    if(form.value&&Number(form.value)<0){toast({title:"Contract value cannot be negative",variant:"destructive"});return;}
    setSaving(true);
    const sup = suppliers.find(s=>s.id===form.supplier_id);
    const payload={...form,contract_number:form.contract_number||genNo(),total_value:parseFloat(form.total_value)||0,performance_score:parseInt(form.performance_score)||0,created_by:user?.id,supplier_name:sup?.name};
    if(editing){
      const{error}=await(supabase as any).from("contracts").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
      toast({title:"Contract updated ✓"});
    } else {
      const{data,error}=await(supabase as any).from("contracts").insert(payload).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
      logAudit(user?.id,profile?.full_name,"create","contracts",data?.id,{});
      await notifyProcurement({title:"New Contract Created",message:`${payload.contract_number}: ${form.title} — ${sup?.name||""}`,type:"procurement",module:"Contracts",senderId:user?.id});
      toast({title:"Contract created ✓"});
    }
    setShowNew(false);setEditing(null);load();setSaving(false);
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r=>({Number:r.contract_number,Title:r.title,Supplier:r.suppliers?.name||r.supplier_name,Value:r.total_value,Start:r.start_date,End:r.end_date,Status:r.status,Score:r.performance_score})));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Contracts"); XLSX.writeFile(wb,`Contracts_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const supOpts = suppliers.map(s=>({value:s.id,label:s.name}));
  const filtered = rows.filter(r=>(stFilter==="all"||r.status===stFilter)&&(!search||[r.contract_number,r.title,r.suppliers?.name,r.supplier_name].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()))));

  const daysLeft = (end:string) => {
    if(!end)return null;
    const d = Math.ceil((new Date(end).getTime()-Date.now())/(1000*86400));
    return d;
  };

  return (
      <div style={{padding:"20px 24px",maxWidth:1400,margin:"0 auto"}}>
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const totalVal=rows.reduce((s:number,r:any)=>s+Number(r.contract_value||0),0);
        const activeC=rows.filter(r=>r.status==="active").length;
        const expiredC=rows.filter(r=>r.status==="expired").length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
            {[
              {label:"Total Contract Value",val:fmtK(totalVal),bg:"#c0392b"},
              {label:"Total Contracts",val:rows.length,bg:"#7d6608"},
              {label:"Active",val:activeC,bg:"#0e6655"},
              {label:"Expired",val:expiredC,bg:"#6c3483"},
              {label:"Showing",val:filtered.length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#0369a1,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <FileText style={{width:21,height:21,color:"#fff"}}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:0}}>Contracts</h1>
            <p style={{fontSize:13,color:"#6b7280",margin:0}}>Supplier contracts & agreements · {rows.length} contracts</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportXLSX} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>
            <Download style={{width:13,height:13}}/> Export
          </button>
          <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>
            <RefreshCw style={{width:13,height:13}}/> Refresh
          </button>
          {canManage&&<button onClick={()=>openNew()} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"linear-gradient(135deg,#0369a1,#0284c7)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 8px rgba(3,105,161,0.3)"}}>
            <Plus style={{width:14,height:14}}/> New Contract
          </button>}
        </div>
      </div>

      {/* Status tabs */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[{id:"all",label:"All"},{id:"active",label:"Active"},{id:"expired",label:"Expired"},{id:"draft",label:"Draft"},{id:"terminated",label:"Terminated"}].map(f=>(
          <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?"#0369a1":"#e5e7eb"}`,background:stFilter===f.id?"#0369a1":"#fff",color:stFilter===f.id?"#fff":"#374151",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {f.label} ({rows.filter(r=>f.id==="all"||r.status===f.id).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:14}}>
        <Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contract number, title, supplier..."
          style={{width:"100%",padding:"10px 12px 10px 34px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:9,outline:"none",background:"#fff",boxSizing:"border-box" as const}}/>
      </div>

      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
              {["Contract No","Title","Supplier","Value","Start","Expiry","Days Left","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase" as const,letterSpacing:"0.06em",whiteSpace:"nowrap" as const}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?[1,2,3].map(i=>(
              <tr key={i}>{[...Array(9)].map((_,j)=><td key={j} style={{padding:"14px"}}><div style={{height:12,background:"#f3f4f6",borderRadius:4,animation:"pulse 1.5s infinite"}}/></td>)}</tr>
            )):filtered.length===0?(
              <tr><td colSpan={9} style={{padding:"60px",textAlign:"center" as const,color:"#9ca3af",fontSize:14}}>
                <FileText style={{width:40,height:40,color:"#e5e7eb",margin:"0 auto 12px"}}/>
                <div style={{fontWeight:600}}>No contracts found</div>
              </td></tr>
            ):filtered.map(r=>{
              const cfg=sc(r.status); const days=daysLeft(r.end_date); const SIcon=cfg.icon;
              const supName = r.suppliers?.name||r.supplier_name||"—";
              return(
                <tr key={r.id} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:800,color:"#0369a1",fontFamily:"monospace"}} onClick={()=>setDetail(r)}>{r.contract_number}</td>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:"#111827",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}} onClick={()=>setDetail(r)}>{r.title}</td>
                  <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}} onClick={()=>setDetail(r)}>{supName}</td>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:"#111827"}} onClick={()=>setDetail(r)}>{fmtKES(r.total_value)}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}} onClick={()=>setDetail(r)}>{fmtDate(r.start_date)}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:days!==null&&days<30?"#dc2626":"#374151",fontWeight:days!==null&&days<30?700:400}} onClick={()=>setDetail(r)}>{fmtDate(r.end_date)}</td>
                  <td style={{padding:"12px 14px"}} onClick={()=>setDetail(r)}>
                    {days!==null?<span style={{fontSize:12,fontWeight:700,color:days<0?"#dc2626":days<30?"#d97706":"#15803d"}}>
                      {days<0?`${Math.abs(days)}d ago`:days===0?"Today":`${days}d`}
                    </span>:"—"}
                  </td>
                  <td style={{padding:"12px 14px"}} onClick={()=>setDetail(r)}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color}}>
                      <SIcon style={{width:9,height:9}}/> {cfg.label}
                    </span>
                  </td>
                  <td style={{padding:"12px 14px"}} onClick={e=>e.stopPropagation()}>
                    {canManage&&<button onClick={()=>openNew(r)} style={{padding:"5px 11px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700,color:"#1d4ed8"}}>Edit</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(680px,100%)",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"14px 14px 0 0",display:"flex",gap:10,alignItems:"center",position:"sticky" as const,top:0,zIndex:1}}>
              <FileText style={{width:16,height:16,color:"#fff"}}/><span style={{fontSize:15,fontWeight:800,color:"#fff",flex:1}}>{editing?"Edit":"New"} Contract</span>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column" as const,gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div><LBL>Contract Number</LBL>{INP(form.contract_number,v=>setForm(p=>({...p,contract_number:v})),"Auto-generated if empty")}</div>
                <div><LBL>Status</LBL>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}>
                    {Object.entries(S_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"span 2"}}><LBL>Title *</LBL>{INP(form.title,v=>setForm(p=>({...p,title:v})),"Contract title / scope")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Supplier</LBL>
                  <select value={form.supplier_id} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value}))} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}>
                    <option value="">Select supplier...</option>
                    {supOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div><LBL>Total Value (KES)</LBL>{INP(form.total_value,v=>setForm(p=>({...p,total_value:v})),"0","number")}</div>
                <div><LBL>Performance Score (0-100)</LBL>{INP(form.performance_score,v=>setForm(p=>({...p,performance_score:v})),"0-100","number")}</div>
                <div><LBL>Start Date *</LBL>{INP(form.start_date,v=>setForm(p=>({...p,start_date:v})),"","date")}</div>
                <div><LBL>End Date *</LBL>{INP(form.end_date,v=>setForm(p=>({...p,end_date:v})),"","date")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Payment Terms</LBL>{INP(form.payment_terms,v=>setForm(p=>({...p,payment_terms:v})),"e.g. Net 30 days")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Delivery Terms</LBL>{INP(form.delivery_terms,v=>setForm(p=>({...p,delivery_terms:v})),"e.g. DDP to Embu Level 5 Hospital stores")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Description</LBL>
                  <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} placeholder="Scope of contract..."
                    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",resize:"vertical" as const,fontFamily:"inherit",boxSizing:"border-box" as const}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
                <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"9px 18px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 22px",background:"linear-gradient(135deg,#0369a1,#0284c7)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800}}>
                  {saving?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Save style={{width:12,height:12}}/>} {saving?"Saving...":editing?"Update":"Create Contract"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,display:"flex",justifyContent:"flex-end"}} onClick={()=>setDetail(null)}>
          <div style={{width:"min(440px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",gap:8,alignItems:"center"}}>
              <FileText style={{width:14,height:14,color:"#fff"}}/><span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>{detail.contract_number}</span>
              <button onClick={()=>setDetail(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column" as const,gap:12}}>
              <div style={{fontSize:17,fontWeight:800,color:"#111827"}}>{detail.title}</div>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sc(detail.status).bg,color:sc(detail.status).color,display:"inline-block"}}>{sc(detail.status).label}</span>
              {[["Supplier",detail.suppliers?.name||detail.supplier_name||"—"],["Total Value",fmtKES(detail.total_value)],["Start Date",fmtDate(detail.start_date)],["End Date",fmtDate(detail.end_date)],["Performance Score",`${detail.performance_score||0}/100`],["Payment Terms",detail.payment_terms||"—"],["Delivery Terms",detail.delivery_terms||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f9fafb"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827",maxWidth:"60%",textAlign:"right" as const}}>{v}</span>
                </div>
              ))}
              {detail.description&&<div><div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase" as const,marginBottom:6}}>Description</div>
                <p style={{fontSize:14,color:"#374151",lineHeight:1.7,margin:0}}>{detail.description}</p>
              </div>}
              {canManage&&<button onClick={()=>{setDetail(null);openNew(detail);}} style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:800}}>Edit Contract</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
