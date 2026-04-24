import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printGenericVoucher } from "@/lib/printDocument";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const genNo = () => `PV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {pending:"#d97706",approved:"#15803d",rejected:"#dc2626",paid:"#0369a1"};

export default function PurchaseVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const sysName = getSetting("system_name","EL5 MediProcure");
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const canApprove = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({supplier_id:"",supplier_name:"",invoice_number:"",voucher_date:new Date().toISOString().slice(0,10),due_date:"",po_reference:"",description:"",expense_account:"",tax_rate:"16"});
  const [items, setItems] = useState<{description:string;qty:string;rate:string;amount:string}[]>([{description:"",qty:"1",rate:"",amount:""}]);
  // hospitalName now from useSystemSettings

  const load = async () => {
    setLoading(true);
    const [{data:pv},{data:s}] = await Promise.all([
      (supabase as any).from("purchase_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
    ]);
    setRows(pv||[]); setSuppliers(s||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  /* - Real-time subscription - */
  useEffect(()=>{
    const ch=(supabase as any).channel("puv-rt").on("postgres_changes",{event:"*",schema:"public",table:"purchase_vouchers"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const updateItem = (i:number,k:string,v:string) => {
    setItems(p=>{const n=[...p];n[i]={...n[i],[k]:v};
      if(k==="qty"||k==="rate") n[i].amount=String(Number(n[i].qty||0)*Number(n[i].rate||0));
      return n;
    });
  };

  const subtotal = items.reduce((s,it)=>s+Number(it.amount||0),0);
  const taxAmt = subtotal * Number(form.tax_rate||0)/100;
  const total = subtotal + taxAmt;

  const save = async () => {
    if(!form.supplier_name||items.length===0){toast({title:"Please fill all required fields",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,voucher_number:genNo(),supplier_id:form.supplier_id||null,subtotal,tax_amount:taxAmt,amount:total,
      line_items:items,status:"pending",created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("purchase_vouchers").insert(payload).select().single();
    if(error){toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","purchase_vouchers",data?.id,{number:payload.voucher_number});toast({title:"Purchase Voucher created -"});setShowNew(false);load();}
    setSaving(false);
  };

  const approve = async (id:string) => {
    await(supabase as any).from("purchase_vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name}).eq("id",id);
    toast({title:"Approved -"}); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete?")) return;
    await(supabase as any).from("purchase_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Purchase Vouchers");
    XLSX.writeFile(wb,`purchase_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const printVoucher = (v:any) => {
    printGenericVoucher(v, "Purchase Voucher", {
      hospitalName:   getSetting('hospital_name','Embu Level 5 Hospital'),
      sysName:        getSetting('system_name','EL5 MediProcure'),
      docFooter:      getSetting('doc_footer','Embu Level 5 Hospital - Embu County Government'),
      currencySymbol: getSetting('currency_symbol','KES'),
      logoUrl:         getSetting('logo_url') || getSetting('system_logo_url') || '',
      hospitalAddress: getSetting('hospital_address','Embu Town, Embu County, Kenya'),
      hospitalPhone:   getSetting('hospital_phone','+254 060 000000'),
      hospitalEmail:   getSetting('hospital_email','info@embu.health.go.ke'),
      printFont:      getSetting('print_font','Times New Roman'),
      showStamp:      getSetting('show_stamp','true') === 'true',
    });
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAmt = filtered.reduce((s,r)=>s+Number(r.amount||0),0);

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
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const totalAll=rows.reduce((s:number,r:any)=>s+Number(r.amount||0),0);
        const paid=rows.filter((r:any)=>r.status==="paid").length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Value",val:fmtK(totalAll),bg:"#c0392b"},
              {label:"Total Records",val:rows.length,bg:"#7d6608"},
              {label:"Paid",val:paid,bg:"#0e6655"},
              {label:"Unpaid/Pending",val:rows.length-paid,bg:"#6c3483"},
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
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#7c2d12,#b45309)"}}>
        <div><h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Purchase Vouchers</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{rows.length} records - Total: {fmtKES(totalAmt)}</p></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#e2e8f0",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#7c2d12"}}><Plus style={{width:14,height:14}}/>New Voucher</button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:384}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{width:"100%",paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#fff7ed"}}>
            {["Voucher No.","Supplier","Invoice No.","Date","Amount","Status","Actions"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10,textTransform:"uppercase"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} style={{padding:"32px 0",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={7} style={{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:12}}>No purchase vouchers</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 16px",fontWeight:700,color:"#7c2d12"}}>{r.voucher_number}</td>
                <td style={{padding:"10px 16px",fontWeight:500}}>{r.supplier_name}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.invoice_number||"-"}</td>
                <td style={{padding:"10px 16px"}}>{new Date(r.voucher_date).toLocaleDateString("en-KE")}</td>
                <td style={{padding:"10px 16px",fontWeight:700}}>{fmtKES(r.amount)}</td>
                <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setDetail(r)} style={{padding:5,borderRadius:6,background:"#dbeafe",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12,color:"#2563eb"}}/></button>
                  <button onClick={()=>printVoucher(r)} style={{padding:5,borderRadius:6,background:"#dcfce7",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12,color:"#16a34a"}}/></button>
                  {canApprove&&r.status==="pending"&&<button onClick={()=>approve(r.id)} style={{padding:5,borderRadius:6,background:"#d1fae5",border:"none",cursor:"pointer"}} title="Approve"><CheckCircle style={{width:12,height:12,color:"#059669"}}/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:5,borderRadius:6,background:"#fee2e2",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12,color:"#ef4444"}}/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* New Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowNew(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(700px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
              <h3 style={{fontWeight:900,color:"#1f2937",margin:0}}>New Purchase Voucher</h3>
              <button onClick={()=>setShowNew(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Supplier *</label>
                <select value={form.supplier_id} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setForm(p=>({...p,supplier_id:e.target.value,supplier_name:s?.name||""}));}}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">- Select -</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              {[["Invoice No.","invoice_number"],["Date","voucher_date","date"],["Due Date","due_date","date"],["PO Reference","po_reference"],["Expense Account","expense_account"],["Tax Rate (%)","tax_rate","number"]].map(([l,k,t])=>(
                <div key={k}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              ))}
            </div>
            {/* Line items */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:700,color:"#374151",textTransform:"uppercase"}}>Line Items</label>
                <button onClick={()=>setItems(p=>[...p,{description:"",qty:"1",rate:"",amount:""}])} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,background:"none",border:"none",cursor:"pointer"}}><Plus style={{width:12,height:12}}/>Add</button>
              </div>
              <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#fff7ed"}}>{["Description","Qty","Rate","Amount",""].map(h=><th key={h} style={{padding:"8px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>
                  {items.map((it,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td style={{padding:"4px"}}><input value={it.description} onChange={e=>updateItem(i,"description",e.target.value)} style={{width:"100%",padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none",boxSizing:"border-box"}}/></td>
                      <td style={{padding:"4px"}}><input type="number" value={it.qty} onChange={e=>updateItem(i,"qty",e.target.value)} style={{width:56,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/></td>
                      <td style={{padding:"4px"}}><input type="number" value={it.rate} onChange={e=>updateItem(i,"rate",e.target.value)} style={{width:96,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/></td>
                      <td style={{padding:"4px",fontWeight:600,textAlign:"right"}}>{fmtKES(Number(it.amount||0))}</td>
                      <td style={{padding:"4px"}}><button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{color:"#f87171"}}><X style={{width:12,height:12}}/></button></td>
                    </tr>
                  ))}
                  <tr style={{background:"#fff7ed"}}>
                    <td colSpan={3} style={{padding:"8px",textAlign:"right",fontSize:12,fontWeight:700}}>Subtotal</td><td style={{padding:"8px",textAlign:"right",fontSize:12,fontWeight:700}}>{fmtKES(subtotal)}</td><td/>
                  </tr>
                  <tr style={{background:"#fff7ed"}}>
                    <td colSpan={3} style={{padding:"8px",textAlign:"right",fontSize:12,fontWeight:700}}>VAT {form.tax_rate||16}%</td><td style={{padding:"8px",textAlign:"right",fontSize:12,fontWeight:700}}>{fmtKES(taxAmt)}</td><td/>
                  </tr>
                  <tr style={{background:"#fde68a",fontWeight:900}}>
                    <td colSpan={3} style={{padding:"8px",textAlign:"right",fontSize:14,fontWeight:900}}>TOTAL</td><td style={{padding:"8px",textAlign:"right",fontSize:14,fontWeight:900}}>{fmtKES(total)}</td><td/>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <button onClick={()=>setShowNew(false)} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#7c2d12"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":"Create Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

