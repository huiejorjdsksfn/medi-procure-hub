import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTableRealtime } from "@/hooks/useRealtime";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const TYPE_COLORS: Record<string,string> = {Asset:"#0369a1",Liability:"#dc2626",Equity:"#7c3aed",Revenue:"#15803d",Expense:"#d97706"};

export default function ChartOfAccountsPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({account_code:"",account_name:"",account_type:"Asset",category:"",parent_code:"",balance:"0",description:"",is_active:true});

  const load = useCallback(async () => {
    setLoading(true);
    const{data}=await(supabase as any).from("chart_of_accounts").select("*").order("account_code");
    setRows(data||[]); setLoading(false);
  },[]);
  useEffect(()=>{ load(); },[load]);
  useTableRealtime("chart_of_accounts", load);

  const openEdit = (r:any) => {
    setEditing(r);
    setForm({account_code:r.account_code,account_name:r.account_name,account_type:r.account_type,category:r.category||"",parent_code:r.parent_code||"",balance:String(r.balance||0),description:r.description||"",is_active:r.is_active!==false});
    setShowNew(true);
  };

  const save = async () => {
    if(!form.account_code||!form.account_name){toast({title:"Code and name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,balance:Number(form.balance)||0};
    if(editing){
      const{error}=await(supabase as any).from("chart_of_accounts").update(payload).eq("id",editing.id);
      if(error){toast({title:"Save failed",description:error.message||"Database error  -- please try again",variant:"destructive"});}
      else{toast({title:"Account updated "});}
    } else {
      const{error}=await(supabase as any).from("chart_of_accounts").insert(payload);
      if(error){toast({title:"Save failed",description:error.message||"Database error  -- please try again",variant:"destructive"});}
      else{toast({title:"Account created "});}
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this account?")) return;
    await(supabase as any).from("chart_of_accounts").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Chart of Accounts");
    XLSX.writeFile(wb,`coa_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = rows.filter(r=>{
    const ms = !search || r.account_code.includes(search)||r.account_name.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter==="all"||r.account_type===typeFilter;
    return ms&&mt;
  });

  const TYPES = ["all","Asset","Liability","Equity","Revenue","Expense"];
  const totalBalance = filtered.reduce((s,r)=>s+Number(r.balance||0),0);
  const totalAssets  = rows.filter(r=>r.account_type==="Asset").reduce((s,r)=>s+Number(r.balance||0),0);
  const totalRevenue = rows.filter(r=>r.account_type==="Revenue").reduce((s,r)=>s+Number(r.balance||0),0);
  const totalExpense = rows.filter(r=>r.account_type==="Expense").reduce((s,r)=>s+Number(r.balance||0),0);
  const activeAccounts = rows.filter(r=>r.is_active!==false).length;

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:12,fontFamily:"'Segoe UI',system-ui"}}>
      {/* KPI TILES */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
        {[
          {label:"Total Balance",val:fmtKES(totalBalance),bg:"#c0392b"},
          {label:"Total Assets",val:fmtKES(totalAssets),bg:"#0e6655"},
          {label:"Total Revenue",val:fmtKES(totalRevenue),bg:"#7d6608"},
          {label:"Total Expenses",val:fmtKES(totalExpense),bg:"#6c3483"},
          {label:"Active Accounts",val:activeAccounts,bg:"#1a252f"},
        ].map(k=>(
          <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:18,fontWeight:900,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
          </div>
        ))}
      </div>
      {/* HEADER BAR */}
      <div style={{borderRadius:12,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#0f172a,#1e3a5f)"}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Chart of Accounts</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{rows.length} accounts * {filtered.length} shown</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#e2e8f0",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({account_code:"",account_name:"",account_type:"Asset",category:"",parent_code:"",balance:"0",description:"",is_active:true});setShowNew(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#1e3a5f"}}><Plus style={{width:14,height:14}}/>New Account</button>}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" as const}}>
        <div style={{position:"relative"}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code or name..." style={{paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",width:208}}/></div>
        <div style={{display:"flex",gap:4}}>
          {TYPES.map(t=>(
            <button key={t} onClick={()=>setTypeFilter(t)}
              style={{padding:"6px 10px",borderRadius:10,fontSize:12,fontWeight:600,textTransform:"capitalize",border:"none",cursor:"pointer",background:typeFilter===t?(TYPE_COLORS[t]||"#1a3a6b"):"#f3f4f6",color:typeFilter===t?"#fff":"#6b7280"}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#ffffff"}}>
            {["Code","Account Name","Type","Category","Parent","Balance","Active","Actions"].map(h=>(
              <th key={h} style={{textAlign:"left",fontWeight:700,color:"rgba(255,255,255,0.8)",fontSize:10,textTransform:"uppercase",padding:"10px 12px"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={8} style={{padding:"32px 0",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={8} style={{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:12}}>No accounts found</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 16px",fontFamily:"monospace",fontWeight:700,color:"#1e3a5f"}}>{r.account_code}</td>
                <td style={{padding:"10px 16px",fontWeight:600,color:"#1f2937"}}>{r.account_name}</td>
                <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:`${TYPE_COLORS[r.account_type]||"#6b7280"}18`,color:TYPE_COLORS[r.account_type]||"#6b7280"}}>{r.account_type}</span></td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.category||" --"}</td>
                <td style={{padding:"10px 16px",color:"#9ca3af",fontFamily:"monospace",fontSize:10}}>{r.parent_code||" --"}</td>
                <td style={{padding:"10px 16px",fontWeight:700,color:Number(r.balance||0)<0?"#dc2626":"#15803d"}}>{fmtKES(r.balance||0)}</td>
                <td style={{padding:"10px 16px"}}><span style={{fontSize:10,fontWeight:700,color:r.is_active!==false?"#15803d":"#9ca3af"}}>{r.is_active!==false?"Active":"Inactive"}</span></td>
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
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
              <h3 style={{fontWeight:900,color:"#1f2937",margin:0}}>{editing?"Edit Account":"New Account"}</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Account Code *","account_code","",1],["Account Name *","account_name","",2],["Category","category","",1],["Parent Code","parent_code","",1],["Opening Balance","balance","number",1]].map(([l,k,t,span])=>(
                <div key={k} style={{gridColumn:`span ${span}`}}>
                  <label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>{l}</label>
                  <input type={String(t)||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              ))}
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Account Type</label>
                <select value={form.account_type} onChange={e=>setForm(p=>({...p,account_type:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {["Asset","Liability","Equity","Revenue","Expense"].map(t=><option key={t}>{t}</option>)}
                </select></div>
              <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:16}}>
                <input type="checkbox" id="isActive" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} style={{accentColor:"#0369a1",width:16,height:16}}/>
                <label htmlFor="isActive" style={{fontSize:14,fontWeight:600,color:"#374151",cursor:"pointer"}}>Active</label>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            </div></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#1e3a5f"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":editing?"Update":"Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
