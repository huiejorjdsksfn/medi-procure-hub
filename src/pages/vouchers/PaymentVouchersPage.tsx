import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { notifyProcurement, triggerVoucherEvent } from "@/lib/notify";
import { Plus, Search, RefreshCw, Eye, Printer, Download, X, Save, CheckCircle, XCircle, DollarSign, Trash2 } from "lucide-react";
import logo from "@/assets/embu-county-logo.jpg";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printPaymentVoucher } from "@/lib/printDocument";

const genNo = () => { const d=new Date(); return `PV/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}/${Math.floor(1000+Math.random()*9000)}`; };
const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const fmtDate = (d:string) => d?new Date(d).toLocaleDateString("en-KE",{dateStyle:"long"}):"—";

const S_CFG:Record<string,{bg:string;color:string;label:string}> = {
  draft:    {bg:"#f3f4f6",color:"#6b7280",label:"Draft"},
  pending:  {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  approved: {bg:"#dcfce7",color:"#15803d",label:"Approved"},
  paid:     {bg:"#dbeafe",color:"#1d4ed8",label:"Paid"},
  rejected: {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
};
const sc = (s:string) => S_CFG[s]||S_CFG.draft;

const EXPENSE_ACCOUNTS = ["5100 - Medical Supplies Expense","5200 - Pharmaceutical Expense","5300 - Salaries & Wages","5400 - Equipment Maintenance","5500 - Utilities","5600 - Administrative Expenses","5700 - Depreciation Expense","1100 - Cash","2100 - Accounts Payable","6100 - Lab Supplies","6200 - Cleaning & Sanitation"];
const METHODS = ["EFT/Bank Transfer","RTGS","Cheque","Cash","Mobile Money (M-Pesa)","Standing Order"];

const LBL = ({children}:{children:any}) => <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>{children}</div>;
const INP = (v:any,cb:any,p="",t="text",extra?:any) => (
  <input type={t} value={v} onChange={e=>cb(e.target.value)} placeholder={p} {...extra}
    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",background:"#fff",boxSizing:"border-box"}}/>
);
const emptyLine = () => ({description:"",qty:"1",unit_price:"",amount:"",account:""});

export default function PaymentVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canApprove = hasRole("admin")||hasRole("procurement_manager");

  const [rows,     setRows]     = useState<any[]>([]);
  const [suppliers,setSuppliers]= useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [stFilter, setStFilter] = useState("all");
  const [showNew,  setShowNew]  = useState(false);
  const [detail,   setDetail]   = useState<any>(null);
  const [print,    setPrint]    = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({payee_name:"",payee_type:"supplier",supplier_id:"",payment_method:"EFT/Bank Transfer",voucher_date:new Date().toISOString().split("T")[0],bank_name:"",account_number:"",reference:"",description:"",expense_account:EXPENSE_ACCOUNTS[0],line_items:[emptyLine()]});

  const load = useCallback(async()=>{
    setLoading(true);
    const [{data:v},{data:s}] = await Promise.all([
      (supabase as any).from("payment_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name,bank_name,account_number").order("name"),
    ]);
    setRows(v||[]); setSuppliers(s||[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=(supabase as any).channel("pv-rt").on("postgres_changes",{event:"*",schema:"public",table:"payment_vouchers"},load).subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[load]);

  const lineTotal = (lines:any[]) => lines.reduce((s,l)=>s+(Number(l.qty||1)*Number(l.unit_price||l.amount||0)),0);

  const save = async () => {
    if(!form.payee_name?.trim()){toast({title:"Payee name is required",variant:"destructive"});return;}
    if(!form.voucher_date){toast({title:"Voucher date is required",variant:"destructive"});return;}
    if(form.total_amount!==undefined&&Number(form.total_amount)<=0){toast({title:"Total amount must be greater than zero",variant:"destructive"});return;}
    const validLines=form.line_items.filter(l=>l.description.trim());
    if(!validLines.length){toast({title:"Add at least one line item",variant:"destructive"});return;}
    setSaving(true);
    const total=lineTotal(validLines);
    const sup=suppliers.find(s=>s.id===form.supplier_id);
    const payload={voucher_number:genNo(),payee_name:form.payee_name||(sup?.name||""),payee_type:form.payee_type,supplier_id:form.supplier_id||null,payment_method:form.payment_method,voucher_date:form.voucher_date,bank_name:form.bank_name||(sup?.bank_name||""),account_number:form.account_number||(sup?.account_number||""),reference:form.reference,description:form.description,expense_account:form.expense_account,line_items:validLines,total_amount:total,status:"pending",prepared_by:user?.id,prepared_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("payment_vouchers").insert(payload).select().single();
    if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});setSaving(false);return;}
    logAudit(user?.id,profile?.full_name,"create","payment_vouchers",data?.id,{});
    await notifyProcurement({title:"New Payment Voucher",message:`${payload.voucher_number} — ${form.payee_name} — ${fmtKES(total)}`,type:"voucher",module:"PaymentVouchers",senderId:user?.id});
    toast({title:"Payment voucher created ✓"});
    setShowNew(false); setForm({payee_name:"",payee_type:"supplier",supplier_id:"",payment_method:"EFT/Bank Transfer",voucher_date:new Date().toISOString().split("T")[0],bank_name:"",account_number:"",reference:"",description:"",expense_account:EXPENSE_ACCOUNTS[0],line_items:[emptyLine()]}); load(); setSaving(false);
  };

  const approve = async (v:any) => {
    await(supabase as any).from("payment_vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name,approved_at:new Date().toISOString()}).eq("id",v.id);
    toast({title:"Approved ✓"}); load();
  };
  const reject_ = async (v:any) => {
    await(supabase as any).from("payment_vouchers").update({status:"rejected"}).eq("id",v.id);
    toast({title:"Rejected"}); load();
  };
  const markPaid = async (v:any) => {
    await(supabase as any).from("payment_vouchers").update({status:"paid",paid_at:new Date().toISOString(),paid_by:profile?.full_name}).eq("id",v.id);
    toast({title:"Marked as paid ✓"}); load();
  };

  const updLine=(i:number,k:string,v:string)=>{
    setForm(p=>{
      const items=[...p.line_items]; items[i]={...items[i],[k]:v};
      if(k==="qty"||k==="unit_price") items[i].amount=String(Number(items[i].qty||1)*Number(items[i].unit_price||0));
      return {...p,line_items:items};
    });
  };

  const exportXLSX = () => {
    const ws=XLSX.utils.json_to_sheet(filtered.map(r=>({No:r.voucher_number,Payee:r.payee_name,Method:r.payment_method,Total:r.total_amount,Date:r.voucher_date,Status:r.status,"Prepared By":r.prepared_by_name,"Approved By":r.approved_by_name||"—"})));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"PaymentVouchers");XLSX.writeFile(wb,`PaymentVouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const filtered=rows.filter(r=>(stFilter==="all"||r.status===stFilter)&&(!search||[r.voucher_number,r.payee_name,r.payment_method,r.reference].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()))));

  return (
      <div style={{padding:"16px 20px",maxWidth:1400,margin:"0 auto",fontFamily:"'Segoe UI',system-ui"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {/* KPI TILES */}
      {(()=>{
        const totalAmt = rows.reduce((s,r)=>s+Number(r.total_amount||0),0);
        const paidAmt  = rows.filter(r=>r.status==="paid").reduce((s,r)=>s+Number(r.total_amount||0),0);
        const pendAmt  = rows.filter(r=>r.status==="pending").reduce((s,r)=>s+Number(r.total_amount||0),0);
        const fmtKES=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(2)}K`:`KES ${n.toFixed(0)}`;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}}>
            {[
              {label:"Total Value",val:fmtKES(totalAmt),bg:"#c0392b"},
              {label:"Paid Amount",val:fmtKES(paidAmt),bg:"#0e6655"},
              {label:"Pending Amount",val:fmtKES(pendAmt),bg:"#7d6608"},
              {label:"Record Count",val:rows.length,bg:"#6c3483"},
              {label:"Pending Approval",val:rows.filter(r=>r.status==="pending").length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:18,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap" as const,gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#0f766e,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <DollarSign style={{width:21,height:21,color:"#fff"}}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:0}}>Payment Vouchers</h1>
            <p style={{fontSize:13,color:"#6b7280",margin:0}}>Expenditure authorization · {rows.length} vouchers</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportXLSX} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}><Download style={{width:13,height:13}}/> Export</button>
          <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}><RefreshCw style={{width:13,height:13}}/> Refresh</button>
          <button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"linear-gradient(135deg,#0f766e,#0d9488)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 8px rgba(15,118,110,0.3)"}}>
            <Plus style={{width:14,height:14}}/> New Voucher
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" as const}}>
        {[{id:"all",label:"All"},{id:"pending",label:"Pending Approval"},{id:"approved",label:"Approved"},{id:"paid",label:"Paid"},{id:"rejected",label:"Rejected"}].map(f=>(
          <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?"#0f766e":"#e5e7eb"}`,background:stFilter===f.id?"#0f766e":"#fff",color:stFilter===f.id?"#fff":"#374151",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {f.label} ({rows.filter(r=>f.id==="all"||r.status===f.id).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:14}}>
        <Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search voucher number, payee, reference..."
          style={{width:"100%",padding:"10px 12px 10px 34px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:9,outline:"none",background:"#fff",boxSizing:"border-box"}}/>
      </div>

      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
              {["Voucher No","Payee","Method","Total Amount","Date","Prepared By","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?[1,2,3].map(i=>(
              <tr key={i}>{[...Array(8)].map((_,j)=><td key={j} style={{padding:"14px"}}><div style={{height:12,background:"#f3f4f6",borderRadius:4,animation:"pulse 1.5s infinite"}}/></td>)}</tr>
            )):filtered.length===0?(
              <tr><td colSpan={8} style={{padding:"60px",textAlign:"center",color:"#9ca3af",fontSize:14}}>
                <DollarSign style={{width:40,height:40,color:"#e5e7eb",margin:"0 auto 12px"}}/>
                <div style={{fontWeight:600}}>No payment vouchers yet</div>
              </td></tr>
            ):filtered.map(r=>{
              const cfg=sc(r.status);
              return(
                <tr key={r.id} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:800,color:"#0f766e",fontFamily:"monospace"}} onClick={()=>setDetail(r)}>{r.voucher_number}</td>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:"#111827"}} onClick={()=>setDetail(r)}>{r.payee_name}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}} onClick={()=>setDetail(r)}>{r.payment_method}</td>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:"#111827"}} onClick={()=>setDetail(r)}>{fmtKES(r.total_amount)}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}} onClick={()=>setDetail(r)}>{r.voucher_date?new Date(r.voucher_date).toLocaleDateString("en-KE"):"—"}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}} onClick={()=>setDetail(r)}>{r.prepared_by_name||"—"}</td>
                  <td style={{padding:"12px 14px"}} onClick={()=>setDetail(r)}><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span></td>
                  <td style={{padding:"12px 14px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap" as const}}>
                      <button onClick={()=>setPrint(r)} style={{padding:"4px 8px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:5,cursor:"pointer",lineHeight:0}}><Printer style={{width:11,height:11,color:"#6b7280"}}/></button>
                      {canApprove&&r.status==="pending"&&<>
                        <button onClick={()=>approve(r)} style={{padding:"4px 8px",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:5,cursor:"pointer",lineHeight:0}}><CheckCircle style={{width:11,height:11,color:"#15803d"}}/></button>
                        <button onClick={()=>reject_(r)} style={{padding:"4px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer",lineHeight:0}}><XCircle style={{width:11,height:11,color:"#dc2626"}}/></button>
                      </>}
                      {canApprove&&r.status==="approved"&&<button onClick={()=>markPaid(r)} style={{padding:"4px 9px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700,color:"#1d4ed8"}}>Mark Paid</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Voucher Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(780px,100%)",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"14px 14px 0 0",display:"flex",gap:10,alignItems:"center",position:"sticky",top:0,zIndex:1}}>
              <DollarSign style={{width:16,height:16,color:"#fff"}}/><span style={{fontSize:15,fontWeight:800,color:"#fff",flex:1}}>New Payment Voucher</span>
              <button onClick={()=>setShowNew(false)} style={{background:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              {/* Payee section */}
              <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:9,padding:14}}>
                <div style={{fontSize:13,fontWeight:800,color:"#374151",marginBottom:12}}>PAYEE DETAILS</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div><LBL>Payee Type</LBL>
                    <select value={form.payee_type} onChange={e=>{setForm(p=>({...p,payee_type:e.target.value,supplier_id:""}));}} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}>
                      <option value="supplier">Supplier / Vendor</option>
                      <option value="staff">Staff Member</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {form.payee_type==="supplier"?(
                    <div style={{gridColumn:"span 2"}}><LBL>Select Supplier</LBL>
                      <select value={form.supplier_name||form.supplier_id||"—"} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setForm(p=>({...p,supplier_id:e.target.value,payee_name:s?.name||"",bank_name:s?.bank_name||"",account_number:s?.account_number||""}));}} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}>
                        <option value="">Select supplier...</option>
                        {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  ):(
                    <div style={{gridColumn:"span 2"}}><LBL>Payee Name *</LBL>{INP(form.payee_name,v=>setForm(p=>({...p,payee_name:v})),"Full name")}</div>
                  )}
                  <div><LBL>Voucher Date</LBL>{INP(form.voucher_date,v=>setForm(p=>({...p,voucher_date:v})),"","date")}</div>
                  <div><LBL>Payment Method</LBL>
                    <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}>
                      {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><LBL>Reference No.</LBL>{INP(form.reference,v=>setForm(p=>({...p,reference:v})),"LPO/Contract/Invoice ref")}</div>
                  <div><LBL>Bank Name</LBL>{INP(form.bank_name,v=>setForm(p=>({...p,bank_name:v})),"Bank name")}</div>
                  <div><LBL>Account Number</LBL>{INP(form.account_number,v=>setForm(p=>({...p,account_number:v})),"Account number")}</div>
                  <div><LBL>Expense Account</LBL>
                    <select value={form.expense_account} onChange={e=>setForm(p=>({...p,expense_account:e.target.value}))} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}>
                      {EXPENSE_ACCOUNTS.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div style={{gridColumn:"span 3"}}><LBL>Description / Purpose</LBL>
                    <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} placeholder="Payment description and purpose..."
                      style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#374151",marginBottom:8}}>LINE ITEMS</div>
                <div style={{border:"1.5px solid #e5e7eb",borderRadius:9,overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f9fafb"}}>
                        {["Description *","Qty","Unit Price (KES)","Amount (KES)","Account",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {form.line_items.map((l,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"5px 6px"}}><input value={l.description} onChange={e=>updLine(i,"description",e.target.value)} placeholder="Item description..." style={{width:220,padding:"6px 8px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"5px 6px"}}><input type="number" value={l.qty} onChange={e=>updLine(i,"qty",e.target.value)} min={0} style={{width:60,padding:"6px 8px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"5px 6px"}}><input type="number" value={l.unit_price} onChange={e=>updLine(i,"unit_price",e.target.value)} min={0} placeholder="0.00" style={{width:110,padding:"6px 8px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}/></td>
                          <td style={{padding:"5px 6px",fontWeight:700,color:"#111827",fontSize:13,minWidth:100}}>{(Number(l.qty||1)*Number(l.unit_price||0)).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
                          <td style={{padding:"5px 6px"}}>
                            <select value={l.account} onChange={e=>updLine(i,"account",e.target.value)} style={{padding:"6px 8px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:5,outline:"none",maxWidth:180}}>
                              <option value="">Select...</option>
                              {EXPENSE_ACCOUNTS.map(a=><option key={a} value={a}>{a}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"5px 6px"}}>{form.line_items.length>1&&<button onClick={()=>setForm(p=>({...p,line_items:p.line_items.filter((_,j)=>j!==i)}))} style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer",padding:"4px 6px",lineHeight:0}}><X style={{width:10,height:10,color:"#dc2626"}}/></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f9fafb",borderTop:"1px solid #e5e7eb"}}>
                    <button onClick={()=>setForm(p=>({...p,line_items:[...p.line_items,emptyLine()]}))} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,color:"#1d4ed8"}}>
                      <Plus style={{width:11,height:11}}/> Add Line
                    </button>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,color:"#6b7280"}}>TOTAL AMOUNT</div>
                      <div style={{fontSize:20,fontWeight:900,color:"#111827"}}>{fmtKES(lineTotal(form.line_items))}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
                <button onClick={()=>setShowNew(false)} style={{padding:"9px 18px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 22px",background:"linear-gradient(135deg,#0f766e,#0d9488)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800}}>
                  {saving?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Save style={{width:12,height:12}}/>} {saving?"Saving...":"Submit Voucher"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail side panel */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,display:"flex",justifyContent:"flex-end"}} onClick={()=>setDetail(null)}>
          <div style={{width:"min(480px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",gap:8,alignItems:"center"}}>
              <DollarSign style={{width:14,height:14,color:"#fff"}}/><span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>{detail.voucher_number}</span>
              <button onClick={()=>{setPrint(detail);setDetail(null);}} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"#e2e8f0",border:"1px solid rgba(255,255,255,0.25)",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700,color:"#fff"}}><Printer style={{width:9,height:9}}/> Print</button>
              <button onClick={()=>setDetail(null)} style={{background:"#e2e8f0",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sc(detail.status).bg,color:sc(detail.status).color,display:"inline-block"}}>{sc(detail.status).label}</span>
              {[["Payee",detail.payee_name],["Payment Method",detail.payment_method],["Bank",detail.bank_name||"—"],["Account",detail.account_number||"—"],["Reference",detail.reference||"—"],["Expense Account",detail.expense_account||"—"],["Voucher Date",fmtDate(detail.voucher_date)],["Total Amount",fmtKES(detail.total_amount)],["Prepared By",detail.prepared_by_name||"—"],["Approved By",detail.approved_by_name||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f9fafb"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827",textAlign:"right",maxWidth:"60%"}}>{v}</span>
                </div>
              ))}
              {detail.description&&<div><div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",marginBottom:5}}>Description</div><p style={{fontSize:14,color:"#374151",lineHeight:1.7,margin:0}}>{detail.description}</p></div>}
              {detail.line_items?.length>0&&<div>
                <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",marginBottom:8}}>Line Items</div>
                {detail.line_items.map((l:any,i:number)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px dashed #f3f4f6",fontSize:13}}>
                    <span style={{color:"#374151"}}>{l.description}</span>
                    <span style={{fontWeight:700,color:"#111827"}}>{fmtKES(Number(l.qty||1)*Number(l.unit_price||l.amount||0))}</span>
                  </div>
                ))}
              </div>}
              {canApprove&&detail.status==="pending"&&(
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>{approve(detail);setDetail(null);}} style={{flex:1,padding:"10px",background:"#15803d",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><CheckCircle style={{width:14,height:14}}/> Approve</button>
                  <button onClick={()=>{reject_(detail);setDetail(null);}} style={{flex:1,padding:"10px",background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>Reject</button>
                </div>
              )}
              {canApprove&&detail.status==="approved"&&<button onClick={()=>{markPaid(detail);setDetail(null);}} style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#0f766e,#0d9488)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800}}>Mark as Paid</button>}
            </div>
          </div>
        </div>
      )}

      {/* Print */}
      {print&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"min(760px,100%)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e5e7eb"}}>
              <span style={{fontSize:13,fontWeight:700}}>Payment Voucher</span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>printPaymentVoucher(viewVoucher, {
                    hospitalName: getSetting('hospital_name','Embu Level 5 Hospital'),
                    sysName: getSetting('system_name','EL5 MediProcure'),
                    docFooter: getSetting('doc_footer','Embu Level 5 Hospital · Embu County Government'),
                    currencySymbol: getSetting('currency_symbol','KES'),
      logoUrl:         getSetting('logo_url') || getSetting('system_logo_url') || '',
      hospitalAddress: getSetting('hospital_address','Embu Town, Embu County, Kenya'),
      hospitalPhone:   getSetting('hospital_phone','+254 060 000000'),
      hospitalEmail:   getSetting('hospital_email','info@embu.health.go.ke'),
                    printFont: getSetting('print_font','Times New Roman'),
                    showStamp: getSetting('show_stamp','true') === 'true',
                  })} style={{padding:"6px 14px",background:"#15803d",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5}}><Printer style={{width:11,height:11}}/> Print</button>
                <button onClick={()=>setPrint(null)} style={{background:"#f3f4f6",border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",lineHeight:0}}><X style={{width:13,height:13}}/></button>
              </div>
            </div>
            <div style={{padding:24,fontFamily:"serif",fontSize:12}}>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:10,paddingBottom:10,borderBottom:"2px solid #111"}}>
                <img src={logo} alt="logo" style={{width:65,height:65,objectFit:"contain"}}/>
                <div>
                  <div style={{fontSize:14,fontWeight:900,textTransform:"uppercase"}}>Embu County Government</div>
                  <div style={{fontSize:12,fontWeight:700}}>Embu Level 5 Hospital</div>
                  <div style={{fontSize:10}}>P.O. Box 1 – 60100, Embu, Kenya</div>
                </div>
                <div style={{marginLeft:"auto",textAlign:"right"}}>
                  <div style={{fontSize:16,fontWeight:900,textTransform:"uppercase"}}>PAYMENT VOUCHER</div>
                  <div style={{fontSize:12,fontWeight:700,marginTop:3}}>Voucher No: {print.voucher_number}</div>
                  <div style={{fontSize:10}}>Date: {fmtDate(print.voucher_date)}</div>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:10,fontSize:11}}>
                <tbody>
                  {[["Pay to",print.payee_name],["Payment Method",print.payment_method],["Bank / Branch",print.bank_name||"—"],["Account No.",print.account_number||"—"],["Reference",print.reference||"—"],["Expense Account",print.expense_account||"—"],["Description",print.description||"—"]].map(([l,v])=>(
                    <tr key={l}><td style={{padding:"4px 8px",border:"1px solid #999",fontWeight:700,width:160}}>{l}:</td><td style={{padding:"4px 8px",border:"1px solid #999"}}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#f3f4f6"}}>{["#","Description","Qty","Unit Price","Amount (KES)","Account"].map(h=><th key={h} style={{padding:"6px 8px",border:"1px solid #999",textAlign:"left",fontWeight:700}}>{h}</th>)}</tr></thead>
                <tbody>
                  {(print.line_items||[]).map((l:any,i:number)=>(
                    <tr key={i}><td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"center"}}>{i+1}</td><td style={{padding:"5px 8px",border:"1px solid #ccc"}}>{l.description}</td><td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"right"}}>{l.qty||1}</td><td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"right"}}>{Number(l.unit_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td><td style={{padding:"5px 8px",border:"1px solid #ccc",textAlign:"right",fontWeight:700}}>{(Number(l.qty||1)*Number(l.unit_price||0)).toLocaleString("en-KE",{minimumFractionDigits:2})}</td><td style={{padding:"5px 8px",border:"1px solid #ccc",fontSize:9}}>{l.account||"—"}</td></tr>
                  ))}
                  <tr style={{fontWeight:900,background:"#f3f4f6"}}><td colSpan={4} style={{padding:"6px 8px",border:"1px solid #999",textAlign:"right"}}>TOTAL:</td><td style={{padding:"6px 8px",border:"1px solid #999",textAlign:"right"}}>{fmtKES(print.total_amount||0)}</td><td style={{border:"1px solid #999"}}/></tr>
                </tbody>
              </table>
              <div style={{marginTop:8,padding:"8px",border:"1px solid #999",fontWeight:700}}>Amount in Words: {print.total_amount?`${fmtKES(print.total_amount)} only`:"—"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:24}}>
                {[["Prepared by",print.prepared_by_name||""],["Approved by",print.approved_by_name||""],["Received by",""]].map(([l,n])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    {n&&<div style={{fontSize:11,fontWeight:700,marginBottom:4}}>{n}</div>}
                    <div style={{height:48,borderBottom:"1px solid #000",marginBottom:4}}/>
                    <div style={{fontSize:10,fontWeight:700}}>{l}</div>
                    <div style={{fontSize:10,color:"#6b7280"}}>Name / Signature / Date</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
