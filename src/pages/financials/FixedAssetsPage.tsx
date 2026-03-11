import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Download, X, Save, Trash2, Edit, Building2, Printer, Eye } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:0})}`;
const genNo = () => `AST/EL5H/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*9900))}`;
const SC: Record<string,string> = {active:"#15803d",disposed:"#dc2626",under_maintenance:"#d97706",written_off:"#6b7280"};
const CATS = ["Medical Equipment","ICT Equipment","Furniture & Fittings","Motor Vehicles","Buildings","Land","Office Equipment","Laboratory Equipment","Theatre Equipment","Radiology Equipment"];

export default function FixedAssetsPage() {
  const { user, profile, hasRole } = useAuth();
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
    const [{data:a},{data:d}] = await Promise.all([
      (supabase as any).from("fixed_assets").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
    ]);
    setRows(a||[]); setDepts(d||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

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
      if(!error){logAudit(user?.id,profile?.full_name,"update","fixed_assets",editing.id,{name:form.asset_name});toast({title:"Asset updated ✓"});}
      else toast({title:"Error",description:error.message,variant:"destructive"});
    } else {
      const{data,error}=await(supabase as any).from("fixed_assets").insert(payload).select().single();
      if(!error){logAudit(user?.id,profile?.full_name,"create","fixed_assets",data?.id,{name:form.asset_name});toast({title:"Asset registered ✓"});}
      else toast({title:"Error",description:error.message,variant:"destructive"});
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
    <div
      style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}
    >
    <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:768px){.vpage-header{flex-direction:column!important;align-items:flex-start!important}.vpage-filters{flex-wrap:wrap!important}.vpage-table{font-size:11px!important}}
        @media(max-width:480px){.vpage-btns{flex-wrap:wrap!important;gap:6px!important}}
      `}</style>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:16,fontFamily:"'Segoe UI',system-ui"}}>
      {/* Header */}
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#1a3a6b,#0369a1)"}}>
        <div>
          <h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Fixed Assets Register</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{rows.length} assets · Cost: {fmtKES(totalCost)} · NBV: {fmtKES(totalNBV)}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canManage&&<button onClick={()=>{setEditing(null);setForm({asset_number:"",asset_name:"",category:"",department_id:"",purchase_date:"",purchase_cost:"",useful_life:"",residual_value:"",depreciation_method:"Straight Line",location:"",serial_number:"",supplier_name:"",warranty_expiry:"",condition:"good",status:"active",description:""});setShowNew(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#1a3a6b"}}><Plus style={{width:14,height:14}}/>Register Asset</button>}
        </div>
      </div>
      {/* Filters */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <div style={{position:"relative"}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assets…" style={{paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",width:208}}/></div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:"8px 12px",borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none"}}>
          <option value="all">All Categories</option>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {/* Table */}
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#1a3a6b"}}>
            {["Asset No.","Name","Category","Department","Purchase Cost","NBV","Status","Condition","Actions"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontWeight:700,color:"rgba(255,255,255,0.85)",fontSize:10,textTransform:"uppercase"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{padding:"32px 0",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={9} style={{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:12}}>No fixed assets registered yet</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f8faff"}}>
                <td style={{padding:"10px 16px",fontFamily:"monospace",fontSize:10,color:"#1a3a6b"}}>{r.asset_number}</td>
                <td style={{padding:"10px 16px",fontWeight:600,color:"#1f2937"}}>{r.asset_name}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.category}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.department_name||"—"}</td>
                <td style={{padding:"10px 16px",fontWeight:700,color:"#374151"}}>{fmtKES(r.purchase_cost||0)}</td>
                <td style={{padding:"10px 16px",fontWeight:700,color:Number(r.net_book_value||0)>0?"#15803d":"#9ca3af"}}>{fmtKES(r.net_book_value||0)}</td>
                <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status?.replace(/_/g," ")}</span></td>
                <td style={{padding:"10px 16px",textTransform:"capitalize",color:"#4b5563"}}>{r.condition||"—"}</td>
                <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setDetail(r)} style={{padding:5,borderRadius:6,background:"#dbeafe",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12,color:"#2563eb"}}/></button>
                  {canManage&&<button onClick={()=>openEdit(r)} style={{padding:5,borderRadius:6,background:"#fffbeb",border:"none",cursor:"pointer"}}><Edit style={{width:12,height:12,color:"#d97706"}}/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:5,borderRadius:6,background:"#fee2e2",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12,color:"#ef4444"}}/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* New/Edit Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>{setShowNew(false);setEditing(null);}}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(700px,100%)",maxHeight:"90vh",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h3 style={{fontWeight:900,color:"#1f2937"}}>{editing?"Edit Asset":"Register Fixed Asset"}</h3>
              <button onClick={()=>{setShowNew(false);setEditing(null);}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <F label="Asset Name *" k="asset_name" span={2} req/>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Category *</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">— Select —</option>{CATS.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">— Select —</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
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
                      <div key={l}><p style={{color:"#6b7280"}}>{l}</p><p style={{fontWeight:700,color:"#1f2937"}}>{v}</p></div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8}}>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#1a3a6b"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving…":editing?"Update Asset":"Register Asset"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail view */}
      {detail&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)"}} onClick={()=>setDetail(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h3 style={{fontWeight:900,color:"#1f2937"}}>{detail.asset_name}</h3>
              <div style={{display:"flex",gap:8}}><button onClick={()=>setDetail(null)}><X style={{width:20,height:20,color:"#9ca3af"}}/></button></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[["Asset No.",detail.asset_number],["Category",detail.category],["Department",detail.department_name],["Purchase Cost",fmtKES(detail.purchase_cost||0)],["Net Book Value",fmtKES(detail.net_book_value||0)],["Annual Depreciation",fmtKES(detail.annual_depreciation||0)],["Useful Life",`${detail.useful_life||0} years`],["Residual Value",fmtKES(detail.residual_value||0)],["Location",detail.location],["Serial No.",detail.serial_number],["Supplier",detail.supplier_name],["Warranty Expires",detail.warranty_expiry],["Condition",detail.condition],["Status",detail.status?.replace(/_/g," ")],["Registered By",detail.created_by_name]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#6b7280"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:500,color:"#1f2937",textAlign:"right"}}>{v}</span>
                </div>
              ))}
            </div>
            {canManage&&<button onClick={()=>{setDetail(null);openEdit(detail);}} style={{marginTop:16,width:"100%",padding:"8px 0",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,border:"none",cursor:"pointer",background:"#1a3a6b"}}><Edit style={{width:14,height:14}}/>Edit Asset</button>}
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
