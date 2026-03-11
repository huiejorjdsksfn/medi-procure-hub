import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const genNo = () => `PV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {pending:"#d97706",approved:"#15803d",rejected:"#dc2626",paid:"#0369a1"};

export default function PurchaseVouchersPage() {
  const { user, profile, hasRole } = useAuth();
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
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    const [{data:pv},{data:s},{data:sys}] = await Promise.all([
      (supabase as any).from("purchase_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
      (supabase as any).from("system_settings").select("key,value").in("key",["hospital_name","system_logo_url"]),
    ]);
    setRows(pv||[]); setSuppliers(s||[]);
    const m:any={}; (sys||[]).forEach((x:any)=>{if(x.key)m[x.key]=x.value;});
    if(m.hospital_name) setHospitalName(m.hospital_name);
    if(m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

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
    if(!form.supplier_name||items.length===0){toast({title:"Fill required fields",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,voucher_number:genNo(),supplier_id:form.supplier_id||null,subtotal,tax_amount:taxAmt,amount:total,
      line_items:items,status:"pending",created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("purchase_vouchers").insert(payload).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","purchase_vouchers",data?.id,{number:payload.voucher_number});toast({title:"Purchase Voucher created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const approve = async (id:string) => {
    await(supabase as any).from("purchase_vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name}).eq("id",id);
    toast({title:"Approved ✓"}); load();
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
    const w=window.open("","_blank","width=1000,height=700");
    if(!w) return;
    const logo=logoUrl?`<img src="${logoUrl}" style="height:50px;object-fit:contain">`:""
    const itemsHtml=(v.line_items||[]).map((it:any,i:number)=>`<tr><td>${i+1}</td><td>${it.description}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtKES(Number(it.rate||0))}</td><td style="text-align:right">${fmtKES(Number(it.amount||0))}</td></tr>`).join("");
    w.document.write(`<html><head><title>Purchase Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#1e3a5f;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;font-weight:700}
    td{padding:5px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#e0f2fe;font-weight:800}.meta td:first-child{font-weight:700;color:#6b7280;width:30%}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>PURCHASE VOUCHER — ${v.voucher_number}</small></div></div>
    <div class="body">
      <table class="meta" style="margin-bottom:16px;font-size:11px">
        <tr><td>Supplier</td><td style="font-weight:700;font-size:13px">${v.supplier_name}</td><td style="font-weight:700;color:#6b7280">Date</td><td>${new Date(v.voucher_date).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</td></tr>
        <tr><td>Invoice No.</td><td>${v.invoice_number||"—"}</td><td style="font-weight:700;color:#6b7280">PO Reference</td><td>${v.po_reference||"—"}</td></tr>
        <tr><td>Due Date</td><td>${v.due_date?new Date(v.due_date).toLocaleDateString("en-KE"):"—"}</td><td style="font-weight:700;color:#6b7280">Status</td><td>${v.status}</td></tr>
        <tr><td>Expense Account</td><td colspan="3">${v.expense_account||"—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${itemsHtml}
        <tr><td colspan="4" style="text-align:right;font-weight:700">Subtotal</td><td>${fmtKES(v.subtotal)}</td></tr>
        <tr><td colspan="4" style="text-align:right;font-weight:700">VAT ${v.tax_rate||16}%</td><td>${fmtKES(v.tax_amount)}</td></tr>
        <tr class="total-row"><td colspan="4" style="text-align:right;font-size:13px">TOTAL</td><td style="font-size:13px">${fmtKES(v.amount)}</td></tr>
      </tbody></table>
    </div></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
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
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#7c2d12,#b45309)"}}>
        <div><h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Purchase Vouchers</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{rows.length} records · Total: {fmtKES(totalAmt)}</p></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.15)",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canCreate&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#7c2d12"}}><Plus style={{width:14,height:14}}/>New Voucher</button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:384}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{width:"100%",paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
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
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.invoice_number||"—"}</td>
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
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(700px,100%)",maxHeight:"90vh",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h3 style={{fontWeight:900,color:"#1f2937"}}>New Purchase Voucher</h3>
              <button onClick={()=>setShowNew(false)}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Supplier *</label>
                <select value={form.supplier_id} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setForm(p=>({...p,supplier_id:e.target.value,supplier_name:s?.name||""}));}}
                  style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">— Select —</option>
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
              <table style={{width:"100%",fontSize:12,borderCollapse:"collapse",borderCollapse:"collapse"}}>
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
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8}}>
              <button onClick={()=>setShowNew(false)} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#7c2d12"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving…":"Create Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
