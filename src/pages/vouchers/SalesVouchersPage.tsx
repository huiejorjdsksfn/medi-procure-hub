import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printGenericVoucher } from "@/lib/printDocument";

function fmtKES(n:number) { return `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`; };
function genNo() { return `SV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`; };
const SC: Record<string,string> = {confirmed:"#15803d",pending:"#d97706",cancelled:"#dc2626"};

export default function SalesVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const sysName = getSetting("system_name","EL5 MediProcure");
  const canCreate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({customer_name:"",customer_type:"walk_in",patient_number:"",payment_method:"Cash",voucher_date:new Date().toISOString().slice(0,10),due_date:"",description:"",income_account:"",department_id:"",tax_rate:"16"});
  const [lineItems, setLineItems] = useState<{item_id:string;item_name:string;qty:string;rate:string;amount:string}[]>([{item_id:"",item_name:"",qty:"1",rate:"",amount:""}]);
  // hospitalName now from useSystemSettings

  const load = async () => {
    try {

    setLoading(true);
    const [{data:sv},{data:d},{data:it}] = await Promise.all([
      (supabase as any).from("sales_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("departments").select("id,name").order("name"),
      (supabase as any).from("items").select("id,name,unit_price").order("name"),
    ]);
    setRows(sv||[]); setDepts(d||[]); setItems(it||[]);
    } catch(e: any) {
      console.warn("[ProcurBosse] Load error:", e?.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{load();},[]);

  /* -- Real-time subscription ------------------------------- */
  useEffect(()=>{
    const ch=(supabase as any).channel("sv-rt").on("postgres_changes",{event:"*",schema:"public",table:"sales_vouchers"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const updateLine = (i:number,k:string,v:string) => {
    setLineItems(p=>{const n=[...p];n[i]={...n[i],[k]:v};
      if(k==="item_id"){const it=items.find(x=>x.id===v); if(it){n[i].item_name=it.name;n[i].rate=String(it.unit_price||0);}}
      if(k==="qty"||k==="rate") n[i].amount=String(Number(n[i].qty||0)*Number(n[i].rate||0));
      return n;
    });
  };

  const subtotal = lineItems.reduce((s,it)=>s+Number(it.amount||0),0);
  const taxAmt = subtotal*Number(form.tax_rate||0)/100;
  const total = subtotal+taxAmt;

  const save = async () => {
    if(!form.customer_name){toast({title:"Customer name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,voucher_number:genNo(),subtotal,tax_amount:taxAmt,amount:total,
      department_id:form.department_id||null,line_items:lineItems,status:"confirmed",created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("sales_vouchers").insert(payload).select().single();
    if(error){toast({title:"Save failed",description:error.message||"Database error  -- please try again",variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","sales_vouchers",data?.id,{number:payload.voucher_number});toast({title:"Sales Voucher created "});setShowNew(false);load();}
    setSaving(false);
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete?")) return;
    await(supabase as any).from("sales_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Sales Vouchers");
    XLSX.writeFile(wb,`sales_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const printVoucher = (v:any) => {
    printGenericVoucher(v, "Sales Voucher", {
      hospitalName:   getSetting('hospital_name','Embu Level 5 Hospital'),
      sysName:        getSetting('system_name','EL5 MediProcure'),
      docFooter:      getSetting('doc_footer','Embu Level 5 Hospital * Embu County Government'),
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
        const totalAll=rows.reduce((s:number,r:any)=>s+Number(r.amount||r.total_amount||0),0);
        const confirmed=rows.filter((r:any)=>r.status==="confirmed").length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Sales",val:fmtK(totalAll),bg:"#c0392b"},
              {label:"Total Records",val:rows.length,bg:"#7d6608"},
              {label:"Confirmed",val:confirmed,bg:"#0e6655"},
              {label:"Pending",val:rows.filter((r:any)=>r.status==="pending").length,bg:"#6c3483"},
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
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#065f46,#0d9488)"}}>
        <div><h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Sales Vouchers</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{rows.length} records * Total: {fmtKES(totalAmt)}</p></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#e2e8f0",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#065f46"}}><Plus style={{width:14,height:14}}/>New Sale</button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:384}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{width:"100%",paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#ecfdf5"}}>
            {["Voucher No.","Customer","Type","Date","Amount","Status","Actions"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10,textTransform:"uppercase"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} style={{padding:"32px 0",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={7} style={{padding:"32px 0",textAlign:"center",color:"#9ca3af",fontSize:12}}>No sales vouchers</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 16px",fontWeight:700,color:"#065f46"}}>{r.voucher_number}</td>
                <td style={{padding:"10px 16px",fontWeight:500}}>{r.customer_name}</td>
                <td style={{padding:"10px 16px",color:"#6b7280",textTransform:"capitalize"}}>{r.customer_type}</td>
                <td style={{padding:"10px 16px"}}>{new Date(r.voucher_date).toLocaleDateString("en-KE")}</td>
                <td style={{padding:"10px 16px",fontWeight:700}}>{fmtKES(r.amount)}</td>
                <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setDetail(r)} style={{padding:5,borderRadius:6,background:"#dbeafe",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12,color:"#2563eb"}}/></button>
                  <button onClick={()=>printVoucher(r)} style={{padding:5,borderRadius:6,background:"#dcfce7",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12,color:"#16a34a"}}/></button>
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:5,borderRadius:6,background:"#fee2e2",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12,color:"#ef4444"}}/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowNew(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(700px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
              <h3 style={{fontWeight:900,color:"#1f2937",margin:0}}>New Sales Voucher</h3>
              <button onClick={()=>setShowNew(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Customer Name *","customer_name"],["Patient No.","patient_number"],["Date","voucher_date","date"],["Due Date","due_date","date"],["Income Account","income_account"]].map(([l,k,t])=>(
                <div key={k}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>{l}</label>
                  <input type={t||"text"} value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k as string]:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              ))}
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Customer Type</label>
                <select value={form.customer_type} onChange={e=>setForm(p=>({...p,customer_type:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {["walk_in","inpatient","outpatient","insurance","government","corporate"].map(t=><option key={t} value={t} style={{textTransform:"capitalize"}}>{t.replace(/_/g," ")}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Payment Method</label>
                <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {["Cash","MPESA","Insurance","Cheque","EFT","Credit"].map(m=><option key={m}>{m}</option>)}
                </select></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Tax Rate (%)</label>
                <input type="number" value={form.tax_rate} onChange={e=>setForm(p=>({...p,tax_rate:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Department</label>
                <select value={form.department_id} onChange={e=>setForm(p=>({...p,department_id:e.target.value}))}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value=""> -- Select  --</option>
                  {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:700,color:"#374151",textTransform:"uppercase"}}>Line Items</label>
                <button onClick={()=>setLineItems(p=>[...p,{item_id:"",item_name:"",qty:"1",rate:"",amount:""}])} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,color:"#0f766e",background:"none",border:"none",cursor:"pointer"}}><Plus style={{width:12,height:12}}/>Add</button>
              </div>
              <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#ecfdf5"}}>{["Item","Qty","Rate","Amount",""].map(h=><th key={h} style={{padding:"8px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>
                  {lineItems.map((it,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td style={{padding:"4px"}}>
                        <select value={it.item_id} onChange={e=>updateLine(i,"item_id",e.target.value)} style={{width:"100%",padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none",boxSizing:"border-box"}}>
                          <option value=""> -- Item  --</option>
                          {items.map(it2=><option key={it2.id} value={it2.id}>{it2.name}</option>)}
                        </select>
                      </td>
                      <td style={{padding:"4px"}}><input type="number" value={it.qty} onChange={e=>updateLine(i,"qty",e.target.value)} style={{width:56,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/></td>
                      <td style={{padding:"4px"}}><input type="number" value={it.rate} onChange={e=>updateLine(i,"rate",e.target.value)} style={{width:96,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/></td>
                      <td style={{padding:"4px",fontWeight:600}}>{fmtKES(Number(it.amount||0))}</td>
                      <td><button onClick={()=>setLineItems(p=>p.filter((_,j)=>j!==i))} style={{color:"#f87171"}}><X style={{width:12,height:12}}/></button></td>
                    </tr>
                  ))}
                  <tr style={{background:"#d1fae5",fontWeight:900}}>
                    <td colSpan={3} style={{padding:"6px 8px",textAlign:"right",fontSize:14,fontWeight:900}}>TOTAL</td>
                    <td style={{padding:"6px 8px",fontSize:14,fontWeight:900}}>{fmtKES(total)}</td><td/>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <button onClick={()=>setShowNew(false)} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#065f46"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":"Create Sale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

