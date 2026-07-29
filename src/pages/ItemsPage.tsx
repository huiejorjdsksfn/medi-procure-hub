/**
 * ProcurBosse - Items & Inventory v2.0 (2026 ERP redesign)
 * Same CRUD / validation / export / low-stock logic — visual layer via
 * shared erpKit on the central T theme.
 */
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PrintEngine } from "@/engines/print/PrintEngine";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye, Plus, Edit, AlertTriangle, Trash2, CheckSquare, Square } from "lucide-react";
import { callBulkOps } from "@/lib/bulkOps";
import * as XLSX from "@e965/xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { TablePager, ColSearchRow } from "@/components/TablePager";
import DocumentAnalyzerButton from "@/components/DocumentAnalyzerButton";
import { T } from "@/lib/theme";
import { PageHeader, SearchBox, BtnPrimary, BtnGhost, KpiBand, Card, font, spinKeyframes } from "@/lib/erpKit";

const TYPES = ["pharmaceutical","medical_equipment","consumable","reagent","laboratory","surgical","general","other"];

const SC: Record<string,{bg:string;color:string}> = {
  active:      {bg:T.successBg,color:T.success},
  inactive:    {bg:T.errorBg,  color:T.error},
  discontinued:{bg:T.bg2,      color:T.fgMuted},
};

