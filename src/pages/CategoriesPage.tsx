/**
 * ProcurBosse v21.3 -- Categories (Full D365 Upgrade)
 * Full CRUD + item counts + print + export + realtime
 * BUILD-SAFE: zero non-ASCII chars
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { Plus, Search, RefreshCw, X, Save, Trash2, Edit3, ChevronRight, Package, Printer, Download, Layers } from "lucide-react";
import * as XLSX from "xlsx";

const db = supabase as any;
const CLR = "#047857";

const S = {
  page:{background:T.bg,minHeight:"100%",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"} as React.CSSProperties,
  hdr:{background:CLR,padding:"0 24px",display:"flex",alignItems:"stretch",minHeight:44,boxShadow:"0 2px 6px rgba(0,80,60,.3)"} as React.CSSProperties,
  bc:{background:"#fff",padding:"7px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.fgMuted} as React.CSSProperties,
  cmd:{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"6px 24px",display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"as const} as React.CSSProperties,
  body:{padding:"16px 24px"} as React.CSSProperties,
  card:{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden"} as React.CSSProperties,
  th:{padding:"8px 12px",textAlign:"left"as const,fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`,background:T.bg},
  td:{padding:"9px 12px",fontSize:12,color:T.fg,borderBottom:`1px solid ${T.border}18`},
  inp:{border:`1px solid ${T.border}`,borderRadius:T.r,padding:"8px 12px",fontSize:13,outline:"none",background:"#fff",color:T.fg,fontFamily:"inherit",width:"100%",boxSizing:"border-box"as const} as React.CSSProperties,
};
const btn=(bg:string,fg="white",bd?:string):React.CSSProperties=>({display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:bg,color:fg,border:`1px solid ${bd||bg}`,borderRadius:T.r,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"});

function RBtn({icon:Icon,label,onClick,col=CLR,disabled=false}:any){
  return <button onClick={onClick} disabled={disabled} style={{display:"flex",flexDirection:"column"as const,alignItems:"center",gap:2,padding:"5px 10px",border:"none",background:"transparent",cursor:disabled?"not-allowed":"pointer",color:disabled?"#9aaab8":col,borderRadius:T.r,fontSize:10,fontWeight:600,opacity:disabled?.5:1,fontFamily:"inherit"}}
    onMouseEnter={e=>!disabled&&((e.currentTarget as any).style.background="#f0fafa")}
    onMouseLeave={e=>((e.currentTarget as any).style.background="transparent")}>
    <Icon size={18}/>{label}
  </button>;
}

const BLANK={name:"",description:"",parent_category:"",color_code:"#047857",icon_name:""};

export default function CategoriesPage(){
  const nav=useNavigate();
  const{user,profile}=useAuth();
  const canManage=["admin","superadmin","webmaster","procurement_manager","inventory_manager"].includes(profile?.role||"");

  const[rows,setRows]=useState<any[]>([]);
  const[items,setItems]=useState<Record<string,number>>({});
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[modal,setModal]=useState<"add"|"edit"|null>(null);
  const[form,setForm]=useState(BLANK);
  const[editId,setEditId]=useState<string|null>(null);
  const[saving,setSaving]=useState(false);
  const[delId,setDelId]=useState<string|null>(null);

  const load=useCallback(async()=>{
    try {

    setLoading(true);
    const{data}=await db.from("categories").select("*").order("name");
    setRows(data||[]);
    // load item counts per category
    const{data:its}=await db.from("items").select("category");
    const counts:Record<string,number>={};
    (its||[]).forEach((i:any)=>{if(i.category)counts[i.category]=(counts[i.category]||0)+1;});
    setItems(counts);
    } catch(e: any) { console.warn("[Load]", e?.message); } finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    load();
    const ch=db.channel("cats_rt").on("postgres_changes",{event:"*",schema:"public",table:"categories"},load).subscribe();
    return()=>db.removeChannel(ch);
  },[load]);

  const filtered=rows.filter(r=>!search||r.name?.toLowerCase().includes(search.toLowerCase())||(r.description||"").toLowerCase().includes(search.toLowerCase()));

  const openAdd=()=>{setForm(BLANK);setEditId(null);setModal("add");};
  const openEdit=(r:any)=>{setForm({name:r.name||"",description:r.description||"",parent_category:r.parent_category||"",color_code:r.color_code||"#047857",icon_name:r.icon_name||""});setEditId(r.id);setModal("edit");};

  const save=async()=>{
    if(!form.name.trim()){toast({title:"Category name required",variant:"destructive"});return;}
    setSaving(true);
    try{
      if(modal==="add"){
        const{error}=await db.from("categories").insert({...form,created_by:user?.id,created_at:new Date().toISOString()});
        if(error)throw error;
        toast({title:"Category created"});
      }else{
        const{error}=await db.from("categories").update({...form,updated_at:new Date().toISOString()}).eq("id",editId);
        if(error)throw error;
        toast({title:"Category updated"});
      }
      setModal(null);load();
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    finally{setSaving(false);}
  };

  const del=async(id:string)=>{
    await db.from("categories").delete().eq("id",id);
    toast({title:"Category deleted"});setDelId(null);load();
  };

  const exportXlsx=()=>{
    const ws=XLSX.utils.json_to_sheet(filtered.map(r=>({Name:r.name,Description:r.description||"",Parent:r.parent_category||"","Item Count":items[r.name]||0,Color:r.color_code||""})));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Categories");
    XLSX.writeFile(wb,`categories_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const printCats=()=>{
    const w=window.open("","_blank","width=900,height=600");if(!w)return;
    const rows_html=filtered.map(r=>`<tr><td>${r.name}</td><td>${r.description||"-"}</td><td>${r.parent_category||"-"}</td><td>${items[r.name]||0}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Categories</title><style>body{font-family:Segoe UI;margin:30px;}table{width:100%;border-collapse:collapse;}th{background:#047857;color:#fff;padding:8px;}td{padding:7px;border-bottom:1px solid #eee;}@media print{button{display:none}}</style></head><body><h2>Item Categories - Embu Level 5 Hospital</h2><div style="margin-bottom:12px;color:#666;font-size:12px">${new Date().toLocaleString("en-KE")} | ${filtered.length} categories</div><table><thead><tr><th>Name</th><th>Description</th><th>Parent</th><th>Items</th></tr></thead><tbody>${rows_html}</tbody></table><br/><button onclick="window.print()">Print</button></body></html>`);
    w.document.close();setTimeout(()=>w.print(),400);
  };

  const F=(label:string,key:string,type="text")=>(
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>{label}</label>
      {key==="description"
        ?<textarea value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} rows={3} style={{...S.inp,resize:"vertical"as const}}/>
        :key==="parent_category"
          ?<select value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={S.inp}>
            <option value="">None (Top Level)</option>
            {rows.filter(r=>r.id!==editId).map(r=><option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          :<input type={type} value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={S.inp}/>
      }
    </div>
  );

  return(
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <Layers size={20} color="#fff"/>
          <div><div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Item Categories</div><div style={{fontSize:9,color:"rgba(255,255,255,.55)"}}>Inventory Classification | {rows.length} categories</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px"}}>
          <button onClick={()=>nav("/items")} style={btn("rgba(255,255,255,.15)","#fff","rgba(255,255,255,.25)")}>Items</button>
          <button onClick={()=>nav("/dashboard")} style={btn("rgba(255,255,255,.08)","#fff","rgba(255,255,255,.15)")}>Dashboard</button>
        </div>
      </div>
      <div style={S.bc}>
        <span style={{cursor:"pointer",color:T.primary}} onClick={()=>nav("/dashboard")}>Home</span>
        <ChevronRight size={12}/><span>Inventory</span><ChevronRight size={12}/><span style={{fontWeight:600}}>Categories</span>
      </div>
      <div style={S.cmd}>
        {canManage&&<RBtn icon={Plus} label="New Category" onClick={openAdd} col={CLR}/>}
        <RBtn icon={Printer} label="Print" onClick={printCats}/>
        <RBtn icon={Download} label="Export" onClick={exportXlsx}/>
        <RBtn icon={RefreshCw} label="Refresh" onClick={load}/>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"5px 10px",background:"#fff"}}>
            <Search size={13} color={T.fgDim}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories..." style={{border:"none",outline:"none",fontSize:12,fontFamily:"inherit",width:180}}/>
            {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"transparent",cursor:"pointer",padding:0,display:"flex"}}><X size={12}/></button>}
          </div>
        </div>
      </div>
      <div style={S.body}>
        <div style={S.card}>
          {loading?<div style={{padding:40,textAlign:"center"as const,color:T.fgDim}}>Loading categories...</div>
          :filtered.length===0?<div style={{padding:40,textAlign:"center"as const,color:T.fgDim}}>
            <Layers size={36} color={T.fgDim} style={{marginBottom:10,opacity:.4}}/>
            <div>No categories found</div>
            {canManage&&<button onClick={openAdd} style={{...btn(CLR),marginTop:12}}><Plus size={14}/>Add Category</button>}
          </div>
          :<table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={S.th}>Name</th><th style={S.th}>Description</th><th style={S.th}>Parent</th>
              <th style={S.th}>Items</th><th style={S.th}>Color</th>
              {canManage&&<th style={S.th}>Actions</th>}
            </tr></thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                  <td style={{...S.td,fontWeight:700}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:12,height:12,borderRadius:3,background:r.color_code||CLR,flexShrink:0}}/>
                      {r.name}
                    </div>
                  </td>
                  <td style={{...S.td,color:T.fgMuted,fontSize:11}}>{r.description||"-"}</td>
                  <td style={S.td}>{r.parent_category?<span style={{padding:"2px 8px",borderRadius:99,fontSize:10,background:CLR+"15",color:CLR}}>{r.parent_category}</span>:"-"}</td>
                  <td style={S.td}>
                    <span style={{fontWeight:700,color:CLR,display:"flex",alignItems:"center",gap:5}}>
                      <Package size={12} color={CLR}/>{items[r.name]||0} items
                    </span>
                  </td>
                  <td style={S.td}><code style={{fontSize:11,color:T.fgMuted}}>{r.color_code||"-"}</code></td>
                  {canManage&&<td style={S.td}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>openEdit(r)} style={{padding:"4px 8px",background:T.primaryBg,border:`1px solid ${T.primary}33`,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.primary,fontFamily:"inherit"}}><Edit3 size={11}/>Edit</button>
                      <button onClick={()=>setDelId(r.id)} style={{padding:"4px 8px",background:T.errorBg,border:`1px solid ${T.error}33`,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.error,fontFamily:"inherit"}}><Trash2 size={11}/>Delete</button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
        {filtered.length>0&&<div style={{padding:"8px 0",fontSize:11,color:T.fgDim}}>{filtered.length} of {rows.length} categories</div>}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>
          <div style={{background:"#fff",borderRadius:T.rLg,width:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)",animation:"fadeIn .18s"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,background:CLR}}>
              <Layers size={16} color="#fff"/>
              <div style={{flex:1,fontWeight:800,color:"#fff",fontSize:14}}>{modal==="add"?"New Category":`Edit: ${form.name}`}</div>
              <button onClick={()=>setModal(null)} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:6,cursor:"pointer",padding:"4px 7px",display:"flex",color:"#fff"}}><X size={14}/></button>
            </div>
            <div style={{padding:"20px 24px"}}>
              {F("Category Name *","name")}
              {F("Description","description")}
              {F("Parent Category","parent_category")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {F("Color Code","color_code","color")}
                {F("Icon Name (optional)","icon_name")}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                <button onClick={()=>setModal(null)} style={{padding:"8px 16px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.r,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{...btn(saving?T.fgDim:CLR),fontSize:13,padding:"8px 18px"}}>
                  {saving?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:<Save size={14}/>}
                  {saving?"Saving...":(modal==="add"?"Create Category":"Save Changes")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {delId&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:T.rLg,padding:24,width:360}}>
            <div style={{fontWeight:800,color:T.error,fontSize:15,marginBottom:10}}>Delete Category?</div>
            <div style={{fontSize:13,color:T.fgMuted,marginBottom:18}}>This will delete the category. Items in this category will not be deleted but their category will be unlinked.</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setDelId(null)} style={{padding:"8px 16px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.r,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>del(delId)} style={{padding:"8px 16px",background:T.error,color:"#fff",border:"none",borderRadius:T.r,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
