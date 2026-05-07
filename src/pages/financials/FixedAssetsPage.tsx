import { useState, useEffect } from "react";
import { PrintEngine } from "@/engines/print/PrintEngine";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, Building2, Printer, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:0})}`;
const genNo = () => `AST/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*9900))}`;
const SC: Record<string,string> = {active:"#15803d",disposed:"#dc2626",under_maintenance:"#d97706",written_off:"#6b7280"};
const CATS = ["Medical Equipment","ICT Equipment","Furniture & Fittings","Motor Vehicles","Buildings","Land","Office Equipment","Laboratory Equipment","Theatre Equipment","Radiology Equipment"];

export default function FixedAssetsPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canManage = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({asset_number:"",asset_name:"",category:"",department_id:"",purchase_date:"",purchase_cost:"",useful_life:"",residual_value:"",depreciation_method:"Straight Line",location:"",serial_number:"",supplier_name:"",warranty_expiry:"",condition:"good",status:"active",description:""});

  const load = async () => {
    setLoading(true);
    try {
    const [{data:a},{data:d}] = await Promise.all([
      (supabase as any).from("fixed_assets").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    const rows=a||[]; setRows(rows); setDepts(d||[]);
      pageCache.set("fixed_assets",rows);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("fixed_assets"); if(cached) setRows(cached);
      console.error("[FixedAssets]",e);
    } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  /* - Real-time subscription - */
  useEffect(()=>{
    const ch=(supabase as any).channel("fa-rt").on("postgres_changes",{event:"*",schema:"public",table:"fixed_assets"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const openEdit = (a:any) => {
    setEditing(a);
    setForm({asset_number:a.asset_number,asset_name:a.asset_name,category:a.category||"",department_id:a.department_id||"",purchase_date:a.purchase_date||"",purchase_cost:String(a.purchase_cost||0),useful_life:String(a.useful_life||0),residual_value:String(a.residual_value||0),depreciation_method:a.depreciation_method||"Straight Line",location:a.location||"",serial_number:a.serial_number||"",supplier_name:a.supplier_name||"",warranty_expiry:a.warranty_expiry||"",condition:a.condition||"good",status:a.status||"active",description:a.description||""});
    setShowNew(true);
  };

  const calcDepreciation = () => {
    const cost = Number(form.purchase_cost||0);
    const residual = Number(form.residual_value||0);
    const life = Number(form.useful_life||1);
    const annual = (cost-residual)/Math.max(life,1);
    const yearsSince = form.purchase_date ? (new Date().getFullYear()-new Date(form.purchase_date).getFullYear()) : 0;
    const accumulated = Math.min(annual*yearsSince, cost-residual);
    return { annual, accumulated, nbv: cost-accumulated };
  };

  const save = async () => {
    if(!form.asset_name||!form.category){toast({title:"Asset name and category required",variant:"destructive"});return;}
    setSaving(true);
    const {annual,accumulated,nbv} = calcDepreciation();
    const dept = depts.find(d=>d.id===form.department_id);
    const payload={...form,asset_number:editing?editing.asset_number:genNo(),department_id:form.department_id||null,department_name:dept?.name||"",purchase_cost:Number(form.purchase_cost||0),useful_life:Number(form.useful_life||0),residual_value:Number(form.residual_value||0),annual_depreciation:annual,accumulated_depreciation:accumulated,net_book_value:nbv,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      const{error}=await(supabase as any).from("fixed_assets").update(payload).eq("id",editing.id);
      if(!error){logAudit(user?.id,profile?.full_name,"update","fixed_assets",editing.id,{name:form.asset_name});toast({title:"Asset updated -"});}
      else toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});
    } else {
      const{data,error}=await(supabase as any).from("fixed_assets").insert(payload).select().single();
      if(!error){logAudit(user?.id,profile?.full_name,"create","fixed_assets",data?.id,{name:form.asset_name});toast({title:"Asset registered -"});}
      else toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});
    }
    setSaving(false); setShowNew(false); setEditing(null); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this asset?")) return;
    await(supabase as any).from("fixed_assets").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Fixed Assets");
    XLSX.writeFile(wb,`fixed_assets_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const filtered = rows.filter(r=>{
    const ms = !search||(r.asset_name||"").toLowerCase().includes(search.toLowerCase())||(r.asset_number||"").includes(search);
    const mc = catFilter==="all"||(r.category||"")=== catFilter;
    return ms&&mc;
  });
  const totalCost = filtered.reduce((s,r)=>s+Number(r.purchase_cost||0),0);
  const totalNBV = filtered.reduce((s,r)=>s+Number(r.net_book_value||0),0);

  const F = ({label,k,type="text",span=1,req=false}:{label:string;k:string;type?:string;span?:number;req?:boolean}) => (
    <div style={{gridColumn:`span ${span}`}}>
      <label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>{label}{req&&" *"}</label>
      <input type={type} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
        style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
    </div>
  );

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:12,fontFamily:"'Segoe UI',system-ui"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {/* KPI TILES */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
        {[
          {label:"Total Asset Cost",val:fmtKES(totalCost),bg:"#c0392b"},
          {label:"Net Book Value",val:fmtKES(totalNBV),bg:"#0e6655"},
          {label:"Total Depreciation",val:fmtKES(totalCost-totalNBV),bg:"#7d6608"},
          {label:"Asset Count",val:rows.length,bg:"#6c3483"},
          {label:"Active Assets",val:rows.filter(r=>r.status==="active").length,bg:"#1a252f"},
        ].map(k=>(
          <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:18,fontWeight:900,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
          </div>
        ))}
      </div>
      {/* Header */}
      <div style={{borderRadius:12,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#1a3a6b,#0a2558)"}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Fixed Assets Register</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{rows.length} assets - Cost: {fmtKES(totalCost)} - NBV: {fmtKES(totalNBV)}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#e2e8f0",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({asset_number:"",asset_name:"",category:"",department_id:"",purchase_date:"",purchase_cost:"",useful_life:"",residual_value:"",depreciation_method:"Straight Line",location:"",serial_number:"",supplier_name:"",warranty_expiry:"",condition:"good",status:"active",description:""});setShowNew(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#1a3a6b"}}><Plus style={{width:14,height:14}}/>Register Asset</button>}
        </div>
      </div>
      {/* Filters */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
        <div style={{position:"relative"}}><Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assets..." style={{paddingLeft:30,paddingRight:12,paddingTop:7,paddingBottom:7,border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",width:220}}/></div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:"7px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",cursor:"pointer"}}>
          <option value="all">All Categories</option>{CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={load} style={{padding:"7px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,cursor:"pointer",background:"#f9fafb"}}><RefreshCw style={{width:12,height:12}}/></button>
      </div>
      {/* Table */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#1e3a6b"}}>
            {["Asset No.","Name","Category","Dept.","Purchase Cost","Net Book Value","Condition","Status","Actions"].map(h=>(
              <th key={h} style={{textAlign:"left",fontWeight:700,color:"rgba(255,255,255,0.8)",fontSize:10,textTransform:"uppercase",padding:"10px 12px",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{padding:40,textAlign:"center"}}><RefreshCw style={{width:18,height:18,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/></td></tr>
            :filtered.length===0?<tr><td colSpan={9} style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No assets found</td></tr>
            :filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#eff6ff"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#fafafa"}
                onClick={()=>setDetail(r)}>
                <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,fontWeight:700,color:"#1a3a6b"}}>{r.asset_number}</td>
                <td style={{padding:"9px 12px",fontWeight:700,color:"#1f2937",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.asset_name}</td>
                <td style={{padding:"9px 12px",color:"#6b7280"}}>{r.category||"-"}</td>
                <td style={{padding:"9px 12px",color:"#6b7280"}}>{r.department_name||"-"}</td>
                <td style={{padding:"9px 12px",fontWeight:600,color:"#374151"}}>{fmtKES(r.purchase_cost||0)}</td>
                <td style={{padding:"9px 12px",fontWeight:700,color:"#15803d"}}>{fmtKES(r.net_book_value||0)}</td>
                <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",background:"#f3f4f6",color:"#374151"}}>{r.condition||"-"}</span></td>
                <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",background:`${SC[r.status]||"#9ca3af"}18`,color:SC[r.status]||"#9ca3af"}}>{(r.status||"").replace(/_/g," ")}</span></td>
                <td style={{padding:"9px 12px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:4}}>
                    {canManage&&<button onClick={()=>openEdit(r)} style={{padding:"4px 8px",background:"#dbeafe",border:"none",borderRadius:6,cursor:"pointer",lineHeight:0}}><Edit style={{width:12,height:12,color:"#2563eb"}}/></button>}
                    {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:"4px 8px",background:"#fee2e2",border:"none",borderRadius:6,cursor:"pointer",lineHeight:0}}><Trash2 style={{width:12,height:12,color:"#dc2626"}}/></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New/Edit Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(640px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 20px",background:"linear-gradient(90deg,#1a3a6b,#0a2558)",borderRadius:"16px 16px 0 0",display:"flex",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>{editing?"Edit Asset":"Register Fixed Asset"}</span>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <F label="Asset Name *" k="asset_name" span={2} req/>
                <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Category *</label>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                    <option value="">- Select -</option>{CATS.map(c=><option key={c}>{c}</option>)}
                  </select></div>
                <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Department</label>
                  <select value={form.department_id||""} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                    <option value="">- Select -</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
                <F label="Purchase Date" k="purchase_date" type="date"/>
                <F label="Purchase Cost (KES)" k="purchase_cost" type="number"/>
                <F label="Useful Life (years)" k="useful_life" type="number"/>
                <F label="Residual Value (KES)" k="residual_value" type="number"/>
                <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Depreciation Method</label>
                  <select value={form.depreciation_method} onChange={e=>setForm(p=>({...p,depreciation_method:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                    {["Straight Line","Reducing Balance","Sum of Years"].map(m=><option key={m}>{m}</option>)}
                  </select></div>
                <F label="Location" k="location"/>
                <F label="Serial Number" k="serial_number"/>
                <F label="Supplier Name" k="supplier_name"/>
                <F label="Warranty Expiry" k="warranty_expiry" type="date"/>
                <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Condition</label>
                  <select value={form.condition} onChange={e=>setForm(p=>({...p,condition:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                    {["excellent","good","fair","poor"].map(c=><option key={c} style={{textTransform:"capitalize"}}>{c}</option>)}
                  </select></div>
                <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                    {["active","under_maintenance","disposed","written_off"].map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                  </select></div>
                {form.purchase_cost&&form.useful_life&&(
                  <div style={{gridColumn:"1/-1",padding:12,borderRadius:12,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
                    <p style={{fontSize:12,fontWeight:700,color:"#166534",marginBottom:4}}>Depreciation Preview</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,fontSize:12}}>
                      {[["Annual Dep.",fmtKES(calcDepreciation().annual)],["Accumulated",fmtKES(calcDepreciation().accumulated)],["Net Book Value",fmtKES(calcDepreciation().nbv)]].map(([l,v])=>(
                        <div key={l}><p style={{color:"#6b7280",margin:"0 0 2px"}}>{l}</p><p style={{fontWeight:700,color:"#1f2937",margin:0}}>{v}</p></div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Description</label>
                  <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/></div>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}
                {saving?"Saving...":editing?"Update Asset":"Register Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(540px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 20px",background:"linear-gradient(90deg,#1a3a6b,#0a2558)",borderRadius:"16px 16px 0 0",display:"flex",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>{detail.asset_name}</span>
              <button onClick={()=>setDetail(null)} style={{background:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:18}}>
              {[["Asset No.",detail.asset_number],["Category",detail.category],["Department",detail.department_name],["Location",detail.location],["Serial No.",detail.serial_number],["Purchase Cost",fmtKES(detail.purchase_cost||0)],["Net Book Value",fmtKES(detail.net_book_value||0)],["Annual Depreciation",fmtKES(detail.annual_depreciation||0)],["Useful Life",`${detail.useful_life||0} years`],["Residual Value",fmtKES(detail.residual_value||0)],["Supplier",detail.supplier_name],["Warranty Expires",detail.warranty_expiry],["Condition",detail.condition],["Status",(detail.status||"").replace(/_/g," ")],["Registered By",detail.created_by_name]].filter(([_l,v])=>v).map(([l,v])=>(
                <div key={l as string} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#9ca3af"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#1f2937",textAlign:"right",textTransform:"capitalize"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",gap:8}}>
              <button onClick={()=>setDetail(null)} style={{flex:1,padding:"8px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Close</button>
              {canManage&&<button onClick={()=>{setDetail(null);openEdit(detail);}} style={{flex:2,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}><Edit style={{width:13,height:13}}/>Edit Asset</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
