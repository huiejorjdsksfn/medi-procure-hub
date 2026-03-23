
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye, Plus, Edit, AlertTriangle, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const TYPES = ["pharmaceutical","medical_equipment","consumable","reagent","laboratory","surgical","general","other"];

const SC: Record<string,{bg:string;color:string}> = {
  active:      {bg:"#dcfce7",color:"#15803d"},
  inactive:    {bg:"#fee2e2",color:"#dc2626"},
  discontinued:{bg:"#f3f4f6",color:"#6b7280"},
};

const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};
const sel: React.CSSProperties = {...inp};
const lbl: React.CSSProperties = {fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,display:"block"};

export default function ItemsPage() {
  const { user, profile, roles } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const sysName = getSetting("system_name","EL5 MediProcure");
  const canEdit = roles.includes("admin")||roles.includes("inventory_manager")||roles.includes("procurement_manager");

  const [items,       setItems]       = useState<any[]>([]);
  const [cats,        setCats]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [lowOnly,     setLowOnly]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editing,     setEditing]     = useState<any>(null);
  const [viewItem,    setViewItem]    = useState<any>(null);
  const [saving,      setSaving]      = useState(false);
  // hospitalName now from useSystemSettings
  // sysName now from useSystemSettings

  const [form, setForm] = useState({
    name:"",sku:"",item_type:"pharmaceutical",category_id:"",
    unit_price:"",quantity_in_stock:"",reorder_level:"10",
    unit_of_measure:"",description:"",status:"active"
  });

  useEffect(()=>{
    /* settings via useSystemSettings hook */
    supabase.from("item_categories").select("*").then(({data})=>setCats(data||[]));
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data}=await supabase.from("items").select("*,item_categories(name)").order("name");
    setItems(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch=supabase.channel("items-rt").on("postgres_changes",{event:"*",schema:"public",table:"items"},()=>load()).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const openEdit=(it:any)=>{
    setEditing(it);
    setForm({name:it.name||"",sku:it.sku||"",item_type:it.item_type||"pharmaceutical",category_id:it.category_id||"",unit_price:String(it.unit_price||""),quantity_in_stock:String(it.quantity_in_stock||""),reorder_level:String(it.reorder_level||10),unit_of_measure:it.unit_of_measure||"",description:it.description||"",status:it.status||"active"});
    setShowForm(true);
  };
  const openCreate=()=>{ setEditing(null); setForm({name:"",sku:"",item_type:"pharmaceutical",category_id:"",unit_price:"",quantity_in_stock:"",reorder_level:"10",unit_of_measure:"",description:"",status:"active"}); setShowForm(true); };

  const save=async()=>{
    if(!form.name.trim()){toast({title:"Item name is required",variant:"destructive"});return;}
    if(form.unit_price!==undefined&&Number(form.unit_price)<0){toast({title:"Unit price cannot be negative",variant:"destructive"});return;}
    if(form.quantity_in_stock!==undefined&&Number(form.quantity_in_stock)<0){toast({title:"Stock quantity cannot be negative",variant:"destructive"});return;}
    if(form.reorder_level!==undefined&&Number(form.reorder_level)<0){toast({title:"Reorder level cannot be negative",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,unit_price:Number(form.unit_price)||0,quantity_in_stock:Number(form.quantity_in_stock)||0,reorder_level:Number(form.reorder_level)||10,category_id:form.category_id||null};
    try{
      if(editing){
        const{error}=await supabase.from("items").update(payload).eq("id",editing.id);
        if(error)throw error;
        logAudit(user?.id,profile?.full_name,"update","items",editing.id,{name:form.name});
        toast({title:"Item updated"});
      }else{
        const{data,error}=await supabase.from("items").insert(payload).select().single();
        if(error)throw error;
        logAudit(user?.id,profile?.full_name,"create","items",data?.id,{name:form.name});
        toast({title:"Item created",description:form.name});
      }
      setShowForm(false); load();
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    setSaving(false);
  };

  const deleteItem = async (it:any) => {
    if(!confirm(`Delete "${it.name}"?`)) return;
    const {error} = await supabase.from("items").delete().eq("id",it.id);
    if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});return;}
    logAudit(user?.id,profile?.full_name,"delete","items",it.id,{name:it.name});
    toast({title:"Item deleted"});
    load();
  };

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    const header=[[hospitalName],[sysName+" — Items Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows=filtered.map(it=>({Name:it.name,SKU:it.sku,Type:it.item_type,Category:it.item_categories?.name||"",UoM:it.unit_of_measure,"Unit Price":it.unit_price,"Qty in Stock":it.quantity_in_stock,"Reorder Level":it.reorder_level,Status:it.status,"Stock Value":Number(it.unit_price||0)*Number(it.quantity_in_stock||0)}));
    const ws=XLSX.utils.aoa_to_sheet([...header,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    ws["!cols"]=Object.keys(rows[0]||{}).map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb,ws,"Items");
    XLSX.writeFile(wb,`Items_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} items`});
  };

  const printAll = () => {
    const win = window.open("","_blank","width=1100,height=800");
    if(!win) return;
    win.document.write(`<html><head><title>Items Register</title>
    <style>body{font-family:'Segoe UI',Arial;font-size:11px;margin:20px}h2{color:#1a3d12}table{width:100%;border-collapse:collapse}th{background:#1a3d12;color:#fff;padding:6px 10px;text-align:left;font-size:10px}td{padding:5px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9fafb}@media print{@page{margin:1cm}}</style>
    </head><body><h2>${hospitalName} — Items Register</h2><p style="font-size:10px;color:#888">Generated: ${new Date().toLocaleString("en-KE")} · ${filtered.length} items · Total Value: KES ${totalValue.toLocaleString()}</p>
    <table><thead><tr><th>#</th><th>Name</th><th>SKU</th><th>Type</th><th>Category</th><th>UoM</th><th>Unit Price</th><th>Qty</th><th>Reorder</th><th>Status</th><th>Stock Value</th></tr></thead>
    <tbody>${filtered.map((it,i)=>`<tr><td>${i+1}</td><td>${it.name}</td><td>${it.sku||"—"}</td><td>${it.item_type||"—"}</td><td>${it.item_categories?.name||"—"}</td><td>${it.unit_of_measure||"—"}</td><td>KES ${Number(it.unit_price||0).toLocaleString()}</td><td>${it.quantity_in_stock||0}</td><td>${it.reorder_level||10}</td><td>${it.status||"active"}</td><td>KES ${(Number(it.unit_price||0)*Number(it.quantity_in_stock||0)).toLocaleString()}</td></tr>`).join("")}
    </tbody></table></body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  const filtered=items.filter(it=>{
    if(typeFilter!=="all"&&it.item_type!==typeFilter) return false;
    if(statusFilter!=="all"&&it.status!==statusFilter) return false;
    if(lowOnly&&Number(it.quantity_in_stock)>Number(it.reorder_level||10)) return false;
    if(search){const q=search.toLowerCase();return (it.name||"").toLowerCase().includes(q)||(it.sku||"").toLowerCase().includes(q);}
    return true;
  });

  const totalValue=filtered.reduce((s,it)=>s+Number(it.unit_price||0)*Number(it.quantity_in_stock||0),0);
  const lowStockCount=items.filter(it=>Number(it.quantity_in_stock)<=Number(it.reorder_level||10)).length;

  const btnSm: React.CSSProperties = {padding:"5px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5};

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"transparent",minHeight:"100%",padding:16}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .item-row:hover td{background:#f0fdf4!important}
        @media(max-width:768px){.items-header{flex-direction:column!important;align-items:flex-start!important}.items-filters{flex-wrap:wrap!important}.items-table{font-size:11px!important}.col-hide{display:none!important}}
        @media(max-width:480px){.items-header-btns{flex-wrap:wrap!important}}
      `}</style>
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const lowStock=items.filter(it=>Number(it.quantity_in_stock||0)<=Number(it.reorder_level||10)).length;
        const activeItems=items.filter(it=>it.status==="active").length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}}>
            {[
              {label:"Total Stock Value",val:fmtK(totalValue),bg:"#c0392b"},
              {label:"Total Items",val:items.length,bg:"#7d6608"},
              {label:"Active Items",val:activeItems,bg:"#0e6655"},
              {label:"Low Stock",val:lowStock,bg:"#6c3483"},
              {label:"Categories",val:cats.length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {/* Header */}
      <div  style={{background:"linear-gradient(90deg,#1a3d12,#375623,#4d7c30)",borderRadius:12,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12,boxShadow:"0 4px 16px rgba(55,86,35,0.35)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Package style={{width:22,height:22,color:"#fff"}}/>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>Items &amp; Inventory</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>
              {filtered.length} items · Value: KES {totalValue.toLocaleString()} · <span style={{color:lowStockCount>0?"#fca5a5":"rgba(255,255,255,0.5)"}}>{lowStockCount} low stock</span>
            </div>
          </div>
        </div>
        <div  style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={load} disabled={loading} style={{...btnSm,background:"rgba(255,255,255,0.18)",color:"#fff",minWidth:36,justifyContent:"center"}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={printAll} style={{...btnSm,background:"rgba(255,255,255,0.18)",color:"#fff"}}>
            <Printer style={{width:13,height:13}}/>Print
          </button>
          <button onClick={exportExcel} style={{...btnSm,background:"rgba(52,211,153,0.85)",color:"#fff"}}>
            <FileSpreadsheet style={{width:13,height:13}}/>Export
          </button>
          {canEdit&&(
            <button onClick={openCreate} style={{...btnSm,background:"#fff",color:"#1a3d12",fontWeight:800}}>
              <Plus style={{width:13,height:13}}/>Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div  style={{background:"#fff",borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"center",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",flexWrap:"wrap"}}>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...sel,width:"auto",padding:"5px 10px",fontSize:12}}>
          <option value="all">All Types</option>
          {TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
        </select>
        <div style={{display:"flex",gap:4}}>
          {["all","active","inactive","discontinued"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",textTransform:"capitalize",background:statusFilter===s?"#1a3d12":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={()=>setLowOnly(v=>!v)} style={{...btnSm,background:lowOnly?"#ef4444":"#f3f4f6",color:lowOnly?"#fff":"#6b7280",fontSize:11,padding:"4px 10px",borderRadius:20}}>
          <AlertTriangle style={{width:12,height:12}}/> Low Stock {lowStockCount>0&&`(${lowStockCount})`}
        </button>
        <div style={{flex:1,minWidth:180,position:"relative"}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items..."
            style={{...inp,paddingLeft:32,paddingRight:search?28:12,fontSize:12}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X style={{width:13,height:13,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* Table */}
      <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table  style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#1a3d12"}}>
                {["#","Name","SKU","Type","Category","UoM","Unit Price","Qty","Reorder","Status","Stock Value","Actions"].map(h=>(
                  <th key={h} style={{padding:"9px 12px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{padding:"40px",textAlign:"center"}}>
                  <RefreshCw style={{width:18,height:18,color:"#9ca3af",animation:"spin 1s linear infinite",display:"block",margin:"0 auto 8px"}}/>
                  <span style={{fontSize:12,color:"#9ca3af"}}>Loading items...</span>
                </td></tr>
              ) : filtered.length===0 ? (
                <tr><td colSpan={12} style={{padding:"50px",textAlign:"center",color:"#9ca3af",fontSize:13}}>No items found</td></tr>
              ) : filtered.map((it,i)=>{
                const isLow=Number(it.quantity_in_stock)<=Number(it.reorder_level||10);
                const s=SC[it.status]||{bg:"#f3f4f6",color:"#6b7280"};
                return (
                  <tr key={it.id} >
                    <td style={{padding:"7px 12px",color:"#9ca3af",background:i%2===0?"#fff":"#f9fafb"}}>{i+1}</td>
                    <td style={{padding:"7px 12px",fontWeight:600,color:"#111827",background:i%2===0?"#fff":"#f9fafb"}}>{it.name}</td>
                    <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:"#6b7280",background:i%2===0?"#fff":"#f9fafb"}}>{it.sku||"—"}</td>
                    <td style={{padding:"7px 12px",color:"#374151",textTransform:"capitalize",background:i%2===0?"#fff":"#f9fafb"}}>{(it.item_type||"").replace(/_/g," ")}</td>
                    <td style={{padding:"7px 12px",color:"#6b7280",background:i%2===0?"#fff":"#f9fafb"}}>{it.item_categories?.name||"—"}</td>
                    <td style={{padding:"7px 12px",color:"#6b7280",background:i%2===0?"#fff":"#f9fafb"}}>{it.unit_of_measure||"—"}</td>
                    <td style={{padding:"7px 12px",fontWeight:600,color:"#111827",background:i%2===0?"#fff":"#f9fafb"}}>KES {Number(it.unit_price||0).toLocaleString()}</td>
                    <td style={{padding:"7px 12px",background:i%2===0?"#fff":"#f9fafb"}}>
                      <span style={{fontWeight:700,color:isLow?"#dc2626":"#15803d"}}>{it.quantity_in_stock||0}</span>
                      {isLow&&<AlertTriangle style={{width:11,height:11,color:"#ef4444",marginLeft:4,verticalAlign:"middle"}}/>}
                    </td>
                    <td style={{padding:"7px 12px",color:"#9ca3af",background:i%2===0?"#fff":"#f9fafb"}}>{it.reorder_level||10}</td>
                    <td style={{padding:"7px 12px",background:i%2===0?"#fff":"#f9fafb"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color,textTransform:"capitalize"}}>{it.status||"active"}</span>
                    </td>
                    <td style={{padding:"7px 12px",fontWeight:600,color:"#374151",background:i%2===0?"#fff":"#f9fafb"}}>KES {(Number(it.unit_price||0)*Number(it.quantity_in_stock||0)).toLocaleString()}</td>
                    <td style={{padding:"7px 12px",background:i%2===0?"#fff":"#f9fafb"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setViewItem(it)} title="View" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#dbeafe",color:"#1d4ed8"}}>
                          <Eye style={{width:12,height:12}}/>
                        </button>
                        {canEdit&&<button onClick={()=>openEdit(it)} title="Edit" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#dcfce7",color:"#15803d"}}>
                          <Edit style={{width:12,height:12}}/>
                        </button>}
                        {canEdit&&<button onClick={()=>deleteItem(it)} title="Delete" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626"}}>
                          <Trash2 style={{width:12,height:12}}/>
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 14px",background:"#f9fafb",borderTop:"1px solid #e5e7eb",display:"flex",gap:20,fontSize:11,color:"#6b7280",flexWrap:"wrap"}}>
          <span>{filtered.length} items</span>
          <span>Total Stock Value: KES {totalValue.toLocaleString()}</span>
          {lowStockCount>0&&<span style={{color:"#ef4444",fontWeight:700}}>⚠ {lowStockCount} low stock</span>}
        </div>
      </div>

      {/* View Modal */}
      {viewItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(540px,100%)",maxHeight:"88vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#1a3d12,#375623)",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"14px 14px 0 0"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{viewItem.name}</div>
              <button onClick={()=>setViewItem(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#fff"}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[["SKU",viewItem.sku],["Type",(viewItem.item_type||"").replace(/_/g," ")],["Category",viewItem.item_categories?.name],["Unit of Measure",viewItem.unit_of_measure],["Unit Price",`KES ${Number(viewItem.unit_price||0).toLocaleString()}`],["Qty in Stock",viewItem.quantity_in_stock],["Reorder Level",viewItem.reorder_level],["Status",viewItem.status]].map(([k,v])=>(
                <div key={k as string}><div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{k}</div><div style={{fontSize:13,color:"#111827",fontWeight:600}}>{v||"—"}</div></div>
              ))}
              {viewItem.description&&<div style={{gridColumn:"1/-1"}}><div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>Description</div><div style={{fontSize:13,color:"#374151"}}>{viewItem.description}</div></div>}
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              {canEdit&&<button onClick={()=>{setViewItem(null);openEdit(viewItem);}} style={{padding:"7px 16px",background:"#1a3d12",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>Edit</button>}
              <button onClick={()=>setViewItem(null)} style={{padding:"7px 16px",border:"1px solid #e5e7eb",background:"#fff",borderRadius:8,cursor:"pointer",fontSize:13}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.55)"}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(600px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#1a3d12,#375623)",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"14px 14px 0 0"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{editing?"Edit Item":"New Item"}</div>
              <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#fff"}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{overflowY:"auto",padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Item Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="e.g. Amoxicillin 500mg"/></div>
              <div><label style={lbl}>SKU / Code</label><input value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value}))} style={inp} placeholder="ITEM-001"/></div>
              <div><label style={lbl}>Item Type</label><select value={form.item_type} onChange={e=>setForm(p=>({...p,item_type:e.target.value}))} style={sel}>{TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div>
              <div><label style={lbl}>Category</label><select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))} style={sel}><option value="">— None —</option>{cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={lbl}>Unit of Measure</label><input value={form.unit_of_measure} onChange={e=>setForm(p=>({...p,unit_of_measure:e.target.value}))} style={inp} placeholder="Tablets, Vials, Pcs..."/></div>
              <div><label style={lbl}>Unit Price (KES)</label><input type="number" value={form.unit_price} onChange={e=>setForm(p=>({...p,unit_price:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Quantity in Stock</label><input type="number" value={form.quantity_in_stock} onChange={e=>setForm(p=>({...p,quantity_in_stock:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Reorder Level</label><input type="number" value={form.reorder_level} onChange={e=>setForm(p=>({...p,reorder_level:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={sel}><option value="active">Active</option><option value="inactive">Inactive</option><option value="discontinued">Discontinued</option></select></div>
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{...inp,resize:"none"}}/></div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 18px",border:"1px solid #e5e7eb",background:"#fff",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#1a3d12",color:"#fff",border:"none",borderRadius:8,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Package style={{width:13,height:13}}/>}
                {saving?"Saving...":"Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
