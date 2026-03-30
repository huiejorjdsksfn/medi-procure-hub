import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { notifyProcurement } from "@/lib/notify";
import { useNavigate } from "react-router-dom";
import { Plus, Search, RefreshCw, Eye, Printer, Download, FileText, DollarSign, X, Save, CheckCircle, XCircle, Clock } from "lucide-react";
import logo from "@/assets/embu-county-logo.jpg";
import * as XLSX from "xlsx";

const genNo = () => { const d=new Date(); return `SRV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`; };
const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;

const S_CFG:Record<string,{bg:string;color:string;label:string}> = {
  draft:    {bg:"#f3f4f6",color:"#6b7280",label:"Draft"},
  pending:  {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  approved: {bg:"#dcfce7",color:"#15803d",label:"Approved"},
  issued:   {bg:"#dbeafe",color:"#1d4ed8",label:"Issued"},
  rejected: {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
};
const sc = (s:string) => S_CFG[s]||S_CFG.draft;

const UNITS=["pcs","box","litres","kg","mg","tablets","ampoules","vials","sachets","rolls"];

interface VItem { code_no:string; item_description:string; unit_of_issue:string; quantity_required:string; quantity_issued:string; value:string; remarks:string; }
const EMPTY:VItem = {code_no:"",item_description:"",unit_of_issue:"pcs",quantity_required:"",quantity_issued:"",value:"",remarks:""};

const LBL = ({children}:{children:any}) => <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{children}</div>;
const INP = (v:any,cb:any,p="",t="text") => (
  <input type={t} value={v} onChange={e=>cb(e.target.value)} placeholder={p}
    style={{width:"100%",padding:"8px 11px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:7,outline:"none",background:"#fff",boxSizing:"border-box" as const}}/>
);

export default function VouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const canApprove = hasRole("admin")||hasRole("procurement_manager");

  const [rows,    setRows]    = useState<any[]>([]);
  const [depts,   setDepts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [stFilter,setStFilter]= useState("all");
  const [showNew, setShowNew] = useState(false);
  const [detail,  setDetail]  = useState<any>(null);
  const [print,   setPrint]   = useState<any>(null);
  const [saving,  setSaving]  = useState(false);
  const [form,setForm] = useState({voucher_number:"",requested_by:profile?.full_name||"",department_id:"",purpose:"",date:new Date().toISOString().split("T")[0],items:[{...EMPTY}]});

  const load = useCallback(async()=>{
    setLoading(true);
    const [{data:v},{data:d}] = await Promise.all([
      (supabase as any).from("vouchers").select("*,departments(name)").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(v||[]); setDepts(d||[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=(supabase as any).channel("vouchers-store-rt").on("postgres_changes",{event:"*",schema:"public",table:"vouchers"},load).subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[load]);

  const total=(items:VItem[])=>items.reduce((s,it)=>s+Number(it.value||0)*Number(it.quantity_issued||it.quantity_required||1),0);

  const save=async()=>{
    if(!form.purpose){toast({title:"Purpose is required",variant:"destructive"});return;}
    const validItems=form.items.filter(it=>it.item_description.trim());
    if(!validItems.length){toast({title:"Add at least one item",variant:"destructive"});return;}
    setSaving(true);
    const dept=depts.find(d=>d.id===form.department_id);
    const payload={voucher_number:form.voucher_number||genNo(),requested_by:form.requested_by||profile?.full_name,department_id:form.department_id||null,department_name:dept?.name,purpose:form.purpose,date:form.date,items:validItems,total_value:total(validItems),status:"pending",created_by:user?.id};
    const{data,error}=await(supabase as any).from("vouchers").insert(payload).select().single();
    if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});setSaving(false);return;}
    logAudit(user?.id,profile?.full_name,"create","vouchers",data?.id,{});
    await notifyProcurement({title:"New Store Voucher",message:`${payload.voucher_number} — ${form.purpose.slice(0,60)}`,type:"voucher",module:"Vouchers",senderId:user?.id});
    toast({title:"Voucher submitted ✓"});
    setShowNew(false); setForm({voucher_number:"",requested_by:profile?.full_name||"",department_id:"",purpose:"",date:new Date().toISOString().split("T")[0],items:[{...EMPTY}]});
    load(); setSaving(false);
  };

  const approve=async(v:any)=>{
    await(supabase as any).from("vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name,approved_at:new Date().toISOString()}).eq("id",v.id);
    toast({title:"Voucher approved ✓"}); load();
  };
  const reject_=async(v:any)=>{
    await(supabase as any).from("vouchers").update({status:"rejected"}).eq("id",v.id);
    toast({title:"Rejected"}); load();
  };
  const issue=async(v:any)=>{
    await(supabase as any).from("vouchers").update({status:"issued",issued_by:profile?.full_name,issued_at:new Date().toISOString()}).eq("id",v.id);
    toast({title:"Issued ✓"}); load();
  };

  const addItem=()=>setForm(p=>({...p,items:[...p.items,{...EMPTY}]}));
  const rmItem=(i:number)=>setForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}));
  const updItem=(i:number,k:keyof VItem,v:string)=>setForm(p=>({...p,items:p.items.map((it,j)=>j===i?{...it,[k]:v}:it)}));

  const filtered=rows.filter(r=>(stFilter==="all"||r.status===stFilter)&&(!search||[r.voucher_number,r.purpose,r.requested_by,r.departments?.name||r.department_name].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()))));

  const exportXLSX=()=>{
    const ws=XLSX.utils.json_to_sheet(filtered.map(r=>({No:r.voucher_number,Purpose:r.purpose,"Requested By":r.requested_by,Department:r.departments?.name||r.department_name,Total:r.total_value,Date:r.date,Status:r.status})));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Store Vouchers");XLSX.writeFile(wb,`StoreVouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
      <div style={{padding:"20px 24px",maxWidth:1400,margin:"0 auto"}}>
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const totalVal=rows.reduce((s:number,r:any)=>s+Number(r.total_value||0),0);
        const pending=rows.filter(r=>r.status==="pending").length;
        const approved=rows.filter(r=>r.status==="approved").length;
        return(
          <div style={{display:"grid" as const,gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
            {[
              {label:"Total Value",val:fmtK(totalVal),bg:"#c0392b"},
              {label:"Total Vouchers",val:rows.length,bg:"#7d6608"},
              {label:"Pending",val:pending,bg:"#6c3483"},
              {label:"Approved",val:approved,bg:"#0e6655"},
              {label:"Showing",val:filtered.length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center" as const,background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div style={{display:"flex" as const,alignItems:"flex-start" as const,justifyContent:"space-between" as const,marginBottom:20,flexWrap:"wrap" as const,gap:12}}>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:10}}>
          <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#5C2D91,#7c3aed)",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
            <FileText style={{width:21,height:21,color:"#fff"}}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:0}}>Store Vouchers</h1>
            <p style={{fontSize:13,color:"#6b7280",margin:0}}>Issue vouchers · {rows.length} total</p>
          </div>
        </div>
        <div style={{display:"flex" as const,gap:8,flexWrap:"wrap" as const}}>
          {/* Quick links to voucher types */}
          {[{label:"Payment",path:"/vouchers/payment"},{label:"Receipt",path:"/vouchers/receipt"},{label:"Journal",path:"/vouchers/journal"}].map(l=>(
            <button key={l.path} onClick={()=>navigate(l.path)} style={{padding:"7px 12px",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:7,cursor:"pointer" as const,fontSize:12,fontWeight:700,color:"#0369a1"}}>{l.label} Vouchers →</button>
          ))}
          <button onClick={exportXLSX} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"9px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:600}}><Download style={{width:13,height:13}}/> Export</button>
          <button onClick={()=>setShowNew(true)} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"9px 18px",background:"linear-gradient(135deg,#5C2D91,#7c3aed)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:800,boxShadow:"0 2px 8px rgba(92,45,145,0.3)"}}>
            <Plus style={{width:14,height:14}}/> New Voucher
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div style={{display:"flex" as const,gap:8,marginBottom:14,flexWrap:"wrap" as const}}>
        {[{id:"all",label:"All"},{id:"pending",label:"Pending"},{id:"approved",label:"Approved"},{id:"issued",label:"Issued"},{id:"rejected",label:"Rejected"}].map(f=>(
          <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?"#5C2D91":"#e5e7eb"}`,background:stFilter===f.id?"#5C2D91":"#fff",color:stFilter===f.id?"#fff":"#374151",fontSize:12,fontWeight:700,cursor:"pointer" as const}}>
            {f.label} ({rows.filter(r=>f.id==="all"||r.status===f.id).length})
          </button>
        ))}
      </div>

      <div style={{position:"relative" as const,marginBottom:14}}>
        <Search style={{position:"absolute" as const,left:12,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search voucher number, purpose, department..."
          style={{width:"100%",padding:"10px 12px 10px 34px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:9,outline:"none",background:"#fff",boxSizing:"border-box" as const}}/>
      </div>

      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden" as const,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
              {["Voucher No","Purpose","Requested By","Department","Total","Date","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase" as const,letterSpacing:"0.06em",whiteSpace:"nowrap" as const}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?[1,2,3].map(i=>(
              <tr key={i}>{[...Array(8)].map((_,j)=><td key={j} style={{padding:"14px"}}><div style={{height:12,background:"#f3f4f6",borderRadius:4,animation:"pulse 1.5s infinite"}}/></td>)}</tr>
            )):filtered.length===0?(
              <tr><td colSpan={8} style={{padding:"60px",textAlign:"center" as const,color:"#9ca3af",fontSize:14}}>
                <FileText style={{width:40,height:40,color:"#e5e7eb",margin:"0 auto 12px"}}/>
                <div style={{fontWeight:600}}>No vouchers yet</div>
              </td></tr>
            ):filtered.map(r=>{
              const cfg=sc(r.status);
              return(
                <tr key={r.id} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer" as const}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:800,color:"#5C2D91",fontFamily:"monospace"}} onClick={()=>setDetail(r)}>{r.voucher_number}</td>
                  <td style={{padding:"12px 14px",fontSize:13,color:"#111827",maxWidth:200,overflow:"hidden" as const,textOverflow:"ellipsis",whiteSpace:"nowrap" as const}} onClick={()=>setDetail(r)}>{r.purpose}</td>
                  <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}} onClick={()=>setDetail(r)}>{r.requested_by}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}} onClick={()=>setDetail(r)}>{r.departments?.name||r.department_name||"—"}</td>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:"#111827"}} onClick={()=>setDetail(r)}>{fmtKES(r.total_value||0)}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}} onClick={()=>setDetail(r)}>{r.date?new Date(r.date).toLocaleDateString("en-KE"):"—"}</td>
                  <td style={{padding:"12px 14px"}} onClick={()=>setDetail(r)}><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span></td>
                  <td style={{padding:"12px 14px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex" as const,gap:4,flexWrap:"wrap" as const}}>
                      <button onClick={()=>setPrint(r)} title="Print" style={{padding:"4px 8px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:5,cursor:"pointer" as const,lineHeight:0}}><Printer style={{width:11,height:11,color:"#6b7280"}}/></button>
                      {canApprove&&r.status==="pending"&&<>
                        <button onClick={()=>approve(r)} style={{padding:"4px 8px",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:5,cursor:"pointer" as const,lineHeight:0}}><CheckCircle style={{width:11,height:11,color:"#15803d"}}/></button>
                        <button onClick={()=>reject_(r)} style={{padding:"4px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer" as const,lineHeight:0}}><XCircle style={{width:11,height:11,color:"#dc2626"}}/></button>
                      </>}
                      {canApprove&&r.status==="approved"&&<button onClick={()=>issue(r)} style={{padding:"4px 9px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer" as const,fontSize:10,fontWeight:700,color:"#1d4ed8"}}>Issue</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Voucher Modal */}
      {showNew&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.55)",zIndex:500,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(800px,100%)",maxHeight:"92vh",overflowY:"auto" as const,boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"14px 14px 0 0",display:"flex" as const,gap:10,alignItems:"center" as const,position:"sticky" as const,top:0,zIndex:1}}>
              <FileText style={{width:16,height:16,color:"#fff"}}/><span style={{fontSize:15,fontWeight:800,color:"#fff",flex:1}}>New Store Requisition Voucher</span>
              <button onClick={()=>setShowNew(false)} style={{background:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer" as const,color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:20,display:"flex" as const,flexDirection:"column" as const,gap:14}}>
              <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div><LBL>Voucher No</LBL>{INP(form.voucher_number,v=>setForm(p=>({...p,voucher_number:v})),"Auto-generated")}</div>
                <div><LBL>Requested By</LBL>{INP(form.requested_by,v=>setForm(p=>({...p,requested_by:v})),profile?.full_name||"")}</div>
                <div><LBL>Date</LBL>{INP(form.date,v=>setForm(p=>({...p,date:v})),"","date")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Department</LBL>
                  <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))} style={{width:"100%",padding:"8px 11px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                    <option value="">Select department...</option>
                    {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><LBL>Purpose / Nature of Issue</LBL>{INP(form.purpose,v=>setForm(p=>({...p,purpose:v})),"e.g. Ward supplies — April")}</div>
              </div>

              {/* Items table */}
              <div>
                <div style={{fontSize:12,fontWeight:800,color:"#374151",marginBottom:8,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Items</div>
                <div style={{border:"1.5px solid #e5e7eb",borderRadius:9,overflow:"hidden" as const}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f9fafb"}}>
                        {["Code No","Item Description","Unit","Qty Required","Qty Issued","Value (KES)","Remarks",""].map(h=>(
                          <th key={h} style={{padding:"8px 10px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"4px 6px"}}><input value={it.code_no} onChange={e=>updItem(i,"code_no",e.target.value)} style={{width:70,padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"4px 6px"}}><input value={it.item_description} onChange={e=>updItem(i,"item_description",e.target.value)} placeholder="Item name..." style={{width:180,padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"4px 6px"}}>
                            <select value={it.unit_of_issue} onChange={e=>updItem(i,"unit_of_issue",e.target.value)} style={{padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}>
                              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"4px 6px"}}><input type="number" value={it.quantity_required} onChange={e=>updItem(i,"quantity_required",e.target.value)} style={{width:70,padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"4px 6px"}}><input type="number" value={it.quantity_issued} onChange={e=>updItem(i,"quantity_issued",e.target.value)} style={{width:70,padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"4px 6px"}}><input type="number" value={it.value} onChange={e=>updItem(i,"value",e.target.value)} style={{width:90,padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"4px 6px"}}><input value={it.remarks} onChange={e=>updItem(i,"remarks",e.target.value)} style={{width:100,padding:"5px 7px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"4px 6px"}}>{form.items.length>1&&<button onClick={()=>rmItem(i)} style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer" as const,padding:"4px 6px",lineHeight:0}}><X style={{width:10,height:10,color:"#dc2626"}}/></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{padding:"8px 12px",display:"flex" as const,justifyContent:"space-between" as const,alignItems:"center" as const,background:"#f9fafb",borderTop:"1px solid #e5e7eb"}}>
                    <button onClick={addItem} style={{display:"flex" as const,alignItems:"center" as const,gap:5,padding:"5px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer" as const,fontSize:12,fontWeight:700,color:"#1d4ed8"}}>
                      <Plus style={{width:11,height:11}}/> Add Item
                    </button>
                    <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>Total: {fmtKES(total(form.items))}</span>
                  </div>
                </div>
              </div>

              <div style={{display:"flex" as const,gap:8,justifyContent:"flex-end" as const,paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
                <button onClick={()=>setShowNew(false)} style={{padding:"9px 18px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:600}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"9px 22px",background:"linear-gradient(135deg,#5C2D91,#7c3aed)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:800}}>
                  {saving?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Save style={{width:12,height:12}}/>} {saving?"Saving...":"Submit Voucher"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print modal */}
      {print&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.6)",zIndex:600,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"min(700px,100%)",maxHeight:"90vh",overflowY:"auto" as const,boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"10px 14px",display:"flex" as const,justifyContent:"space-between" as const,alignItems:"center" as const,borderBottom:"1px solid #e5e7eb"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#374151"}}>Store Requisition Voucher</span>
              <div style={{display:"flex" as const,gap:8}}>
                <button onClick={()=>window.print()} style={{padding:"6px 14px",background:"#15803d",color:"#fff",border:"none",borderRadius:6,cursor:"pointer" as const,fontSize:12,fontWeight:700,display:"flex" as const,alignItems:"center" as const,gap:5}}><Printer style={{width:11,height:11}}/> Print</button>
                <button onClick={()=>setPrint(null)} style={{background:"#f3f4f6",border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer" as const,lineHeight:0}}><X style={{width:13,height:13}}/></button>
              </div>
            </div>
            <div id="print-area" style={{padding:24,fontFamily:"serif"}}>
              <div style={{display:"flex" as const,alignItems:"center" as const,gap:16,marginBottom:8,paddingBottom:8,borderBottom:"2px solid #111"}}>
                <img src={logo} alt="logo" style={{width:70,height:70,objectFit:"contain" as const}}/>
                <div>
                  <div style={{fontSize:15,fontWeight:900,textTransform:"uppercase" as const}}>Embu County Government</div>
                  <div style={{fontSize:13,fontWeight:700}}>Embu Level 5 Hospital</div>
                  <div style={{fontSize:11}}>P.O. Box 1 – 60100, Embu, Kenya</div>
                </div>
                <div style={{marginLeft:"auto",textAlign:"right" as const}}>
                  <div style={{fontSize:16,fontWeight:900,textTransform:"uppercase" as const}}>STORE REQUISITION VOUCHER</div>
                  <div style={{fontSize:13,fontWeight:700,marginTop:4}}>No: {print.voucher_number}</div>
                  <div style={{fontSize:11}}>Date: {print.date?new Date(print.date).toLocaleDateString("en-KE",{dateStyle:"long"}):"—"}</div>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:8,fontSize:12}}>
                <tbody>
                  {[["Requested by",print.requested_by||"—"],["Department",print.departments?.name||print.department_name||"—"],["Purpose / Nature",print.purpose||"—"]].map(([l,v])=>(
                    <tr key={l}><td style={{padding:"4px 8px",border:"1px solid #999",fontWeight:700,width:180}}>{l}:</td><td style={{padding:"4px 8px",border:"1px solid #999"}}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#f3f4f6"}}>
                    {["#","Code No","Item Description","Unit","Qty Required","Qty Issued","Value (KES)","Remarks"].map(h=>(
                      <th key={h} style={{padding:"6px 8px",border:"1px solid #999",textAlign:"left" as const,fontWeight:700}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(print.items||[]).map((it:any,i:number)=>(
                    <tr key={i}>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"center" as const}}>{i+1}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc"}}>{it.code_no||"—"}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc"}}>{it.item_description}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"center" as const}}>{it.unit_of_issue}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"right" as const}}>{it.quantity_required}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"right" as const}}>{it.quantity_issued||"—"}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"right" as const}}>{it.value?Number(it.value).toLocaleString():"—"}</td>
                      <td style={{padding:"5px 8px",border:"1px solid #ccc"}}>{it.remarks||"—"}</td>
                    </tr>
                  ))}
                  <tr style={{fontWeight:800,background:"#f3f4f6"}}>
                    <td colSpan={6} style={{padding:"6px 8px",border:"1px solid #999",textAlign:"right" as const}}>TOTAL:</td>
                    <td style={{padding:"6px 8px",border:"1px solid #999",textAlign:"right" as const}}>{fmtKES(print.total_value||0)}</td>
                    <td style={{border:"1px solid #999"}}/>
                  </tr>
                </tbody>
              </table>
              <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:20}}>
                {[["Requested by","",""],["Stores Officer","",""],["Authorized by","",""]].map(([l])=>(
                  <div key={l} style={{textAlign:"center" as const}}>
                    <div style={{height:48,borderBottom:"1px solid #000",marginBottom:4}}/>
                    <div style={{fontSize:10,fontWeight:700}}>{l}</div>
                    <div style={{fontSize:10,color:"#6b7280"}}>Name / Signature / Date</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