const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:`1.5px solid ${T.border}`,borderRadius:T.rMd,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:font,background:T.bg,color:T.fg};
const sel: React.CSSProperties = {...inp};
const lbl: React.CSSProperties = {fontSize:11,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,display:"block"};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving,      setSaving]      = useState(false);
  const [colSearch,   setColSearch]   = useState<Record<string,string>>({});
  const [page,        setPage]        = useState(1);
  const [perPage,     setPerPage]     = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy,    setBulkBusy]    = useState(false);

  const [form, setForm] = useState({
    name:"", sku:"", item_type:"pharmaceutical", category_id:"",
    unit_price:"", quantity_in_stock:"", reorder_level:"10",
    unit_of_measure:"pcs", description:"", status:"active",
    brand:"", manufacturer:"", country_of_origin:"",
    storage_conditions:"", shelf_life_days:"", batch_number:"",
    expiry_date:"", supplier_id:"", cost_price:"",
    location_in_store:"", is_controlled:false, is_consumable:true,
    notes:"",
  });

  useEffect(()=>{
    supabase.from("item_categories").select("*").then(({data})=>setCats(data||[]));
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data}=await supabase.from("items").select("*,item_categories(name)").order("name");
    const rows=data||[]; setItems(rows); pageCache.set("items",rows);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  // Deep-link: auto-open record from GlobalSearchBar (?focus=<id>)
  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId && items.length > 0) {
      const match = items.find(it => it.id === focusId);
      if (match) {
        setViewItem(match);
        searchParams.delete("focus");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [items, searchParams, setSearchParams]);
  useEffect(()=>{
    const ch=supabase.channel("items-rt").on("postgres_changes",{event:"*",schema:"public",table:"items"},()=>load()).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const openEdit=(it:any)=>{
    setEditing(it);
    setForm({...form, name:it.name||"",sku:it.sku||"",item_type:it.item_type||"pharmaceutical",category_id:it.category_id||"",unit_price:String(it.unit_price||""),quantity_in_stock:String(it.quantity_in_stock||""),reorder_level:String(it.reorder_level||10),unit_of_measure:it.unit_of_measure||"",description:it.description||"",status:it.status||"active",brand:it.brand||"",manufacturer:it.manufacturer||"",country_of_origin:it.country_of_origin||"",storage_conditions:it.storage_conditions||"",shelf_life_days:String(it.shelf_life_days||""),batch_number:it.batch_number||"",expiry_date:it.expiry_date||"",supplier_id:it.supplier_id||"",cost_price:String(it.cost_price||""),location_in_store:it.location_in_store||"",is_controlled:it.is_controlled||false,is_consumable:it.is_consumable!==false,notes:it.notes||""});
    setShowForm(true);
  };
  const openCreate=()=>{ setEditing(null); setForm({name:"",sku:"",item_type:"pharmaceutical",category_id:"",unit_price:"",quantity_in_stock:"",reorder_level:"10",unit_of_measure:"",description:"",status:"active",brand:"",manufacturer:"",country_of_origin:"",storage_conditions:"",shelf_life_days:"",batch_number:"",expiry_date:"",supplier_id:"",cost_price:"",location_in_store:"",is_controlled:false,is_consumable:true,notes:""}); setShowForm(true); };

  const save=async()=>{
    if(!form.name.trim()){toast({title:"Item name is required",variant:"destructive"});return;}
    if(form.unit_price!==undefined&&Number(form.unit_price)<0){toast({title:"Unit price cannot be negative",variant:"destructive"});return;}
    if(form.quantity_in_stock!==undefined&&Number(form.quantity_in_stock)<0){toast({title:"Stock quantity cannot be negative",variant:"destructive"});return;}
    if(form.reorder_level!==undefined&&Number(form.reorder_level)<0){toast({title:"Reorder level cannot be negative",variant:"destructive"});return;}
    setSaving(true);
    const payload:any={...form,unit_price:Number(form.unit_price)||0,quantity_in_stock:Number(form.quantity_in_stock)||0,reorder_level:Number(form.reorder_level)||10,cost_price:Number(form.cost_price)||0,shelf_life_days:form.shelf_life_days?Number(form.shelf_life_days):null,expiry_date:form.expiry_date||null,category_id:form.category_id||null,supplier_id:form.supplier_id||null};
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
    if(error){toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});return;}
    logAudit(user?.id,profile?.full_name,"delete","items",it.id,{name:it.name});
    toast({title:"Item deleted"});
    load();
  };

  // Bulk status update — routed through the bulk-ops edge function
  // (transaction-safe batching + automatic admin_activity_log entry,
  // server-side) rather than looping individual .update() calls.
  const bulkSetStatus = async (status: "active"|"inactive") => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const updates = Array.from(selectedIds).map(id => ({ id, data: { status } }));
      const result = await callBulkOps("update", "items", { updates });
      toast({
        title: `Bulk update complete`,
        description: `${result.success} item(s) marked ${status}${result.failed ? `, ${result.failed} failed` : ""}`,
        variant: result.failed ? "destructive" : undefined,
      });
      setSelectedIds(new Set());
      load();
    } catch (e: any) {
      toast({ title: "Bulk update failed", description: e.message, variant: "destructive" });
    }
    setBulkBusy(false);
  };

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    const header=[[hospitalName],[sysName+" - Items Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
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
    </head><body><h2>${hospitalName} - Items Register</h2><p style="font-size:10px;color:#888">Generated: ${new Date().toLocaleString("en-KE")} - ${filtered.length} items - Total Value: KES ${totalValue.toLocaleString()}</p>
    <table><thead><tr><th>#</th><th>Name</th><th>SKU</th><th>Type</th><th>Category</th><th>UoM</th><th>Unit Price</th><th>Qty</th><th>Reorder</th><th>Status</th><th>Stock Value</th></tr></thead>
    <tbody>${filtered.map((it,i)=>`<tr><td>${i+1}</td><td>${it.name}</td><td>${it.sku||"-"}</td><td>${it.item_type||"-"}</td><td>${it.item_categories?.name||"-"}</td><td>${it.unit_of_measure||"-"}</td><td>KES ${Number(it.unit_price||0).toLocaleString()}</td><td>${it.quantity_in_stock||0}</td><td>${it.reorder_level||10}</td><td>${it.status||"active"}</td><td>KES ${(Number(it.unit_price||0)*Number(it.quantity_in_stock||0)).toLocaleString()}</td></tr>`).join("")}
    </tbody></table></body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  const filtered=items.filter(it=>{
    if(typeFilter!=="all"&&it.item_type!==typeFilter) return false;
    if(statusFilter!=="all"&&it.status!==statusFilter) return false;
    if(lowOnly&&Number(it.quantity_in_stock)>Number(it.reorder_level||10)) return false;
    if(search){const q=search.toLowerCase();return (it.name||"").toLowerCase().includes(q)||(it.sku||"").toLowerCase().includes(q);}
    return true;
  }).filter(it=>{
    const f = (k:string, val:any) => {
      const q = (colSearch[k] || "").toLowerCase().trim();
      if (!q) return true;
      return String(val ?? "").toLowerCase().includes(q);
    };
    return f("name", it.name) && f("sku", it.sku) && f("type", it.item_type)
      && f("category", it.item_categories?.name) && f("uom", it.unit_of_measure)
      && f("status", it.status);
  });

  const pageStart = (page - 1) * perPage;
  const pageRows  = filtered.slice(pageStart, pageStart + perPage);
  useEffect(()=>{ setPage(1); },[search, typeFilter, statusFilter, lowOnly, colSearch]);

  const totalValue=filtered.reduce((s,it)=>s+Number(it.unit_price||0)*Number(it.quantity_in_stock||0),0);
  const lowStockCount=items.filter(it=>Number(it.quantity_in_stock)<=Number(it.reorder_level||10)).length;
  const activeItems=items.filter(it=>it.status==="active").length;
  const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:font}}>
      <PageHeader icon={Package} title="Items & Inventory" subtitle={`${filtered.length} items · Value: KES ${totalValue.toLocaleString()} · ${lowStockCount} low stock`}>
        <BtnGhost onClick={load} icon={RefreshCw} loading={loading}>Refresh</BtnGhost>
        <BtnGhost onClick={printAll} icon={Printer}>Print</BtnGhost>
        <BtnGhost onClick={exportExcel} icon={FileSpreadsheet}>Export</BtnGhost>
        {canEdit&&<BtnPrimary onClick={openCreate} icon={Plus}>Add Item</BtnPrimary>}
      </PageHeader>

      <div style={{padding:"20px 20px 32px"}}>
        <KpiBand loading={loading} items={[
          {label:"Total Stock Value",val:fmtK(totalValue), color:"#a4262c",icon:Package},
          {label:"Total Items",      val:items.length,     color:T.warning,icon:Package},
          {label:"Active Items",     val:activeItems,      color:T.success,icon:Eye},
          {label:"Low Stock",        val:lowStockCount,    color:"#6c3483",icon:AlertTriangle, hot:lowStockCount>0},
          {label:"Categories",       val:cats.length,      color:T.primary,icon:Package},
        ]}/>

        {/* Filters */}
        <Card style={{padding:"10px 14px",display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap" as const}}>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...sel,width:"auto",padding:"5px 10px",fontSize:12}}>
            <option value="all">All Types</option>
            {TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
          </select>
          <div style={{display:"flex",gap:4}}>
            {["all","active","inactive","discontinued"].map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",textTransform:"capitalize",background:statusFilter===s?T.primary:T.bg2,color:statusFilter===s?"#fff":T.fgMuted,fontFamily:font}}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={()=>setLowOnly(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,background:lowOnly?T.error:T.bg2,color:lowOnly?"#fff":T.fgMuted,fontSize:11,padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontFamily:font}}>
            <AlertTriangle style={{width:12,height:12}}/> Low Stock {lowStockCount>0&&`(${lowStockCount})`}
          </button>
          <div style={{marginLeft:"auto"}}>
            <SearchBox value={search} onChange={setSearch} placeholder="Search items…" width={200}/>
          </div>
        </Card>

        {/* Table */}
        <Card style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
            <table data-mobile-card="true" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                  <th style={{padding:"9px 12px",width:32}}>
                    {canEdit&&(
                      <button onClick={()=>setSelectedIds(s=>s.size===pageRows.length&&pageRows.length>0?new Set():new Set(pageRows.map(r=>r.id)))}
                        style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}>
                        {selectedIds.size>0&&selectedIds.size===pageRows.length
                          ?<CheckSquare style={{width:15,height:15,color:T.primary}}/>
                          :<Square style={{width:15,height:15,color:T.fgDim}}/>}
                      </button>
                    )}
                  </th>
                  {["#","Name","SKU","Type","Category","UoM","Unit Price","Qty","Reorder","Status","Stock Value","Actions"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",color:T.fgDim,fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
                <ColSearchRow
                  headerBg={T.bg2}
                  values={colSearch}
                  onChange={(k,v)=>setColSearch(p=>({...p,[k]:v}))}
                  cols={[
                    {key:"_sel",type:"none"},
                    {key:"_n",type:"none"},
                    {key:"name",placeholder:"name"},
                    {key:"sku",placeholder:"sku"},
                    {key:"type",placeholder:"type"},
                    {key:"category",placeholder:"category"},
                    {key:"uom",placeholder:"uom"},
                    {key:"_p",type:"none"},
                    {key:"_q",type:"none"},
                    {key:"_r",type:"none"},
                    {key:"status",placeholder:"status"},
                    {key:"_v",type:"none"},
                    {key:"_a",type:"none"},
                  ]}
                />
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} style={{padding:"40px",textAlign:"center"}}>
                    <RefreshCw style={{width:18,height:18,color:T.fgDim,animation:"spin 1s linear infinite",display:"block",margin:"0 auto 8px"}}/>
                    <span style={{fontSize:12,color:T.fgDim}}>Loading items…</span>
                  </td></tr>
                ) : filtered.length===0 ? (
                  <tr><td colSpan={13} style={{padding:"50px",textAlign:"center",color:T.fgDim,fontSize:13}}>No items found</td></tr>
                ) : pageRows.map((it,idx)=>{
                  const i = pageStart + idx;
                  const isLow=Number(it.quantity_in_stock)<=Number(it.reorder_level||10);
                  const s=SC[it.status]||{bg:T.bg2,color:T.fgMuted};
                  return (
                    <tr key={it.id} style={{background:selectedIds.has(it.id)?T.primaryBg:T.card,borderBottom:`1px solid ${T.border}`}}
                      onMouseEnter={e=>{ if(!selectedIds.has(it.id)) (e.currentTarget as HTMLElement).style.background=T.bg; }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=selectedIds.has(it.id)?T.primaryBg:T.card; }}>
                      <td style={{padding:"7px 12px"}}>
                        {canEdit&&(
                          <button onClick={()=>setSelectedIds(s=>{const n=new Set(s); n.has(it.id)?n.delete(it.id):n.add(it.id); return n;})}
                            style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}>
                            {selectedIds.has(it.id)
                              ?<CheckSquare style={{width:14,height:14,color:T.primary}}/>
                              :<Square style={{width:14,height:14,color:T.fgDim}}/>}
                          </button>
                        )}
                      </td>
                      <td style={{padding:"7px 12px",color:T.fgDim}}>{i+1}</td>
                      <td style={{padding:"7px 12px",fontWeight:600,color:T.fg,cursor:"pointer"}} onClick={()=>setViewItem(it)}>{it.name}</td>
                      <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:T.fgMuted}}>{it.sku||"-"}</td>
                      <td style={{padding:"7px 12px",color:T.fgMuted,textTransform:"capitalize"}}>{(it.item_type||"").replace(/_/g," ")}</td>
                      <td style={{padding:"7px 12px",color:T.fgMuted}}>{it.item_categories?.name||"-"}</td>
                      <td style={{padding:"7px 12px",color:T.fgMuted}}>{it.unit_of_measure||"-"}</td>
                      <td style={{padding:"7px 12px",fontWeight:600,color:T.fg}}>KES {Number(it.unit_price||0).toLocaleString()}</td>
                      <td style={{padding:"7px 12px"}}>
                        <span style={{fontWeight:700,color:isLow?T.error:T.success}}>{it.quantity_in_stock||0}</span>
                        {isLow&&<AlertTriangle style={{width:11,height:11,color:T.error,marginLeft:4,verticalAlign:"middle"}}/>}
                      </td>
                      <td style={{padding:"7px 12px",color:T.fgDim}}>{it.reorder_level||10}</td>
                      <td style={{padding:"7px 12px"}}>
                        <span className="status-chip" style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color,textTransform:"capitalize"}}>{it.status||"active"}</span>
                      </td>
                      <td style={{padding:"7px 12px",fontWeight:600,color:T.fgMuted}}>KES {(Number(it.unit_price||0)*Number(it.quantity_in_stock||0)).toLocaleString()}</td>
                      <td style={{padding:"7px 12px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>setViewItem(it)} title="View" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:T.primaryBg,color:T.primary}}>
                            <Eye style={{width:12,height:12}}/>
                          </button>
                          {canEdit&&<button onClick={()=>openEdit(it)} title="Edit" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:T.successBg,color:T.success}}>
                            <Edit style={{width:12,height:12}}/>
                          </button>}
                          {canEdit&&<button onClick={()=>deleteItem(it)} title="Delete" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:T.errorBg,color:T.error}}>
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
          <TablePager total={filtered.length} page={page} perPage={perPage}
            onPage={setPage} onPerPage={setPerPage} color={T.primary}/>
          <div style={{padding:"6px 14px",background:T.bg,borderTop:`1px solid ${T.border}`,display:"flex",gap:20,fontSize:11,color:T.fgMuted,flexWrap:"wrap" as const}}>
            <span>Total Stock Value: KES {totalValue.toLocaleString()}</span>
            {lowStockCount>0&&<span style={{color:T.error,fontWeight:700}}>· {lowStockCount} low stock</span>}
          </div>
        </Card>

        {/* Bulk actions bar — appears once anything is selected */}
        {selectedIds.size>0 && canEdit && (
          <div style={{position:"sticky",bottom:16,marginTop:14,display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:T.fg,borderRadius:T.rLg,boxShadow:T.shadowLg,color:"#fff"}}>
            <span style={{fontSize:12.5,fontWeight:700}}>{selectedIds.size} selected</span>
            <div style={{flex:1}}/>
            <button onClick={()=>bulkSetStatus("active")} disabled={bulkBusy}
              style={{padding:"6px 14px",borderRadius:T.r,border:"none",background:T.success,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,opacity:bulkBusy?0.6:1}}>
              Mark Active
            </button>
            <button onClick={()=>bulkSetStatus("inactive")} disabled={bulkBusy}
              style={{padding:"6px 14px",borderRadius:T.r,border:"none",background:T.warning,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,opacity:bulkBusy?0.6:1}}>
              Mark Inactive
            </button>
            <button onClick={()=>setSelectedIds(new Set())}
              style={{padding:"6px 12px",borderRadius:T.r,border:"1px solid rgba(255,255,255,.3)",background:"transparent",color:"#fff",cursor:"pointer",fontSize:12}}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.card,borderRadius:T.rXl,width:"min(540px,100%)",maxHeight:"88vh",overflow:"auto",boxShadow:T.shadowLg}}>
            <div style={{padding:"14px 20px",background:T.primaryBg,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:15,fontWeight:800,color:T.fg}}>{viewItem.name}</div>
              <button onClick={()=>setViewItem(null)} style={{background:T.bg2,border:"none",borderRadius:T.r,padding:"4px 8px",cursor:"pointer",color:T.fgMuted}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[["SKU",viewItem.sku],["Type",(viewItem.item_type||"").replace(/_/g," ")],["Category",viewItem.item_categories?.name],["Unit of Measure",viewItem.unit_of_measure],["Unit Price",`KES ${Number(viewItem.unit_price||0).toLocaleString()}`],["Qty in Stock",viewItem.quantity_in_stock],["Reorder Level",viewItem.reorder_level],["Status",viewItem.status]].map(([k,v])=>(
                <div key={k as string}><div style={{fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{k}</div><div style={{fontSize:13,color:T.fg,fontWeight:600}}>{v||"-"}</div></div>
              ))}
              {viewItem.description&&<div style={{gridColumn:"1/-1"}}><div style={{fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>Description</div><div style={{fontSize:13,color:T.fgMuted}}>{viewItem.description}</div></div>}
            </div>
            <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
              {canEdit&&<button onClick={()=>{setViewItem(null);openEdit(viewItem);}} style={{padding:"7px 16px",background:T.primary,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontWeight:700,fontSize:13}}>Edit</button>}
              <button onClick={()=>setViewItem(null)} style={{padding:"7px 16px",border:`1px solid ${T.border}`,background:T.card,color:T.fgMuted,borderRadius:T.rMd,cursor:"pointer",fontSize:13}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(15,23,42,0.55)"}}>
          <div style={{background:T.card,borderRadius:T.rXl,width:"min(600px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:T.shadowLg}}>
            <div style={{padding:"14px 20px",background:T.primaryBg,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:15,fontWeight:800,color:T.fg}}>{editing?"Edit Item":"New Item"}</div>
              <button onClick={()=>setShowForm(false)} style={{background:T.bg2,border:"none",borderRadius:T.r,padding:"4px 8px",cursor:"pointer",color:T.fgMuted}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{overflowY:"auto",padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {!editing && (
                <div style={{gridColumn:"1/-1",marginBottom:2,paddingBottom:12,borderBottom:`1px dashed ${T.border}`}}>
                  <DocumentAnalyzerButton target="item" onApply={(f)=>{
                    const matchedCat = f.category ? cats.find((c:any)=>c.name.toLowerCase().includes(String(f.category).toLowerCase()) || String(f.category).toLowerCase().includes(c.name.toLowerCase())) : null;
                    setForm(p=>({
                      ...p,
                      name: f.name ?? p.name,
                      sku: f.sku ?? p.sku,
                      unit_of_measure: f.unit ?? p.unit_of_measure,
                      unit_price: f.unit_price!=null ? String(f.unit_price) : p.unit_price,
                      description: f.description ?? p.description,
                      category_id: matchedCat ? matchedCat.id : p.category_id,
                      notes: (!matchedCat && f.category) ? [p.notes, `AI-detected category: ${f.category}`].filter(Boolean).join(" · ") : p.notes,
                    }));
                  }} />
                </div>
              )}
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Item Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="e.g. Amoxicillin 500mg"/></div>
              <div><label style={lbl}>SKU / Code</label><input value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value}))} style={inp} placeholder="ITEM-001"/></div>
              <div><label style={lbl}>Item Type</label><select value={form.item_type} onChange={e=>setForm(p=>({...p,item_type:e.target.value}))} style={sel}>{TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div>
              <div><label style={lbl}>Category</label><select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))} style={sel}><option value="">- None -</option>{cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={lbl}>Unit of Measure</label><input value={form.unit_of_measure} onChange={e=>setForm(p=>({...p,unit_of_measure:e.target.value}))} style={inp} placeholder="Tablets, Vials, Pcs..."/></div>
              <div><label style={lbl}>Unit Price (KES)</label><input type="number" value={form.unit_price} onChange={e=>setForm(p=>({...p,unit_price:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Quantity in Stock</label><input type="number" value={form.quantity_in_stock} onChange={e=>setForm(p=>({...p,quantity_in_stock:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Reorder Level</label><input type="number" value={form.reorder_level} onChange={e=>setForm(p=>({...p,reorder_level:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={sel}><option value="active">Active</option><option value="inactive">Inactive</option><option value="discontinued">Discontinued</option></select></div>
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{...inp,resize:"none"}}/></div>
            </div>
            <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 18px",border:`1px solid ${T.border}`,background:T.card,color:T.fgMuted,borderRadius:T.rMd,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:T.primary,color:"#fff",border:"none",borderRadius:T.rMd,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Package style={{width:13,height:13}}/>}
                {saving?"Saving...":"Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{spinKeyframes}</style>
    </div>
  );
}
