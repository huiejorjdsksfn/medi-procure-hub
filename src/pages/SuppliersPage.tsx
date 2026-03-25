
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Edit, Search, X, RefreshCw, Download, Printer, FileSpreadsheet, Star, Truck, CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const SS: Record<string,{bg:string;color:string}> = {
  active:   {bg:"#dcfce7",color:"#15803d"},
  inactive: {bg:"#fee2e2",color:"#dc2626"},
  suspended:{bg:"#fef3c7",color:"#92400e"},
};
const CATS = ["pharmaceutical","medical_equipment","consumables","reagents","laboratory","surgical","general","other"];
const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};
const lbl: React.CSSProperties = {fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,display:"block"};

export default function SuppliersPage() {
  const { user, profile, roles } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const sysName = getSetting("system_name","EL5 MediProcure");
  const isAdmin = roles.includes("admin")||roles.includes("procurement_manager")||roles.includes("procurement_officer");

  const [suppliers,    setSuppliers]    = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter,    setCatFilter]    = useState("all");
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<any>(null);
  const [viewSupplier, setViewSupplier] = useState<any>(null);
  const [saving,       setSaving]       = useState(false);
  // hospitalName now from useSystemSettings
  // sysName now from useSystemSettings
  const [form, setForm] = useState({
    name:"",contact_person:"",email:"",phone:"",address:"",
    tax_id:"",kra_pin:"",category:"pharmaceutical",status:"active",
    bank_name:"",bank_account:"",bank_branch:"",rating:"3",website:"",notes:"",
  });

  useEffect(()=>{
    /* settings via useSystemSettings hook */
  },[]);

  const load = useCallback(async()=>{
    setLoading(true);
    const{data}=await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data||[]); setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch=supabase.channel("supp-rt").on("postgres_changes",{event:"*",schema:"public",table:"suppliers"},()=>load()).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const openCreate=()=>{
    setEditing(null);
    setForm({name:"",contact_person:"",email:"",phone:"",address:"",tax_id:"",kra_pin:"",category:"pharmaceutical",status:"active",bank_name:"",bank_account:"",bank_branch:"",rating:"3",website:"",notes:""});
    setShowForm(true);
  };
  const openEdit=(s:any)=>{
    setEditing(s);
    setForm({name:s.name||"",contact_person:s.contact_person||"",email:s.email||"",phone:s.phone||"",address:s.address||"",tax_id:s.tax_id||"",kra_pin:s.kra_pin||"",category:s.category||"pharmaceutical",status:s.status||"active",bank_name:s.bank_name||"",bank_account:s.bank_account||"",bank_branch:s.bank_branch||"",rating:String(s.rating||3),website:s.website||"",notes:s.notes||""});
    setShowForm(true);
  };

  const save=async()=>{
    if(!form.name.trim()){toast({title:"Supplier name is required",variant:"destructive"});return;}
    if(form.email&&!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)){toast({title:"Invalid email address",variant:"destructive"});return;}
    if(form.phone&&!/^[+\d\s\-()]{6,20}$/.test(form.phone)){toast({title:"Invalid phone number",variant:"destructive"});return;}
    if(form.kra_pin&&form.kra_pin.length>0&&form.kra_pin.length<5){toast({title:"KRA PIN must be at least 5 characters",variant:"destructive"});return;}
    setSaving(true);
    try{
      const payload={...form,rating:Number(form.rating)||3};
      if(editing){
        const{error}=await supabase.from("suppliers").update(payload).eq("id",editing.id);
        if(error)throw error;
        logAudit(user?.id,profile?.full_name,"update","suppliers",editing.id,{name:form.name});
        toast({title:"Supplier updated"});
      }else{
        const{data,error}=await supabase.from("suppliers").insert(payload).select().single();
        if(error)throw error;
        logAudit(user?.id,profile?.full_name,"create","suppliers",data?.id,{name:form.name});
        toast({title:"Supplier added",description:form.name});
      }
      setShowForm(false); load();
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    setSaving(false);
  };

  const deleteSupplier=async(s:any)=>{
    if(!confirm(`Delete supplier "${s.name}"?`)) return;
    const{error}=await supabase.from("suppliers").delete().eq("id",s.id);
    if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});return;}
    logAudit(user?.id,profile?.full_name,"delete","suppliers",s.id,{name:s.name});
    toast({title:"Supplier deleted"}); load();
  };

  const toggleStatus=async(s:any)=>{
    const next=s.status==="active"?"inactive":"active";
    await supabase.from("suppliers").update({status:next}).eq("id",s.id);
    logAudit(user?.id,profile?.full_name,"update","suppliers",s.id,{status:next});
    toast({title:`Supplier ${next}`}); load();
  };

  const filtered=suppliers.filter(s=>{
    if(statusFilter!=="all"&&s.status!==statusFilter) return false;
    if(catFilter!=="all"&&s.category!==catFilter) return false;
    if(search){const q=search.toLowerCase();return (s.name||"").toLowerCase().includes(q)||(s.contact_person||"").toLowerCase().includes(q)||(s.email||"").toLowerCase().includes(q)||(s.kra_pin||"").toLowerCase().includes(q);}
    return true;
  });

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    const hdr=[[hospitalName],[sysName+" — Supplier Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows=filtered.map(s=>({Name:s.name,Contact:s.contact_person,Email:s.email,Phone:s.phone,Category:s.category,Status:s.status,Rating:s.rating,KRA_PIN:s.kra_pin,Tax_ID:s.tax_id,Bank:s.bank_name,Account:s.bank_account,Address:s.address}));
    const ws=XLSX.utils.aoa_to_sheet([...hdr,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    ws["!cols"]=Object.keys(rows[0]||{}).map(()=>({wch:20}));
    XLSX.utils.book_append_sheet(wb,ws,"Suppliers");
    XLSX.writeFile(wb,`Suppliers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} suppliers`});
  };

  const printAll=()=>{
    const win=window.open("","_blank","width=1100,height=800");
    if(!win) return;
    win.document.write(`<html><head><title>Suppliers</title><style>body{font-family:'Segoe UI',Arial;font-size:11px;margin:20px}h2{color:#1a3a6b}table{width:100%;border-collapse:collapse}th{background:#1a3a6b;color:#fff;padding:6px 10px;text-align:left;font-size:10px}td{padding:5px 10px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9fafb}@media print{@page{margin:1cm}}</style></head><body>
    <h2>${hospitalName} — Supplier Register</h2><p style="font-size:10px;color:#888">Generated: ${new Date().toLocaleString("en-KE")} · ${filtered.length} suppliers</p>
    <table><thead><tr><th>#</th><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>Category</th><th>Status</th><th>KRA PIN</th><th>Rating</th></tr></thead>
    <tbody>${filtered.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${s.contact_person||"—"}</td><td>${s.email||"—"}</td><td>${s.phone||"—"}</td><td>${s.category||"—"}</td><td>${s.status||"—"}</td><td>${s.kra_pin||"—"}</td><td>${s.rating||"—"}</td></tr>`).join("")}
    </tbody></table></body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  const printOne=(s:any)=>{
    const win=window.open("","_blank","width=800,height=600");
    if(!win) return;
    win.document.write(`<html><head><title>${s.name}</title><style>body{font-family:'Segoe UI',Arial;margin:20px;font-size:12px}.lh{border-bottom:3px solid #1a3a6b;padding-bottom:10px;margin-bottom:15px}h1{color:#1a3a6b;font-size:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.field{margin-bottom:8px}.label{font-size:9px;font-weight:700;color:#888;text-transform:uppercase}.val{font-size:12px;color:#333;margin-top:2px}@media print{@page{margin:1.5cm}}</style></head><body>
    <div class="lh"><h2 style="margin:0;color:#1a3a6b">${hospitalName}</h2><div style="font-size:10px;color:#888">${sysName} · Supplier Record</div></div>
    <h1>${s.name}</h1>
    <div class="grid">
      <div class="field"><div class="label">Contact Person</div><div class="val">${s.contact_person||"—"}</div></div>
      <div class="field"><div class="label">Email</div><div class="val">${s.email||"—"}</div></div>
      <div class="field"><div class="label">Phone</div><div class="val">${s.phone||"—"}</div></div>
      <div class="field"><div class="label">Category</div><div class="val">${s.category||"—"}</div></div>
      <div class="field"><div class="label">KRA PIN</div><div class="val">${s.kra_pin||"—"}</div></div>
      <div class="field"><div class="label">Tax ID</div><div class="val">${s.tax_id||"—"}</div></div>
      <div class="field"><div class="label">Bank</div><div class="val">${s.bank_name||"—"}</div></div>
      <div class="field"><div class="label">Account</div><div class="val">${s.bank_account||"—"}</div></div>
      <div class="field"><div class="label">Branch</div><div class="val">${s.bank_branch||"—"}</div></div>
      <div class="field"><div class="label">Rating</div><div class="val">${"★".repeat(s.rating||3)}</div></div>
    </div>
    ${s.address?`<div class="field"><div class="label">Address</div><div class="val">${s.address}</div></div>`:""}
    ${s.notes?`<div class="field"><div class="label">Notes</div><div class="val">${s.notes}</div></div>`:""}
    <p style="font-size:9px;color:#aaa;margin-top:20px">Printed: ${new Date().toLocaleString("en-KE")}</p>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  const btnSm: React.CSSProperties = {padding:"5px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5};

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f8fafc",minHeight:"100%",padding:16}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .sup-row:hover td{background:#eff6ff!important}
        @media(max-width:768px){.sup-header{flex-direction:column!important}.sup-filters{flex-wrap:wrap!important}.col-hide{display:none!important}}
      `}</style>
      {/* KPI TILES */}
      {(()=>{
        const activeS=suppliers.filter(s=>s.status==="active").length;
        const suspendedS=suppliers.filter(s=>s.status==="suspended").length;
        const ratedS=suppliers.filter(s=>s.rating>=4).length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}}>
            {[
              {label:"Total Suppliers",val:suppliers.length,bg:"#c0392b"},
              {label:"Active",val:activeS,bg:"#0e6655"},
              {label:"Suspended",val:suspendedS,bg:"#7d6608"},
              {label:"Top Rated (4+)",val:ratedS,bg:"#6c3483"},
              {label:"Showing",val:filtered.length,bg:"#1a252f"},
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
      <div  style={{background:"linear-gradient(90deg,#1a3a6b,#1d4ed8,#2563eb)",borderRadius:12,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12,boxShadow:"0 4px 16px rgba(30,64,175,0.35)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Truck style={{width:22,height:22,color:"#fff"}}/>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>Suppliers</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{filtered.length} of {suppliers.length} suppliers</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={load} disabled={loading} style={{...btnSm,background:"rgba(255,255,255,0.18)",color:"#fff",minWidth:36,justifyContent:"center"}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={printAll} style={{...btnSm,background:"rgba(255,255,255,0.18)",color:"#fff"}}>
            <Printer style={{width:13,height:13}}/>Print
          </button>
          <button onClick={exportExcel} style={{...btnSm,background:"rgba(52,211,153,0.85)",color:"#fff"}}>
            <FileSpreadsheet style={{width:13,height:13}}/>Export
          </button>
          {isAdmin&&<button onClick={openCreate} style={{...btnSm,background:"#fff",color:"#1a3a6b",fontWeight:800}}>
            <Plus style={{width:13,height:13}}/>Add Supplier
          </button>}
        </div>
      </div>

      {/* Filters */}
      <div  style={{background:"#fff",borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"center",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",flexWrap:"wrap"}}>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...inp,width:"auto",padding:"5px 10px",fontSize:12}}>
          <option value="all">All Categories</option>
          {CATS.map(c=><option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
        </select>
        <div style={{display:"flex",gap:4}}>
          {["all","active","inactive","suspended"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",textTransform:"capitalize",background:statusFilter===s?"#1a3a6b":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
              {s}
            </button>
          ))}
        </div>
        <div style={{flex:1,minWidth:180,position:"relative"}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, KRA PIN..."
            style={{...inp,paddingLeft:32,paddingRight:search?28:12,fontSize:12}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X style={{width:13,height:13,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* Table */}
      <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#1a3a6b"}}>
                {["#","Name","Contact","Email","Phone","Category","Status","Rating","Actions"].map(h=>(
                  <th key={h} style={{padding:"9px 12px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                <tr><td colSpan={9} style={{padding:"40px",textAlign:"center"}}>
                  <RefreshCw style={{width:18,height:18,color:"#9ca3af",animation:"spin 1s linear infinite",display:"block",margin:"0 auto 8px"}}/>
                  <span style={{fontSize:12,color:"#9ca3af"}}>Loading suppliers...</span>
                </td></tr>
              ):filtered.length===0?(
                <tr><td colSpan={9} style={{padding:"50px",textAlign:"center",color:"#9ca3af",fontSize:13}}>No suppliers found</td></tr>
              ):filtered.map((s,i)=>{
                const st=SS[s.status]||{bg:"#f3f4f6",color:"#6b7280"};
                return (
                  <tr key={s.id} >
                    <td style={{padding:"7px 12px",color:"#9ca3af",background:i%2===0?"#fff":"#f9fafb"}}>{i+1}</td>
                    <td style={{padding:"7px 12px",fontWeight:700,color:"#111827",background:i%2===0?"#fff":"#f9fafb"}}>{s.name}</td>
                    <td style={{padding:"7px 12px",color:"#374151",background:i%2===0?"#fff":"#f9fafb"}}>{s.contact_person||"—"}</td>
                    <td style={{padding:"7px 12px",color:"#6b7280",background:i%2===0?"#fff":"#f9fafb"}}>{s.email||"—"}</td>
                    <td style={{padding:"7px 12px",color:"#6b7280",background:i%2===0?"#fff":"#f9fafb"}}>{s.phone||"—"}</td>
                    <td style={{padding:"7px 12px",textTransform:"capitalize",color:"#374151",background:i%2===0?"#fff":"#f9fafb"}}>{(s.category||"").replace(/_/g," ")}</td>
                    <td style={{padding:"7px 12px",background:i%2===0?"#fff":"#f9fafb"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:st.bg,color:st.color,textTransform:"capitalize"}}>{s.status||"active"}</span>
                    </td>
                    <td style={{padding:"7px 12px",color:"#f59e0b",fontSize:13,background:i%2===0?"#fff":"#f9fafb"}}>{"★".repeat(Math.min(s.rating||3,5))}</td>
                    <td style={{padding:"7px 12px",background:i%2===0?"#fff":"#f9fafb"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setViewSupplier(s)} title="View" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#dbeafe",color:"#1d4ed8"}}><Eye style={{width:12,height:12}}/></button>
                        {isAdmin&&<button onClick={()=>openEdit(s)} title="Edit" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#dcfce7",color:"#15803d"}}><Edit style={{width:12,height:12}}/></button>}
                        {isAdmin&&<button onClick={()=>toggleStatus(s)} title={s.status==="active"?"Deactivate":"Activate"} style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:s.status==="active"?"#fef3c7":"#dcfce7",color:s.status==="active"?"#92400e":"#15803d"}}>{s.status==="active"?<XCircle style={{width:12,height:12}}/>:<CheckCircle style={{width:12,height:12}}/>}</button>}
                        <button onClick={()=>printOne(s)} title="Print" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#f3f4f6",color:"#374151"}}><Printer style={{width:12,height:12}}/></button>
                        {isAdmin&&<button onClick={()=>deleteSupplier(s)} title="Delete" style={{padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626"}}><Trash2 style={{width:12,height:12}}/></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 14px",background:"#f9fafb",borderTop:"1px solid #e5e7eb",fontSize:11,color:"#6b7280"}}>{filtered.length} suppliers</div>
      </div>

      {/* View Modal */}
      {viewSupplier&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(560px,100%)",maxHeight:"88vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#1a3a6b,#2563eb)",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"14px 14px 0 0"}}>
              <div><div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{viewSupplier.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.9)",marginTop:2}}>{viewSupplier.category?.replace(/_/g," ")}</div></div>
              <button onClick={()=>setViewSupplier(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#fff"}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[["Contact",viewSupplier.contact_person],["Email",viewSupplier.email],["Phone",viewSupplier.phone],["Address",viewSupplier.address],["KRA PIN",viewSupplier.kra_pin],["Tax ID",viewSupplier.tax_id],["Bank",viewSupplier.bank_name],["Account",viewSupplier.bank_account],["Branch",viewSupplier.bank_branch],["Website",viewSupplier.website],["Rating","★".repeat(viewSupplier.rating||3)],["Status",viewSupplier.status]].filter(([,v])=>v).map(([k,v])=>(
                <div key={k as string}><div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{k}</div><div style={{fontSize:13,color:"#111827",fontWeight:600}}>{v}</div></div>
              ))}
              {viewSupplier.notes&&<div style={{gridColumn:"1/-1"}}><div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>Notes</div><div style={{fontSize:13,color:"#374151"}}>{viewSupplier.notes}</div></div>}
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>printOne(viewSupplier)} style={{...btnSm,padding:"7px 14px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8}}><Printer style={{width:13,height:13}}/>Print</button>
              {isAdmin&&<button onClick={()=>{setViewSupplier(null);openEdit(viewSupplier);}} style={{padding:"7px 16px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>Edit</button>}
              <button onClick={()=>setViewSupplier(null)} style={{padding:"7px 16px",border:"1px solid #e5e7eb",background:"#fff",borderRadius:8,cursor:"pointer",fontSize:13}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.55)"}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(640px,100%)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#1a3a6b,#2563eb)",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"14px 14px 0 0"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{editing?"Edit Supplier":"New Supplier"}</div>
              <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#fff"}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{overflowY:"auto",padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Supplier Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="e.g. Pharmed Kenya Ltd"/></div>
                <div><label style={lbl}>Contact Person</label><input value={form.contact_person} onChange={e=>setForm(p=>({...p,contact_person:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Email</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={inp}>{CATS.map(c=><option key={c} value={c}>{c.replace(/_/g," ")}</option>)}</select></div>
                <div><label style={lbl}>KRA PIN</label><input value={form.kra_pin} onChange={e=>setForm(p=>({...p,kra_pin:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Tax ID / VAT No.</label><input value={form.tax_id} onChange={e=>setForm(p=>({...p,tax_id:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Bank Name</label><input value={form.bank_name} onChange={e=>setForm(p=>({...p,bank_name:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Bank Account</label><input value={form.bank_account} onChange={e=>setForm(p=>({...p,bank_account:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Bank Branch</label><input value={form.bank_branch} onChange={e=>setForm(p=>({...p,bank_branch:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Website</label><input value={form.website} onChange={e=>setForm(p=>({...p,website:e.target.value}))} style={inp} placeholder="https://"/></div>
                <div><label style={lbl}>Rating (1-5)</label><select value={form.rating} onChange={e=>setForm(p=>({...p,rating:e.target.value}))} style={inp}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}</select></div>
                <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Address</label><textarea value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} rows={2} style={{...inp,resize:"none"}}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...inp,resize:"none"}}/></div>
              </div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 18px",border:"1px solid #e5e7eb",background:"#fff",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:8,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Truck style={{width:13,height:13}}/>}
                {saving?"Saving...":"Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
