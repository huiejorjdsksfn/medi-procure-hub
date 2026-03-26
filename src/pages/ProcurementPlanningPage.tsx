import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, Calendar, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE")}`;
const genNo = () => `PP/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*900))}`;
const SC: Record<string,string> = {draft:"#6b7280",approved:"#15803d",active:"#0369a1",completed:"#7c3aed",cancelled:"#dc2626"};
const CATS = ["Pharmaceuticals","Medical Supplies","Equipment","Laboratory","Construction","ICT","Stationery","Furniture","Services","Utilities"];

export default function ProcurementPlanningPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({title:"",description:"",financial_year:"2025/26",start_date:"",end_date:"",department_id:"",category:"",procurement_method:"Open Tender",estimated_budget:"",justification:"",status:"draft"});

  const load = async () => {
    setLoading(true);
    const [{data:p},{data:d}] = await Promise.all([
      (supabase as any).from("procurement_plans").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(p||[]); setDepts(d||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const openEdit = (r:any) => {
    setEditing(r);
    setForm({title:r.title,description:r.description||"",financial_year:r.financial_year||"2025/26",start_date:r.start_date||"",end_date:r.end_date||"",department_id:r.department_id||"",category:r.category||"",procurement_method:r.procurement_method||"Open Tender",estimated_budget:String(r.estimated_budget||0),justification:r.justification||"",status:r.status||"draft"});
    setShowNew(true);
  };

  const save = async () => {
    if(!form.title){toast({title:"Title required",variant:"destructive"});return;}
    setSaving(true);
    const dept = depts.find(d=>d.id===form.department_id);
    const payload={...form,plan_number:editing?editing.plan_number:genNo(),item_description:form.description||form.title||"",department_name:dept?.name||"",estimated_budget:Number(form.estimated_budget||0),department_id:form.department_id||null,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("procurement_plans").update(payload).eq("id",editing.id);
      if(!error){toast({title:"Plan updated ✓"});logAudit(user?.id,profile?.full_name,"update","procurement_plans",editing.id,{title:form.title});}
      else toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});
    } else {
      const{data,error}=await(supabase as any).from("procurement_plans").insert(payload).select().single();
      if(!error){toast({title:"Plan created ✓"});logAudit(user?.id,profile?.full_name,"create","procurement_plans",data?.id,{title:form.title});}
      else toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this plan?")) return;
    await(supabase as any).from("procurement_plans").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Procurement Plans");
    XLSX.writeFile(wb,`procurement_plans_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalBudget = filtered.reduce((s,r)=>s+Number(r.estimated_budget||0),0);

  return (
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:16,fontFamily:"'Segoe UI',system-ui"}}>
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const approved=rows.filter(r=>r.status==="approved").length;
        const active=rows.filter(r=>r.status==="active").length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Est. Budget",val:fmtK(totalBudget),bg:"#c0392b"},
              {label:"Total Plans",val:rows.length,bg:"#7d6608"},
              {label:"Approved",val:approved,bg:"#0e6655"},
              {label:"Active",val:active,bg:"#6c3483"},
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
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#0f172a,#1e40af)"}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Procurement Planning</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{rows.length} plans · Est. Budget: {fmtKES(totalBudget)}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({title:"",description:"",financial_year:"2025/26",start_date:"",end_date:"",department_id:"",category:"",procurement_method:"Open Tender",estimated_budget:"",justification:"",status:"draft"});setShowNew(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#1e40af"}}><Plus style={{width:14,height:14}}/>New Plan</button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:384}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plans..." style={{width:"100%",paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#0f172a"}}>
            {["Plan No.","Title","Dept.","Category","Method","Budget","FY","Status","Actions"].map(h=>(
              <th key={h} style={{textAlign:"left",fontWeight:700,color:"rgba(255,255,255,0.8)",fontSize:10,textTransform:"uppercase",padding:"10px 12px"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{padding:"32px 0",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={9} style={{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:12}}>No procurement plans yet</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 16px",fontFamily:"monospace",fontSize:10,color:"#1e40af"}}>{r.plan_number}</td>
                <td style={{padding:"10px 16px",fontWeight:600,color:"#1f2937",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.department_name||"—"}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.category||"—"}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.procurement_method||"—"}</td>
                <td style={{padding:"10px 16px",fontWeight:700,color:"#374151"}}>{fmtKES(r.estimated_budget||0)}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.financial_year}</td>
                <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,textTransform:"capitalize",background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:4}}>
                  {canManage&&<button onClick={()=>openEdit(r)} style={{padding:5,borderRadius:6,background:"#dbeafe",border:"none",cursor:"pointer"}}><Edit style={{width:12,height:12,color:"#2563eb"}}/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:5,borderRadius:6,background:"#fee2e2",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12,color:"#ef4444"}}/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}><h3 style={{fontWeight:900,color:"#1f2937",margin:0}}>{editing?"Edit Plan":"New Procurement Plan"}</h3><button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button></div>
            <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Plan Title *</label>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              {[["Financial Year","financial_year"],["Start Date","start_date","date"],["End Date","end_date","date"],["Estimated Budget (KES)","estimated_budget","number"]].map(([l,k,t])=>(
                <div key={k}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              ))}
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">— Select —</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">— Select —</option>{CATS.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Procurement Method</label>
                <select value={form.procurement_method} onChange={e=>setForm(p=>({...p,procurement_method:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {["Open Tender","Restricted Tender","Direct Procurement","Request for Quotation","Framework Agreement"].map(m=><option key={m}>{m}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {["draft","approved","active","completed","cancelled"].map(s=><option key={s} style={{textTransform:"capitalize"}}>{s}</option>)}
                </select></div>
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Justification</label>
                <textarea value={form.justification} onChange={e=>setForm(p=>({...p,justification:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            </div></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#1e40af"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":editing?"Update Plan":"Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      </div>
  );
}