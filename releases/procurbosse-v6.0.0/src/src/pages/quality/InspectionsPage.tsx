
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, RefreshCw, Download, X, Save, Trash2, Eye, CheckCircle, XCircle, AlertTriangle, Clock, Search } from "lucide-react";
import * as XLSX from "xlsx";

const genNo = ()=>`QI/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Math.floor(100+Math.random()*9900))}`;
const RC: Record<string,{bg:string;color:string}> = {
  pass:{bg:"#dcfce7",color:"#15803d"},fail:{bg:"#fee2e2",color:"#dc2626"},
  conditional:{bg:"#fef3c7",color:"#92400e"},pending:{bg:"#f3f4f6",color:"#6b7280"},
};

export default function InspectionsPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer")||hasRole("warehouse_officer");
  const [rows, setRows]         = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [showNew, setShowNew]   = useState(false);
  const [detail, setDetail]     = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({inspection_date:new Date().toISOString().slice(0,10),grn_reference:"",supplier_id:"",supplier_name:"",item_name:"",quantity_inspected:"",quantity_accepted:"",quantity_rejected:"",result:"pending",rejection_reason:"",inspector_name:profile?.full_name||"",corrective_action:"",notes:""});

  const load = async()=>{
    setLoading(true);
    const [{data:i},{data:s}] = await Promise.all([
      (supabase as any).from("inspections").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
    ]);
    setRows(i||[]); setSuppliers(s||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  /* ── Real-time subscription ─────────────────────────────── */
  useEffect(()=>{
    const ch=(supabase as any).channel("ins-rt").on("postgres_changes",{event:"*",schema:"public",table:"inspections"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const save = async()=>{
    if(!form.item_name||!form.inspection_date){toast({title:"Item name and date required",variant:"destructive"});return;}
    setSaving(true);
    const supp = suppliers.find(s=>s.id===form.supplier_id);
    const payload={...form,inspection_number:genNo(),supplier_id:form.supplier_id||null,supplier_name:supp?.name||form.supplier_name,
      quantity_inspected:Number(form.quantity_inspected||0),quantity_accepted:Number(form.quantity_accepted||0),quantity_rejected:Number(form.quantity_rejected||0),
      created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("inspections").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","inspections",data?.id,{item:form.item_name});toast({title:"Inspection recorded ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const del = async(id:string)=>{ if(!confirm("Delete?")) return; await(supabase as any).from("inspections").delete().eq("id",id); toast({title:"Deleted"}); load(); };

  const exportExcel=()=>{ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Inspections"); XLSX.writeFile(wb,`inspections_${new Date().toISOString().slice(0,10)}.xlsx`); toast({title:"Exported"}); };

  const filtered = rows.filter(r=>{ const ms=!search||(r.item_name||"").toLowerCase().includes(search.toLowerCase())||(r.supplier_name||"").toLowerCase().includes(search.toLowerCase())||(r.inspection_number||"").includes(search); return ms&&(resultFilter==="all"||r.result===resultFilter); });
  const stats={pass:rows.filter(r=>r.result==="pass").length,fail:rows.filter(r=>r.result==="fail").length,pending:rows.filter(r=>r.result==="pending").length,conditional:rows.filter(r=>r.result==="conditional").length};
  const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"calc(100vh - 60px)"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{background:"linear-gradient(90deg,#134e4a,#0f766e)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>QC Inspections</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{rows.length} total · {stats.pass} passed · {stats.fail} failed</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}><Download style={{width:13,height:13}}/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#134e4a",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}><Plus style={{width:13,height:13}}/>New Inspection</button>}
        </div>
      </div>
      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{label:"Passed",count:stats.pass,icon:CheckCircle,color:"#15803d"},{label:"Failed",count:stats.fail,icon:XCircle,color:"#dc2626"},{label:"Conditional",count:stats.conditional,icon:AlertTriangle,color:"#d97706"},{label:"Pending",count:stats.pending,icon:Clock,color:"#6b7280"}].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{width:34,height:34,borderRadius:9,background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><s.icon style={{width:16,height:16,color:s.color}}/></div>
            <div><div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.count}</div><div style={{fontSize:10,color:"#6b7280",fontWeight:600}}>{s.label}</div></div>
          </div>
        ))}
      </div>
      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {["all","pass","fail","conditional","pending"].map(f=>(
          <button key={f} onClick={()=>setResultFilter(f)}
            style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${resultFilter===f?"#0f766e":"#e5e7eb"}`,background:resultFilter===f?"#0f766e":"#fff",color:resultFilter===f?"#fff":"#374151",fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>
            {f==="all"?"All Results":f}
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{padding:"6px 12px 6px 26px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",width:200}}/>
        </div>
      </div>
      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"linear-gradient(90deg,#134e4a,#0f766e)"}}>
            {["Inspection No.","Item","Supplier","Date","Qty Inspected","Accepted","Rejected","Result","Actions"].map(h=>(
              <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?(<tr><td colSpan={9} style={{padding:24,textAlign:"center"}}><RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/></td></tr>):
            filtered.length===0?(<tr><td colSpan={9} style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No inspections found</td></tr>):
            filtered.map((r,i)=>{
              const rc=RC[r.result]||RC.pending;
              return(<tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0fdf4"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#f9fafb"}>
                <td style={{padding:"9px 12px",fontWeight:700,color:"#0f766e",fontFamily:"monospace",fontSize:11}}>{r.inspection_number||"—"}</td>
                <td style={{padding:"9px 12px",fontWeight:600,color:"#1f2937"}}>{r.item_name||"—"}</td>
                <td style={{padding:"9px 12px",color:"#374151"}}>{r.supplier_name||"—"}</td>
                <td style={{padding:"9px 12px",color:"#6b7280"}}>{r.inspection_date?new Date(r.inspection_date).toLocaleDateString("en-KE"):"—"}</td>
                <td style={{padding:"9px 12px",textAlign:"center",color:"#374151"}}>{r.quantity_inspected||0}</td>
                <td style={{padding:"9px 12px",textAlign:"center",color:"#15803d",fontWeight:700}}>{r.quantity_accepted||0}</td>
                <td style={{padding:"9px 12px",textAlign:"center",color:"#dc2626",fontWeight:700}}>{r.quantity_rejected||0}</td>
                <td style={{padding:"9px 12px"}}><span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",background:rc.bg,color:rc.color}}>{r.result||"—"}</span></td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>setDetail(r)} style={{padding:"4px 8px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer",lineHeight:0}}><Eye style={{width:12,height:12,color:"#15803d"}}/></button>
                    {hasRole("admin")&&<button onClick={()=>del(r.id)} style={{padding:"4px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",lineHeight:0}}><Trash2 style={{width:12,height:12,color:"#dc2626"}}/></button>}
                  </div>
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
      {/* Detail slide */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",justifyContent:"flex-end"}} onClick={()=>setDetail(null)}>
          <div style={{width:"min(440px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:"linear-gradient(90deg,#134e4a,#0f766e)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>{detail.inspection_number}</span>
              <button onClick={()=>setDetail(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              {[["Item",detail.item_name],["Supplier",detail.supplier_name||"—"],["Date",detail.inspection_date?new Date(detail.inspection_date).toLocaleDateString("en-KE"):"—"],["Inspector",detail.inspector_name||"—"],["Qty Inspected",String(detail.quantity_inspected||0)],["Qty Accepted",String(detail.quantity_accepted||0)],["Qty Rejected",String(detail.quantity_rejected||0)],["Result",detail.result],["GRN Reference",detail.grn_reference||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827",textTransform:"capitalize"}}>{v||"—"}</span>
                </div>
              ))}
              {detail.rejection_reason&&<div style={{padding:10,background:"#fef2f2",borderRadius:8,fontSize:12,color:"#dc2626"}}><b>Rejection Reason:</b> {detail.rejection_reason}</div>}
              {detail.corrective_action&&<div style={{padding:10,background:"#f0fdf4",borderRadius:8,fontSize:12,color:"#15803d"}}><b>Corrective Action:</b> {detail.corrective_action}</div>}
              {detail.notes&&<div style={{padding:10,background:"#f9fafb",borderRadius:8,fontSize:12,color:"#374151"}}>{detail.notes}</div>}
            </div>
          </div>
        </div>
      )}
      {/* New inspection modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(640px,100%)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(90deg,#134e4a,#0f766e)",borderRadius:"16px 16px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>New QC Inspection</span>
              <button onClick={()=>setShowNew(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Inspection Date</label><input type="date" value={form.inspection_date} onChange={e=>setForm(p=>({...p,inspection_date:e.target.value}))} style={inp}/></div>
              <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Supplier</label>
                <select value={form.supplier_id} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value,supplier_name:suppliers.find(s=>s.id===e.target.value)?.name||""}))} style={inp}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {[["Item Name *","item_name"],["GRN Reference","grn_reference"],["Inspector Name","inspector_name"]].map(([l,k])=>(
                <div key={k}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label><input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/></div>
              ))}
              {[["Qty Inspected","quantity_inspected"],["Qty Accepted","quantity_accepted"],["Qty Rejected","quantity_rejected"]].map(([l,k])=>(
                <div key={k}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label><input type="number" min={0} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/></div>
              ))}
              <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Result</label>
                <select value={form.result} onChange={e=>setForm(p=>({...p,result:e.target.value}))} style={inp}>
                  {["pending","pass","fail","conditional"].map(v=><option key={v} value={v} style={{textTransform:"capitalize"}}>{v}</option>)}
                </select>
              </div>
              <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Rejection Reason</label><input value={form.rejection_reason} onChange={e=>setForm(p=>({...p,rejection_reason:e.target.value}))} style={inp}/></div>
              <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Corrective Action</label><textarea value={form.corrective_action} onChange={e=>setForm(p=>({...p,corrective_action:e.target.value}))} rows={2} style={{...inp,resize:"vertical" as const,fontFamily:"inherit"}}/></div>
              <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...inp,resize:"vertical" as const,fontFamily:"inherit"}}/></div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowNew(false)} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#0f766e",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}{saving?"Saving...":"Submit Inspection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
