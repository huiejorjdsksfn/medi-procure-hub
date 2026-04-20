/**
 * ProcurBosse v21.0 -- Items / Stock (Full CRUD)
 * Add, Edit, Delete, View, Stock adjust, Print, Export
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * BUILD-SAFE: zero non-ASCII chars
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Plus, Search, RefreshCw, Package, ChevronRight,
  AlertTriangle, X, Download, Edit3, Trash2,
  Printer, Save, Eye, ArrowUpDown, TrendingDown
} from "lucide-react";
import * as XLSX from "xlsx";

const db = supabase as any;
const INV = "#038387";

const S = {
  page: { background:T.bg, minHeight:"100%", fontFamily:"'Segoe UI','Inter',system-ui,sans-serif" } as React.CSSProperties,
  hdr:  { background:INV, padding:"0 24px", display:"flex", alignItems:"stretch", minHeight:44, boxShadow:"0 2px 6px rgba(0,80,80,.3)" } as React.CSSProperties,
  bc:   { background:"#fff", padding:"7px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.fgMuted } as React.CSSProperties,
  cmd:  { background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"6px 24px", display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" as const } as React.CSSProperties,
  body: { padding:"16px 24px" } as React.CSSProperties,
  card: { background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, boxShadow:"0 1px 4px rgba(0,0,0,.06)", overflow:"hidden" } as React.CSSProperties,
  th:   { padding:"8px 12px", textAlign:"left" as const, fontSize:10, fontWeight:700, color:T.fgDim, borderBottom:`1px solid ${T.border}`, background:T.bg, whiteSpace:"nowrap" as const },
  td:   { padding:"9px 12px", fontSize:12, color:T.fg, borderBottom:`1px solid ${T.border}18` },
  inp:  { border:`1px solid ${T.border}`, borderRadius:T.r, padding:"7px 11px", fontSize:13, outline:"none", background:"#fff", color:T.fg, fontFamily:"inherit", width:"100%", boxSizing:"border-box" as const } as React.CSSProperties,
};

function RBtn({icon:Icon,label,onClick,col=INV,disabled=false}:any) {
  return(
    <button onClick={onClick} disabled={disabled}
      style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:2,padding:"5px 10px",border:"none",background:"transparent",cursor:disabled?"not-allowed":"pointer",color:disabled?"#9aaab8":col,borderRadius:T.r,fontSize:10,fontWeight:600,opacity:disabled?.5:1,fontFamily:"inherit"}}
      onMouseEnter={e=>!disabled&&((e.currentTarget as any).style.background="#f0fafa")}
      onMouseLeave={e=>((e.currentTarget as any).style.background="transparent")}>
      <Icon size={18}/>{label}
    </button>
  );
}

function StockBadge({qty,min}:{qty:number;min:number}) {
  let col=T.success,bg=T.successBg,lbl="OK";
  if(qty<=0){col=T.error;bg=T.errorBg;lbl="OUT";}
  else if(qty<=min){col=T.warning;bg=T.warningBg;lbl="LOW";}
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,color:col,background:bg}}>{lbl}</span>;
}

interface Item {
  id:string; name:string; description?:string; sku?:string; category?:string;
  unit_of_measure?:string; current_quantity?:number; minimum_quantity?:number;
  unit_price?:number; location?:string; status?:string; created_at:string;
  reorder_point?:number; max_quantity?:number;
}

const BLANK:Partial<Item>={name:"",description:"",sku:"",category:"",unit_of_measure:"units",current_quantity:0,minimum_quantity:10,unit_price:0,location:"",status:"active",reorder_point:5,max_quantity:1000};

export default function ItemsPage() {
  const nav=useNavigate();
  const {profile}=useAuth();
  const canEdit=["admin","superadmin","webmaster","inventory_manager","procurement_manager"].includes(profile?.role||"");

  const [rows,setRows]           = useState<Item[]>([]);
  const [cats,setCats]           = useState<string[]>([]);
  const [loading,setLoading]     = useState(true);
  const [search,setSearch]       = useState("");
  const [catFilter,setCatFilter] = useState("all");
  const [stockFilter,setStockFilter]=useState("all");
  const [sortField,setSortField] = useState("name");
  const [sortDir,setSortDir]     = useState<"asc"|"desc">("asc");
  const [selected,setSelected]   = useState<Set<string>>(new Set());
  const [modal,setModal]         = useState<"add"|"edit"|"view"|null>(null);
  const [editRow,setEditRow]     = useState<Partial<Item>>(BLANK);
  const [saving,setSaving]       = useState(false);
  const [delId,setDelId]         = useState<string|null>(null);
  const [kpi,setKpi]             = useState({total:0,low:0,out:0,value:0});

  const load=useCallback(async()=>{
    try {

    setLoading(true);
    const {data}=await db.from("items").select("*").order("name");
    if(data){
      setRows(data);
      const allCats=[...new Set(data.map((r:Item)=>r.category).filter(Boolean))] as string[];
      setCats(allCats);
      const low=data.filter((r:Item)=>(r.current_quantity||0)>0&&(r.current_quantity||0)<=(r.minimum_quantity||0)).length;
      const out=data.filter((r:Item)=>(r.current_quantity||0)<=0).length;
      const val=data.reduce((s:number,r:Item)=>s+(r.current_quantity||0)*(r.unit_price||0),0);
      setKpi({total:data.length,low,out,value:val});
    }
    } catch(e: any) { console.warn("[Load]", e?.message); } finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    load();
    const ch=db.channel("items_rt").on("postgres_changes",{event:"*",schema:"public",table:"items"},load).subscribe();
    return()=>db.removeChannel(ch);
  },[load]);

  const filtered=rows.filter(r=>{
    const q=search.toLowerCase();
    if(q&&!r.name.toLowerCase().includes(q)&&!(r.sku||"").toLowerCase().includes(q)&&!(r.category||"").toLowerCase().includes(q))return false;
    if(catFilter!=="all"&&r.category!==catFilter)return false;
    if(stockFilter==="low"&&!((r.current_quantity||0)>0&&(r.current_quantity||0)<=(r.minimum_quantity||0)))return false;
    if(stockFilter==="out"&&(r.current_quantity||0)>0)return false;
    if(stockFilter==="ok"&&(r.current_quantity||0)<=(r.minimum_quantity||0))return false;
    return true;
  }).sort((a,b)=>{
    const va=(a as any)[sortField]??"";
    const vb=(b as any)[sortField]??"";
    const c=String(va).localeCompare(String(vb),undefined,{numeric:true});
    return sortDir==="asc"?c:-c;
  });

  const toggleSort=(f:string)=>{
    if(sortField===f)setSortDir(d=>d==="asc"?"desc":"asc");
    else{setSortField(f);setSortDir("asc");}
  };

  const save=async()=>{
    if(!editRow.name?.trim()){toast({title:"Name required",variant:"destructive"});return;}
    setSaving(true);
    try{
      if(modal==="add"){
        const{error}=await db.from("items").insert([{...editRow,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}]);
        if(error)throw error;
        toast({title:"Item added"});
      }else{
        const{id,created_at,...rest}=editRow as any;
        const{error}=await db.from("items").update({...rest,updated_at:new Date().toISOString()}).eq("id",id);
        if(error)throw error;
        toast({title:"Item updated"});
      }
      setModal(null);load();
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    finally{setSaving(false);}
  };

  const deleteItem=async(id:string)=>{
    await db.from("items").delete().eq("id",id);
    toast({title:"Item deleted"});setDelId(null);load();
  };

  const adjustStock=async(id:string,delta:number)=>{
    const item=rows.find(r=>r.id===id);
    if(!item)return;
    const newQty=Math.max(0,(item.current_quantity||0)+delta);
    await db.from("items").update({current_quantity:newQty,updated_at:new Date().toISOString()}).eq("id",id);
    toast({title:`Stock adjusted: ${delta>0?"+":""}${delta}`});load();
  };

  const exportExcel=()=>{
    const data=filtered.map(r=>({Name:r.name,SKU:r.sku||"",Category:r.category||"",UoM:r.unit_of_measure||"",Qty:r.current_quantity||0,MinQty:r.minimum_quantity||0,Price:r.unit_price||0,Value:((r.current_quantity||0)*(r.unit_price||0)).toFixed(2),Location:r.location||"",Status:r.status||""}));
    const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Inventory");
    XLSX.writeFile(wb,`inventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const printInv=()=>{
    const w=window.open("","_blank","width=1000,height=700");if(!w)return;
    const rows_html=filtered.map(r=>`<tr><td>${r.name}</td><td>${r.sku||"-"}</td><td>${r.category||"-"}</td><td style="text-align:center;font-weight:700;color:${(r.current_quantity||0)<=(r.minimum_quantity||0)?"#b91c1c":"#047857"}">${r.current_quantity||0}</td><td>${r.minimum_quantity||0}</td><td>KES ${(r.unit_price||0).toFixed(2)}</td><td>KES ${((r.current_quantity||0)*(r.unit_price||0)).toFixed(2)}</td><td>${r.location||"-"}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Inventory Report</title><style>body{font-family:Segoe UI,Arial;margin:30px;font-size:12px;}h2{color:${INV};}table{width:100%;border-collapse:collapse;margin-top:14px;}th{background:${INV};color:#fff;padding:8px 10px;text-align:left;font-size:11px;}td{padding:7px 10px;border-bottom:1px solid #eee;}.kpi{display:inline-block;padding:8px 14px;margin:4px;background:#f0fafa;border-left:3px solid ${INV};border-radius:4px;}@media print{button{display:none}}</style></head><body><h2>Inventory Report - Embu Level 5 Hospital</h2><div style="color:#666;font-size:11px;margin-bottom:10px">${new Date().toLocaleString("en-KE")} | ${filtered.length} items</div><div><div class="kpi"><b>Total Items</b><br/>${kpi.total}</div><div class="kpi"><b>Low Stock</b><br/><span style="color:#d97706">${kpi.low}</span></div><div class="kpi"><b>Out of Stock</b><br/><span style="color:#b91c1c">${kpi.out}</span></div><div class="kpi"><b>Total Value</b><br/>KES ${kpi.value.toLocaleString()}</div></div><table><thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Qty</th><th>Min Qty</th><th>Unit Price</th><th>Value</th><th>Location</th></tr></thead><tbody>${rows_html}</tbody></table><br/><button onclick="window.print()">Print</button></body></html>`);
    w.document.close();setTimeout(()=>w.print(),400);
  };

  const F=(label:string,key:keyof Item,type="text",opts?:string[])=>(
    <div style={{marginBottom:14}} key={key}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>{label}</label>
      {opts
        ?<select value={(editRow as any)[key]??""} disabled={modal==="view"} onChange={e=>setEditRow(p=>({...p,[key]:e.target.value}))} style={S.inp}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
        :<input type={type} value={(editRow as any)[key]??""} disabled={modal==="view"} onChange={e=>setEditRow(p=>({...p,[key]:type==="number"?Number(e.target.value):e.target.value}))} style={S.inp}/>
      }
    </div>
  );

  return(
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
      {/* Header */}
      <div style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <Package size={20} color="#fff"/>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Items & Stock Management</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.55)"}}>Inventory Control | EL5 MediProcure</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px"}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>{rows.length} items</span>
          <button onClick={()=>nav("/dashboard")} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Dashboard</button>
        </div>
      </div>
      {/* Breadcrumb */}
      <div style={S.bc}>
        <span style={{cursor:"pointer",color:T.primary}} onClick={()=>nav("/dashboard")}>Home</span>
        <ChevronRight size={12}/><span>Inventory</span><ChevronRight size={12}/><span style={{fontWeight:600}}>Items</span>
      </div>
      {/* KPI bar */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"8px 24px",display:"flex",gap:12,alignItems:"center"}}>
        {[{l:"Total Items",v:kpi.total,c:INV},{l:"Low Stock",v:kpi.low,c:T.warning},{l:"Out of Stock",v:kpi.out,c:T.error},{l:`Total Value: KES ${kpi.value.toLocaleString()}`,v:null,c:T.success}].map((k,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column"as const,gap:1,paddingRight:12,borderRight:`1px solid ${T.border}`}}>
            <span style={{fontSize:9,fontWeight:700,color:T.fgDim}}>{k.l}</span>
            {k.v!==null&&<span style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</span>}
          </div>
        ))}
        <button onClick={load} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
          <RefreshCw size={12}/>Refresh
        </button>
      </div>
      {/* Command bar */}
      <div style={S.cmd}>
        {canEdit&&<RBtn icon={Plus}    label="New Item"  onClick={()=>{setEditRow({...BLANK});setModal("add");}}  col={INV}/>}
        {canEdit&&<RBtn icon={Edit3}   label="Edit"      onClick={()=>{if(selected.size===1)setEditRow({...rows.find(r=>r.id===[...selected][0])!});setModal("edit");}} col={T.primary} disabled={selected.size!==1}/>}
        {canEdit&&<RBtn icon={Trash2}  label="Delete"    onClick={()=>{if(selected.size===1)setDelId([...selected][0]);}} col={T.error} disabled={selected.size!==1}/>}
        <div style={{width:1,height:30,background:T.border,margin:"0 4px"}}/>
        <RBtn icon={Eye}     label="View"    onClick={()=>{if(selected.size===1){setEditRow({...rows.find(r=>r.id===[...selected][0])!});setModal("view");}}} disabled={selected.size!==1}/>
        <RBtn icon={Printer} label="Print"   onClick={printInv}/>
        <RBtn icon={Download} label="Export" onClick={exportExcel}/>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{border:`1px solid ${T.border}`,borderRadius:T.r,padding:"5px 10px",fontSize:12,background:"#fff",color:T.fg,fontFamily:"inherit"}}>
            <option value="all">All Categories</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select value={stockFilter} onChange={e=>setStockFilter(e.target.value)} style={{border:`1px solid ${T.border}`,borderRadius:T.r,padding:"5px 10px",fontSize:12,background:"#fff",color:T.fg,fontFamily:"inherit"}}>
            <option value="all">All Stock</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <div style={{display:"flex",alignItems:"center",gap:6,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"5px 10px",background:"#fff"}}>
            <Search size={13} color={T.fgDim}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items..." style={{border:"none",outline:"none",fontSize:12,color:T.fg,fontFamily:"inherit",width:160}}/>
            {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"transparent",cursor:"pointer",padding:0,display:"flex"}}><X size={12}/></button>}
          </div>
        </div>
      </div>
      {/* Table */}
      <div style={S.body}>
        <div style={S.card}>
          {loading?(
            <div style={{padding:40,textAlign:"center"as const,color:T.fgDim}}>Loading inventory...</div>
          ):filtered.length===0?(
            <div style={{padding:40,textAlign:"center"as const,color:T.fgDim}}>
              <Package size={40} color={T.fgDim} style={{marginBottom:12,opacity:.4}}/>
              <div style={{fontSize:14,fontWeight:600}}>No items found</div>
              {canEdit&&<button onClick={()=>{setEditRow({...BLANK});setModal("add");}} style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",background:INV,color:"#fff",border:"none",borderRadius:T.r,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Plus size={14}/>Add First Item</button>}
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={S.th}><input type="checkbox" onChange={e=>{if(e.target.checked)setSelected(new Set(filtered.map(r=>r.id)));else setSelected(new Set());}}/></th>
                  {[["name","Name"],["sku","SKU"],["category","Category"],["unit_of_measure","UoM"],["current_quantity","Qty"],["minimum_quantity","Min Qty"],["unit_price","Price"],["location","Location"]].map(([f,l])=>(
                    <th key={f} style={{...S.th,cursor:"pointer"}} onClick={()=>toggleSort(f)}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>{l}<ArrowUpDown size={10} color={sortField===f?INV:T.fgDim}/></div>
                    </th>
                  ))}
                  <th style={S.th}>Status</th>
                  {canEdit&&<th style={S.th}>Actions</th>}
                </tr></thead>
                <tbody>
                  {filtered.map(r=>{
                    const isLow=(r.current_quantity||0)<=(r.minimum_quantity||0)&&(r.current_quantity||0)>0;
                    const isOut=(r.current_quantity||0)<=0;
                    return(
                      <tr key={r.id} style={{background:selected.has(r.id)?`${INV}11`:undefined}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=selected.has(r.id)?`${INV}22`:"#f8fbfb"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=selected.has(r.id)?`${INV}11`:""}>
                        <td style={S.td}><input type="checkbox" checked={selected.has(r.id)} onChange={e=>{const s=new Set(selected);if(e.target.checked)s.add(r.id);else s.delete(r.id);setSelected(s);}}/></td>
                        <td style={{...S.td,fontWeight:600,cursor:"pointer",color:INV}} onClick={()=>{setEditRow({...r});setModal("view");}}>
                          {isOut&&<AlertTriangle size={12} color={T.error} style={{marginRight:4,verticalAlign:"middle"}}/>}
                          {isLow&&!isOut&&<TrendingDown size={12} color={T.warning} style={{marginRight:4,verticalAlign:"middle"}}/>}
                          {r.name}
                        </td>
                        <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{r.sku||"-"}</td>
                        <td style={S.td}>{r.category||"-"}</td>
                        <td style={S.td}>{r.unit_of_measure||"-"}</td>
                        <td style={{...S.td,fontWeight:700,color:isOut?T.error:isLow?T.warning:T.success}}>{r.current_quantity||0}</td>
                        <td style={S.td}>{r.minimum_quantity||0}</td>
                        <td style={S.td}>KES {(r.unit_price||0).toFixed(2)}</td>
                        <td style={S.td}>{r.location||"-"}</td>
                        <td style={S.td}><StockBadge qty={r.current_quantity||0} min={r.minimum_quantity||0}/></td>
                        {canEdit&&(
                          <td style={S.td}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <button onClick={()=>{setEditRow({...r});setModal("edit");}} style={{padding:"4px 7px",background:T.primaryBg,border:`1px solid ${T.primary}33`,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",color:T.primary}}><Edit3 size={12}/></button>
                              <button onClick={()=>adjustStock(r.id,1)} style={{padding:"4px 7px",background:T.successBg,border:`1px solid ${T.success}33`,borderRadius:T.r,cursor:"pointer",fontSize:11,fontWeight:700,color:T.success,fontFamily:"inherit"}}>+1</button>
                              <button onClick={()=>adjustStock(r.id,-1)} style={{padding:"4px 7px",background:T.errorBg,border:`1px solid ${T.error}33`,borderRadius:T.r,cursor:"pointer",fontSize:11,fontWeight:700,color:T.error,fontFamily:"inherit"}}>-1</button>
                              <button onClick={()=>setDelId(r.id)} style={{padding:"4px 7px",background:T.errorBg,border:`1px solid ${T.error}33`,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",color:T.error}}><Trash2 size={12}/></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {filtered.length>0&&<div style={{padding:"8px 0",fontSize:11,color:T.fgDim}}>Showing {filtered.length} of {rows.length} items{selected.size>0&&<span style={{marginLeft:12,color:INV,fontWeight:700}}>{selected.size} selected</span>}</div>}
      </div>

      {/* ADD/EDIT/VIEW MODAL */}
      {modal&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>
          <div style={{background:"#fff",borderRadius:T.rLg,width:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)",animation:"fadeIn .18s"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,background:INV}}>
              <Package size={18} color="#fff"/>
              <div style={{flex:1,fontWeight:800,color:"#fff",fontSize:14}}>
                {modal==="add"?"Add New Item":modal==="edit"?`Edit: ${editRow.name}`:`View: ${editRow.name}`}
              </div>
              <button onClick={()=>setModal(null)} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:6,cursor:"pointer",padding:"4px 7px",display:"flex",color:"#fff"}}><X size={14}/></button>
            </div>
            <div style={{padding:"20px 24px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
                {F("Item Name *","name")}
                {F("SKU / Code","sku")}
                {F("Category","category")}
                {F("Unit of Measure","unit_of_measure")}
                {F("Current Quantity","current_quantity","number")}
                {F("Minimum Quantity","minimum_quantity","number")}
                {F("Reorder Point","reorder_point","number")}
                {F("Max Quantity","max_quantity","number")}
                {F("Unit Price (KES)","unit_price","number")}
                {F("Location / Bin","location")}
                {F("Status","status","text",["active","inactive"])}
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>Description</label>
                <textarea value={editRow.description||""} disabled={modal==="view"} onChange={e=>setEditRow(p=>({...p,description:e.target.value}))} rows={2} style={{...S.inp,resize:"vertical"as const}}/>
              </div>
              {modal!=="view"&&(
                <div style={{display:"flex",justifyContent:"flex-end",gap:10,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                  <button onClick={()=>setModal(null)} style={{padding:"8px 16px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.r,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                  <button onClick={save} disabled={saving} style={{padding:"8px 18px",background:saving?T.fgDim:INV,color:"#fff",border:"none",borderRadius:T.r,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit"}}>
                    {saving?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:<Save size={14}/>}
                    {saving?"Saving...":modal==="add"?"Add Item":"Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {delId&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:T.rLg,padding:24,width:380,boxShadow:"0 16px 48px rgba(0,0,0,.2)"}}>
            <div style={{fontSize:16,fontWeight:800,color:T.error,marginBottom:12}}>Delete Item?</div>
            <div style={{fontSize:13,color:T.fgMuted,marginBottom:20}}>This will permanently delete <b>{rows.find(r=>r.id===delId)?.name}</b>. This cannot be undone.</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setDelId(null)} style={{padding:"8px 16px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.r,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>deleteItem(delId)} style={{padding:"8px 16px",background:T.error,color:"#fff",border:"none",borderRadius:T.r,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
