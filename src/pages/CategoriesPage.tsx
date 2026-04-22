
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTableRealtime } from "@/hooks/useRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, X, Save, Trash2, Edit } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function CategoriesPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin")||hasRole("procurement_manager")||hasRole("inventory_manager");
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({name:"",description:"",parent_category:""});

  const load = useCallback(async()=>{
    setLoading(true);
    const{data}=await(supabase as any).from("categories").select("*").order("name");
    setRows(data||[]); setLoading(false);
  },[]);
  useEffect(()=>{ load(); },[load]);
  useTableRealtime("categories", load);

  const save = async()=>{
    if(!form.name){toast({title:"Name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,created_by:user?.id};
    if(editing){ await(supabase as any).from("categories").update(payload).eq("id",editing.id); toast({title:"Category updated ✓"});}
    else{ await(supabase as any).from("categories").insert(payload); toast({title:"Category created ✓"});}
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const del = async(id:string)=>{
    if(!confirm("Delete this category?")) return;
    await(supabase as any).from("categories").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const filtered = search ? rows.filter(r=>(r.name||"").toLowerCase().includes(search.toLowerCase())) : rows;
  const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"100%"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#374151,#4b5563)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Item Categories</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{rows.length} categories</p>
        </div>
        {canManage&&<button onClick={()=>{setEditing(null);setForm({name:"",description:"",parent_category:""});setShowNew(true);}}
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#374151",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
          <Plus style={{width:13,height:13}}/>New Category
        </button>}
      </div>
      {/* Search */}
      <div style={{position:"relative",maxWidth:320,marginBottom:14}}>
        <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories..."
          style={{width:"100%",padding:"8px 12px 8px 30px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
      </div>
      {/* Table */}
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#374151"}}>
              {["Category Name","Description","Parent Category","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?(<tr><td colSpan={4} style={{padding:24,textAlign:"center"}}>
              <RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/>
            </td></tr>):filtered.length===0?(<tr><td colSpan={4} style={{padding:32,textAlign:"center",color:"#9ca3af"}}>No categories found</td></tr>):
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0f9ff"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#fafafa"}>
                <td style={{padding:"9px 14px",fontWeight:700,color:"#1f2937"}}>{r.name}</td>
                <td style={{padding:"9px 14px",color:"#6b7280"}}>{r.description||"—"}</td>
                <td style={{padding:"9px 14px",color:"#6b7280"}}>{r.parent_category||"—"}</td>
                <td style={{padding:"9px 14px"}}>
                  <div style={{display:"flex",gap:6}}>
                    {canManage&&<button onClick={()=>{setEditing(r);setForm({name:r.name,description:r.description||"",parent_category:r.parent_category||""});setShowNew(true);}}
                      style={{padding:"4px 8px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                      <Edit style={{width:12,height:12,color:"#2563eb"}}/>
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
      {/* Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(420px,94vw)",padding:20,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:900,color:"#1f2937",margin:0}}>{editing?"Edit":"New"} Category</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:18,height:18,color:"#9ca3af"}}/></button>
            </div>
            {[["Category Name *","name"],["Description","description"],["Parent Category","parent_category"]].map(([l,k])=>(
              <div key={k} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label>
                <input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/>
              </div>
            ))}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#374151",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
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
