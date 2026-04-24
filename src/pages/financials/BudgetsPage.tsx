import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:0})}`;
const genCode = () => `BDG-${new Date().getFullYear()}-${String(Math.floor(100+Math.random()*900))}`;
const SC: Record<string,string> = {active:"#15803d",draft:"#6b7280",closed:"#dc2626",exceeded:"#d97706"};

export default function BudgetsPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({budget_name:"",department_id:"",department_name:"",financial_year:"2025/26",allocated_amount:"",category:"",status:"active",notes:""});

  const load = async () => {
    setLoading(true);
    const [{data:b},{data:d}] = await Promise.all([
      (supabase as any).from("budgets").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(b||[]); setDepts(d||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  /* - Real-time subscription - */
  useEffect(()=>{
    const ch=(supabase as any).channel("bud-rt").on("postgres_changes",{event:"*",schema:"public",table:"budgets"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const openEdit = (b:any) => {
    setEditing(b);
    setForm({budget_name:b.budget_name,department_id:b.department_id||"",department_name:b.department_name||"",financial_year:b.financial_year,allocated_amount:String(b.allocated_amount),category:b.category||"",status:b.status,notes:b.notes||""});
    setShowNew(true);
  };

  const save = async () => {
    if(!form.budget_name||!form.allocated_amount){toast({title:"Budget name and amount required",variant:"destructive"});return;}
    setSaving(true);
    const dept = depts.find(d=>d.id===form.department_id);
    const payload={...form,budget_code:editing?editing.budget_code:genCode(),department_name:dept?.name||form.department_name,allocated_amount:Number(form.allocated_amount),department_id:form.department_id||null,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("budgets").update(payload).eq("id",editing.id);
      if(error){toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});}
      else{logAudit(user?.id,profile?.full_name,"update","budgets",editing.id,{name:form.budget_name});toast({title:"Budget updated -"});}
    } else {
      const{data,error}=await(supabase as any).from("budgets").insert(payload).select().single();
      if(error){toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});}
      else{logAudit(user?.id,profile?.full_name,"create","budgets",data?.id,{name:form.budget_name});toast({title:"Budget created -"});}
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this budget?")) return;
    await(supabase as any).from("budgets").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Budgets");
    XLSX.writeFile(wb,`budgets_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAllocated = filtered.reduce((s,r)=>s+Number(r.allocated_amount||0),0);
  const totalSpent = filtered.reduce((s,r)=>s+Number(r.spent_amount||0),0);

  const activeCount = filtered.filter(r=>r.status==="active").length;
  const exceededCount = filtered.filter(r=>r.status==="exceeded"||(r.spent_amount||0)>r.allocated_amount).length;
  const utilizationPct = totalAllocated>0?Math.round(totalSpent/totalAllocated*100):0;

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:768px){.vpage-header{flex-direction:column!important;align-items:flex-start!important}}
      `}</style>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:12,fontFamily:"'Segoe UI',system-ui"}}>
      {/* KPI TILES */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
        {[
          {label:"Total Allocated",val:fmtKES(totalAllocated),bg:"#c0392b"},
          {label:"Total Spent",val:fmtKES(totalSpent),bg:"#7d6608"},
          {label:"Remaining Balance",val:fmtKES(Math.max(0,totalAllocated-totalSpent)),bg:"#0e6655"},
          {label:"Utilization %",val:`${utilizationPct}%`,bg:"#6c3483"},
          {label:"Active Budgets",val:activeCount,bg:"#1a252f"},
        ].map(k=>(
          <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
          </div>
        ))}
      </div>
      {/* HEADER BAR */}
      <div style={{borderRadius:12,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#1e1b4b,#3730a3)"}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Budgets</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{rows.length} records - {exceededCount} exceeded</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#e2e8f0",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({budget_name:"",department_id:"",department_name:"",financial_year:"2025/26",allocated_amount:"",category:"",status:"active",notes:""});setShowNew(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#3730a3"}}><Plus style={{width:14,height:14}}/>New Budget</button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:384}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search budgets..." style={{width:"100%",paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#eef2ff"}}>
            {["Code","Budget Name","Department","FY","Allocated","Spent","Committed","% Used","Status","Actions"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10,textTransform:"uppercase"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={10} style={{padding:"32px 0",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={10} style={{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:12}}>No budgets yet. Create one to get started.</td></tr>:
            filtered.map((r,i)=>{
              const pct = r.allocated_amount>0?Math.round((r.spent_amount||0)/r.allocated_amount*100):0;
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"10px 16px",fontFamily:"monospace",fontSize:10,color:"#6b7280"}}>{r.budget_code}</td>
                  <td style={{padding:"10px 16px",fontWeight:600,color:"#1f2937"}}>{r.budget_name}</td>
                  <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.department_name||"-"}</td>
                  <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.financial_year}</td>
                  <td style={{padding:"10px 16px",fontWeight:700}}>{fmtKES(r.allocated_amount)}</td>
                  <td style={{padding:"10px 16px",color:pct>90?"#dc2626":pct>70?"#d97706":"#374151"}}>{fmtKES(r.spent_amount||0)}</td>
                  <td style={{padding:"10px 16px",color:"#6b7280"}}>{fmtKES(r.committed_amount||0)}</td>
                  <td style={{padding:"10px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:64,height:6,borderRadius:3,background:"#e5e7eb",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${Math.min(100,pct)}%`,background:pct>90?"#dc2626":pct>70?"#d97706":"#15803d"}}/></div>
                      <span style={{fontSize:10,color:pct>90?"#dc2626":pct>70?"#d97706":"#374151",fontWeight:700}}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                  <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:4}}>
                    {canManage&&<button onClick={()=>openEdit(r)} style={{padding:5,borderRadius:6,background:"#dbeafe",border:"none",cursor:"pointer"}}><Edit style={{width:12,height:12,color:"#2563eb"}}/></button>}
                    {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:5,borderRadius:6,background:"#fee2e2",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12,color:"#ef4444"}}/></button>}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
              <h3 style={{fontWeight:900,color:"#1f2937",margin:0}}>{editing?"Edit Budget":"New Budget"}</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Budget Name *","budget_name","",2],["Financial Year","financial_year","",1],["Allocated Amount (KES) *","allocated_amount","number",1]].map(([l,k,t,span])=>(
                <div key={k} style={{gridColumn:`span ${span}`}}>
                  <label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>{l}</label>
                  <input type={String(t)||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              ))}
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Department</label>
                <select value={form.department_name||form.department_id||""} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">- Select -</option>
                  {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">- Select -</option>
                  {["Pharmaceuticals","Medical Supplies","Equipment","Laboratory","Construction","ICT","Staff Training","Utilities","Maintenance","Other"].map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {["active","draft","closed"].map(s=><option key={s} value={s} style={{textTransform:"capitalize"}}>{s}</option>)}
                </select></div>
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            </div></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#3730a3"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":editing?"Update Budget":"Create Budget"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

