
import { useState, useEffect } from "react";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, RefreshCw, Download, X, Save, Trash2, Eye, AlertTriangle, Search } from "lucide-react";
import * as XLSX from "xlsx";

const genNo = ()=>`NCR/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*900))}`;
const SC: Record<string,{bg:string;color:string}> = {
  open:{bg:"#fee2e2",color:"#dc2626"},
  under_review:{bg:"#fef3c7",color:"#92400e"},
  closed:{bg:"#dcfce7",color:"#15803d"},
  escalated:{bg:"#f3e8ff",color:"#7c3aed"},
};
const SEV: Record<string,string> = {critical:"#dc2626",major:"#d97706",minor:"#6b7280"};

export default function NonConformancePage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer")||hasRole("warehouse_officer");
  const [rows, setRows]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew]   = useState(false);
  const [detail, setDetail]     = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ncr_date:new Date().toISOString().slice(0,10),title:"",description:"",severity:"minor",source:"Inspection",supplier_name:"",item_name:"",grn_reference:"",root_cause:"",corrective_action:"",preventive_action:"",responsible_person:"",target_date:"",status:"open"});

  const load = async()=>{
    setLoading(true);
    try {
    const{data}=await(supabase as any).from("non_conformance").select("*").order("created_at",{ascending:false});
    const rows=data||[]; setRows(rows); pageCache.set("non_conformances",rows);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("non_conformances"); if(cached) setRows(cached);
      console.error("[NonConformance]",e);
    } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  /* - Real-time subscription - */
  useEffect(()=>{
    const ch=(supabase as any).channel("ncr-rt").on("postgres_changes",{event:"*",schema:"public",table:"non_conformance"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const save = async()=>{
    if(!form.title){toast({title:"Title required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,ncr_number:genNo(),issue_description:form.title||form.description||"",created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("non_conformance").insert(payload).select().single();
    if(error){toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","non_conformance",data?.id,{title:form.title});toast({title:"NCR created -"});setShowNew(false);load();}
    setSaving(false);
  };

  const updateStatus = async(id:string,status:string)=>{
    await(supabase as any).from("non_conformance").update({status,closed_by:status==="closed"?user?.id:null,closed_at:status==="closed"?new Date().toISOString():null}).eq("id",id);
    toast({title:`Status - ${status}`}); load();
  };

  const del = async(id:string)=>{ if(!confirm("Delete this NCR?")) return; await(supabase as any).from("non_conformance").delete().eq("id",id); toast({title:"Deleted"}); load(); };

  const exportExcel=()=>{ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"NCRs"); XLSX.writeFile(wb,`ncr_${new Date().toISOString().slice(0,10)}.xlsx`); toast({title:"Exported"}); };

  const filtered = rows.filter(r=>{ const ms=!search||(r.title||"").toLowerCase().includes(search.toLowerCase())||(r.ncr_number||"").includes(search)||(r.supplier_name||"").toLowerCase().includes(search.toLowerCase()); return ms&&(statusFilter==="all"||r.status===statusFilter); });
  const stats={open:rows.filter(r=>r.status==="open").length,under_review:rows.filter(r=>r.status==="under_review").length,closed:rows.filter(r=>r.status==="closed").length,critical:rows.filter(r=>r.severity==="critical").length};
  const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"100%"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{background:"linear-gradient(90deg,#7c2d12,#c2410c)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <AlertTriangle style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Non-Conformance Reports</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{stats.open} open - {stats.critical} critical - {stats.closed} closed</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#e2e8f0",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}><Download style={{width:13,height:13}}/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#7c2d12",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}><Plus style={{width:13,height:13}}/>New NCR</button>}
        </div>
      </div>
      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:14,alignItems:"center"}}>
        {[{id:"all",label:`All (${rows.length})`},{id:"open",label:`Open (${stats.open})`},{id:"under_review",label:`Under Review (${stats.under_review})`},{id:"closed",label:`Closed (${stats.closed})`}].map(f=>(
          <button key={f.id} onClick={()=>setStatusFilter(f.id)}
            style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${statusFilter===f.id?"#c2410c":"#e5e7eb"}`,background:statusFilter===f.id?"#c2410c":"#fff",color:statusFilter===f.id?"#fff":"#374151",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {f.label}
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search NCRs..." style={{padding:"6px 12px 6px 26px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",width:200}}/>
        </div>
      </div>
      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"linear-gradient(90deg,#7c2d12,#c2410c)"}}>
            {["NCR No.","Title","Severity","Supplier","Item","Status","Date","Actions"].map(h=>(
              <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?(<tr><td colSpan={8} style={{padding:24,textAlign:"center"}}><RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/></td></tr>):
            filtered.length===0?(<tr><td colSpan={8} style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No NCRs found</td></tr>):
            filtered.map((r,i)=>{
              const sc=SC[r.status]||{bg:"#f3f4f6",color:"#6b7280"};
              return(<tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fff7ed"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#fafafa"}>
                <td style={{padding:"9px 12px",fontWeight:700,color:"#c2410c",fontFamily:"monospace",fontSize:11}}>{r.ncr_number||"-"}</td>
                <td style={{padding:"9px 12px",fontWeight:600,color:"#1f2937",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</td>
                <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",background:`${SEV[r.severity]||"#6b7280"}18`,color:SEV[r.severity]||"#6b7280"}}>{r.severity||"minor"}</span></td>
                <td style={{padding:"9px 12px",color:"#374151"}}>{r.supplier_name||"-"}</td>
                <td style={{padding:"9px 12px",color:"#374151"}}>{r.item_name||"-"}</td>
                <td style={{padding:"9px 12px"}}><span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>{r.status?.replace("_"," ")||"-"}</span></td>
                <td style={{padding:"9px 12px",color:"#6b7280"}}>{r.ncr_date?new Date(r.ncr_date).toLocaleDateString("en-KE"):"-"}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>setDetail(r)} style={{padding:"4px 8px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:6,cursor:"pointer",lineHeight:0}}><Eye style={{width:12,height:12,color:"#c2410c"}}/></button>
                    {r.status!=="closed"&&hasRole("admin")&&<button onClick={()=>updateStatus(r.id,"closed")} style={{padding:"3px 8px",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:700,color:"#15803d"}}>Close</button>}
                    {hasRole("admin")&&<button onClick={()=>del(r.id)} style={{padding:"4px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",lineHeight:0}}><Trash2 style={{width:12,height:12,color:"#dc2626"}}/></button>}
                  </div>
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
      {/* Detail side panel */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",justifyContent:"flex-end"}} onClick={()=>setDetail(null)}>
          <div style={{width:"min(440px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:"linear-gradient(90deg,#7c2d12,#c2410c)",display:"flex",alignItems:"center",gap:8}}>
              <AlertTriangle style={{width:14,height:14,color:"#fff"}}/><span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>{detail.ncr_number}</span>
              <button onClick={()=>setDetail(null)} style={{background:"#e2e8f0",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:14,fontWeight:800,color:"#1f2937"}}>{detail.title}</div>
              {[["Severity",detail.severity],["Status",detail.status?.replace("_"," ")],["Source",detail.source],["Supplier",detail.supplier_name||"-"],["Item",detail.item_name||"-"],["GRN Ref",detail.grn_reference||"-"],["Responsible",detail.responsible_person||"-"],["Target Date",detail.target_date||"-"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827",textTransform:"capitalize"}}>{v||"-"}</span>
                </div>
              ))}
              {detail.description&&<div style={{padding:10,background:"#fef2f2",borderRadius:8,fontSize:12,color:"#374151"}}><b>Description:</b> {detail.description}</div>}
              {detail.root_cause&&<div style={{padding:10,background:"#fef3c7",borderRadius:8,fontSize:12,color:"#92400e"}}><b>Root Cause:</b> {detail.root_cause}</div>}
              {detail.corrective_action&&<div style={{padding:10,background:"#f0fdf4",borderRadius:8,fontSize:12,color:"#15803d"}}><b>Corrective Action:</b> {detail.corrective_action}</div>}
              {detail.preventive_action&&<div style={{padding:10,background:"#eff6ff",borderRadius:8,fontSize:12,color:"#1d4ed8"}}><b>Preventive Action:</b> {detail.preventive_action}</div>}
              {detail.status!=="closed"&&hasRole("admin")&&<button onClick={()=>{updateStatus(detail.id,"closed");setDetail(null);}} style={{padding:"9px",background:"#dcfce7",color:"#15803d",border:"1.5px solid #bbf7d0",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>Mark as Closed</button>}
            </div>
          </div>
        </div>
      )}
      {/* New NCR form */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(620px,100%)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(90deg,#7c2d12,#c2410c)",borderRadius:"16px 16px 0 0",display:"flex",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>New Non-Conformance Report</span>
              <button onClick={()=>setShowNew(false)} style={{background:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Title *</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={inp}/></div>
              {[["NCR Date","ncr_date","date"],["Source","source","text"],["Supplier Name","supplier_name","text"],["Item Name","item_name","text"],["GRN Reference","grn_reference","text"],["Responsible Person","responsible_person","text"],["Target Date","target_date","date"]].map(([l,k,t])=>(
                <div key={k}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label>
                  {t==="date"?<input type="date" value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/>:<input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/>}
                </div>
              ))}
              <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Severity</label>
                <select value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))} style={inp}>
                  {["minor","major","critical"].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {[["Description","description"],["Root Cause","root_cause"],["Corrective Action","corrective_action"],["Preventive Action","preventive_action"]].map(([l,k])=>(
                <div key={k} style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label>
                  <textarea value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} rows={2} style={{...inp,resize:"vertical",fontFamily:"inherit"}}/>
                </div>
              ))}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowNew(false)} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#c2410c",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}{saving?"Saving...":"Create NCR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
