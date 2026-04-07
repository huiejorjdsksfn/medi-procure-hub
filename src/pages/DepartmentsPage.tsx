
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTableRealtime } from "@/hooks/useRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, X, Save, Trash2, Edit, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function DepartmentsPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin");
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({name:"",code:"",description:"",head_of_department:"",phone:"",email:"",budget_center:""});

  const load = async()=>{
    setLoading(true);
    const{data}=await(supabase as any).from("departments").select("*").order("name");
    setRows(data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const save = async()=>{
    if(!form.name){toast({title:"Department name required",variant:"destructive"});return;}
    setSaving(true);
    if(editing){ await(supabase as any).from("departments").update(form).eq("id",editing.id); toast({title:"Updated ✓"}); }
    else{ await(supabase as any).from("departments").insert({...form,created_by:user?.id}); toast({title:"Created ✓"}); }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const del = async(id:string)=>{
    if(!confirm("Delete this department?")) return;
    await(supabase as any).from("departments").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Departments");
    XLSX.writeFile(wb,`departments_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = search ? rows.filter(r=>(r.name||"").toLowerCase().includes(search.toLowerCase())||(r.code||"").toLowerCase().includes(search.toLowerCase())) : rows;
  const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};

  const FIELDS: [string,string,number][] = [
    ["Department Name *","name",2],["Code","code",1],["Budget Center","budget_center",1],
    ["Head of Department","head_of_department",2],["Phone","phone",1],["Email","email",1],["Description","description",2],
  ];

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"100%"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{background:"linear-gradient(90deg,#4338ca,#6366f1)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Departments</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{rows.length} departments</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#e2e8f0",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>
            <Download style={{width:13,height:13}}/>Export
          </button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({name:"",code:"",description:"",head_of_department:"",phone:"",email:"",budget_center:""});setShowNew(true);}}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#4338ca",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            <Plus style={{width:13,height:13}}/>New Dept.
          </button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:320,marginBottom:14}}>
        <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search departments..."
          style={{width:"100%",padding:"8px 12px 8px 30px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#4338ca"}}>
              {["Code","Department Name","Head of Dept.","Phone","Email","Budget Center","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?(<tr><td colSpan={7} style={{padding:24,textAlign:"center"}}>
              <RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/>
            </td></tr>):filtered.length===0?(<tr><td colSpan={7} style={{padding:32,textAlign:"center",color:"#9ca3af"}}>No departments found</td></tr>):
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f5f3ff"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#eef2ff"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#f5f3ff"}>
                <td style={{padding:"9px 14px",fontFamily:"monospace",fontSize:10,color:"#6b7280"}}>{r.code||"—"}</td>
                <td style={{padding:"9px 14px",fontWeight:700,color:"#1f2937"}}>{r.name}</td>
                <td style={{padding:"9px 14px",color:"#374151"}}>{r.head_of_department||"—"}</td>
                <td style={{padding:"9px 14px",color:"#6b7280"}}>{r.phone||"—"}</td>
                <td style={{padding:"9px 14px",color:"#6b7280"}}>{r.email||"—"}</td>
                <td style={{padding:"9px 14px",color:"#6b7280"}}>{r.budget_center||"—"}</td>
                <td style={{padding:"9px 14px"}}>
                  <div style={{display:"flex",gap:6}}>
                    {canManage&&<button onClick={()=>{setEditing(r);setForm({name:r.name,code:r.code||"",description:r.description||"",head_of_department:r.head_of_department||"",phone:r.phone||"",email:r.email||"",budget_center:r.budget_center||""});setShowNew(true);}}
                      style={{padding:"4px 8px",background:"#eef2ff",border:"1px solid #c7d2fe",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Edit style={{width:12,height:12,color:"#4338ca"}}/>
                    </button>}
                    {hasRole("admin")&&<button onClick={()=>del(r.id)}
                      style={{padding:"4px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Trash2 style={{width:12,height:12,color:"#dc2626"}}/>
                    </button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(520px,94vw)",padding:20,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:900,color:"#1f2937",margin:0}}>{editing?"Edit":"New"} Department</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:18,height:18,color:"#9ca3af"}}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {FIELDS.map(([l,k,span])=>(
                <div key={k} style={{gridColumn:`span ${span}`}}>
                  <label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label>
                  <input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#4338ca",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}
                {saving?"Saving...":editing?"Update":"Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
