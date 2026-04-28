import { useState, useEffect, useCallback } from "react";
import { WorkflowEngine } from "@/engines/workflow/WorkflowEngine";
import { ValidationEngine } from "@/engines/validation/ValidationEngine";
import { PrintEngine } from "@/engines/print/PrintEngine";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PaymentVoucher {
  id: string;
  voucher_number?: string;
  payee?: string;
  payee_account?: string;
  bank_name?: string;
  total_amount?: number;
  status: string;
  payment_method?: string;
  due_date?: string;
  description?: string;
  approved_by?: string;
  created_at: string;
  po_reference?: string;
  invoice_reference?: string;
  gl_account?: string;
  vote_head?: string;
  currency?: string;
}

const STATUS_COLORS: Record<string,string> = {
  draft:"#6b7280", pending:"#f97316", approved:"#22c55e",
  paid:"#059669", rejected:"#ef4444", cancelled:"#ef4444",
};

function fmt(n: number) { return `KES ${(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}) : "-"; }

function statusBadge(status: string) {
  const color = STATUS_COLORS[status] || "#6b7280";
  return <span style={{padding:"2px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}33`,textTransform:"uppercase",letterSpacing:"0.04em"}}>{status}</span>;
}

const METHODS = ["bank_transfer","cheque","cash","mpesa","rtgs","swift"];
const VOTE_HEADS = ["2210100","2210200","2210300","2211100","3110200","3110300","2710200","2640400"];

export default function PaymentVouchersPage() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewVoucher, setViewVoucher] = useState<PaymentVoucher|null>(null);
  const [form, setForm] = useState({
    payee:"", payee_account:"", bank_name:"", total_amount:"",
    payment_method:"bank_transfer", due_date:"", description:"",
    po_reference:"", invoice_reference:"", gl_account:"", vote_head:"",
    currency:"KES",
  });

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
    const { data, error } = await supabase
      .from("payment_vouchers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows=(data||[]) as PaymentVoucher[]; setVouchers(rows);
    pageCache.set("payment_vouchers",rows);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("payment_vouchers"); if(cached) setVouchers(cached as PaymentVoucher[]);
      console.error("[PaymentVouchers]",e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  useEffect(() => {
    const ch = supabase.channel("payment_vouchers_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_vouchers" }, fetchVouchers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchVouchers]);

  async function createVoucher() {
    if (!form.payee || !form.total_amount) {
      toast({ title: "Payee and amount are required", variant: "destructive" }); return;
    }
    setSaving(true);
    const vNum = `PV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const { error } = await supabase.from("payment_vouchers").insert({
      voucher_number: vNum,
      payee: form.payee,
      payee_account: form.payee_account,
      bank_name: form.bank_name,
      total_amount: parseFloat(form.total_amount),
      payment_method: form.payment_method,
      due_date: form.due_date || null,
      description: form.description,
      po_reference: form.po_reference,
      invoice_reference: form.invoice_reference,
      gl_account: form.gl_account,
      vote_head: form.vote_head,
      currency: form.currency,
      status: "draft",
    } as any);
    setSaving(false);
    if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
    toast({ title: `- Voucher ${vNum} created!` });
    setShowNew(false);
    setForm({ payee:"", payee_account:"", bank_name:"", total_amount:"", payment_method:"bank_transfer", due_date:"", description:"", po_reference:"", invoice_reference:"", gl_account:"", vote_head:"", currency:"KES" });
    fetchVouchers();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("payment_vouchers").update({ status } as any).eq("id", id);
    if (!error) { toast({ title: `- Status updated to ${status}` }); fetchVouchers(); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function bulkApprove() {
    if (!selected.length) return;
    for (const id of selected) await supabase.from("payment_vouchers").update({ status: "approved" } as any).eq("id", id);
    toast({ title: `- ${selected.length} vouchers approved!` });
    setSelected([]); fetchVouchers();
  }

  function exportCSV() {
    const rows = ["Voucher#,Payee,Amount,Method,Status,Vote Head,GL Account,Due Date,Created",
      ...filtered.map(v => `${v.voucher_number||""},${v.payee||""},${v.total_amount||0},${v.payment_method||""},${v.status},${v.vote_head||""},${v.gl_account||""},${fmtDate(v.due_date||"")},${fmtDate(v.created_at)}`)
    ];
    const blob = new Blob([rows.join("\n")], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="payment_vouchers.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "- Exported!" });
  }

  function printVoucher(v: PaymentVoucher) {
    const w = window.open("","_blank","width=800,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payment Voucher ${v.voucher_number}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a}h1{color:#0e7490;font-size:18px;border-bottom:2px solid #0e7490;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 12px;border:1px solid #e5e7eb;font-size:13px}.label{background:#f8fafc;font-weight:700;width:35%}.header{background:#0e2a4a;color:#fff;padding:12px 20px;margin:-40px -40px 20px;display:flex;justify-content:space-between}.total{font-size:20px;font-weight:800;color:#059669}.footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center}.sig-line{border-top:1px solid #374151;margin-top:40px;font-size:11px;color:#6b7280}</style>
    </head><body>
    <div class="header"><div><strong style="font-size:18px">EL5 MediProcure v5.8</strong><br/><span style="font-size:11px">Embu Level 5 Hospital - ProcurBosse</span></div><div style="text-align:right"><strong>PAYMENT VOUCHER</strong><br/>${v.voucher_number||""}</div></div>
    <table>
    <tr><td class="label">Payee</td><td><strong>${v.payee||""}</strong></td><td class="label">Date</td><td>${fmtDate(v.created_at)}</td></tr>
    <tr><td class="label">Bank / Account</td><td>${v.bank_name||""} - ${v.payee_account||""}</td><td class="label">Due Date</td><td>${fmtDate(v.due_date||"")}</td></tr>
    <tr><td class="label">Payment Method</td><td style="text-transform:capitalize">${v.payment_method||""}</td><td class="label">Status</td><td><strong>${v.status.toUpperCase()}</strong></td></tr>
    <tr><td class="label">PO Reference</td><td>${v.po_reference||"-"}</td><td class="label">Invoice Ref</td><td>${v.invoice_reference||"-"}</td></tr>
    <tr><td class="label">GL Account</td><td>${v.gl_account||"-"}</td><td class="label">Vote Head</td><td>${v.vote_head||"-"}</td></tr>
    <tr><td class="label">Description</td><td colspan="3">${v.description||""}</td></tr>
    <tr><td class="label">TOTAL AMOUNT</td><td colspan="3" class="total">${fmt(v.total_amount||0)}</td></tr>
    </table>
    <div class="footer">
    <div><div class="sig-line">Prepared By</div><div style="font-size:11px;color:#6b7280;margin-top:4px">Signature / Date</div></div>
    <div><div class="sig-line">Approved By</div><div style="font-size:11px;color:#6b7280;margin-top:4px">Signature / Date</div></div>
    <div><div class="sig-line">Finance Officer</div><div style="font-size:11px;color:#6b7280;margin-top:4px">Signature / Date</div></div>
    </div>
    <div style="margin-top:30px;font-size:10px;color:#9ca3af;text-align:center">Embu County Government - Embu Level 5 Hospital - Health Procurement Division - ProcurBosse ERP v5.8</div>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  const filtered = vouchers.filter(v => {
    const matchSearch = !search || [v.voucher_number,v.payee,v.description,v.invoice_reference,v.po_reference].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = filtered.reduce((s,v) => s + (v.total_amount||0), 0);
  const approvedTotal = vouchers.filter(v => v.status === "approved").reduce((s,v) => s + (v.total_amount||0), 0);

  // styles
  const card: React.CSSProperties = {background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",padding:"20px 24px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"};
  const inp: React.CSSProperties = {width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",color:"#374151",background:"#fafafa"};
  const th: React.CSSProperties = {fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 14px",borderBottom:"2px solid #f1f5f9",background:"#f8fafc",textAlign:"left"};
  const td: React.CSSProperties = {fontSize:13,color:"#374151",padding:"11px 14px",borderBottom:"1px solid #f8fafc"};

  return (
    <div style={{padding:"20px 24px",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:1400,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0e7490,#0c6380)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>-</div>
            <div>
              <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#0f172a",letterSpacing:"-0.02em"}}>Payment Vouchers</h1>
              <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Create - Approve - Print - Export - GL Sync - EL5 MediProcure v5.8</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          {selected.length > 0 && (
            <button onClick={bulkApprove} style={{padding:"9px 16px",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              - Approve {selected.length} Selected
            </button>
          )}
          <button onClick={exportCSV} style={{padding:"9px 16px",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",color:"#374151"}}>- Export CSV</button>
          <button onClick={() => setShowNew(v => !v)} style={{padding:"9px 18px",background:"linear-gradient(135deg,#0e7490,#0c6380)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(14,116,144,0.3)"}}>
            {showNew ? "- Cancel" : "+ New Voucher"}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:24}}>
        {[
          {label:"Total Vouchers",value:vouchers.length,color:"#3b82f6",icon:"-"},
          {label:"Pending Approval",value:vouchers.filter(v=>v.status==="pending").length,color:"#f97316",icon:"-"},
          {label:"Approved Total",value:fmt(approvedTotal),color:"#22c55e",icon:"-"},
          {label:"Paid This Period",value:vouchers.filter(v=>v.status==="paid").length,color:"#059669",icon:"-"},
          {label:"Filtered Amount",value:fmt(totalAmount),color:"#8b5cf6",icon:"-"},
        ].map((k,i) => (
          <div key={i} style={{...card,borderLeft:`4px solid ${k.color}`,padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{loading?"-":k.value}</div>
              </div>
              <div style={{fontSize:22}}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* New Voucher Form */}
      {showNew && (
        <div style={{...card,marginBottom:24,border:"1.5px solid #bae6fd"}}>
          <div style={{fontWeight:800,fontSize:16,color:"#0f172a",marginBottom:20}}>- New Payment Voucher</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[
              {label:"Payee / Supplier *",key:"payee",type:"text",placeholder:"Supplier or individual name"},
              {label:"Bank Name",key:"bank_name",type:"text",placeholder:"e.g. Equity Bank Kenya"},
              {label:"Account Number",key:"payee_account",type:"text",placeholder:"Bank account number"},
              {label:"Amount (KES) *",key:"total_amount",type:"number",placeholder:"0.00"},
              {label:"Payment Method",key:"payment_method",type:"select",options:METHODS},
              {label:"Currency",key:"currency",type:"select",options:["KES","USD","EUR","GBP"]},
              {label:"PO Reference",key:"po_reference",type:"text",placeholder:"PO-2024-XXXXX"},
              {label:"Invoice Reference",key:"invoice_reference",type:"text",placeholder:"INV-XXXXX"},
              {label:"Due Date",key:"due_date",type:"date",placeholder:""},
              {label:"GL Account",key:"gl_account",type:"text",placeholder:"e.g. 2210100"},
              {label:"Vote Head",key:"vote_head",type:"select",options:["", ...VOTE_HEADS]},
            ].map((f,i) => (
              <div key={i}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>{f.label}</label>
                {f.type==="select" ? (
                  <select value={(form as any)[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} style={inp}>
                    {f.options!.map(o => <option key={o} value={o}>{o || "- Select -"}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} style={inp} placeholder={f.placeholder} />
                )}
              </div>
            ))}
            <div style={{gridColumn:"span 3"}}>
              <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Description / Narration</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p,description:e.target.value}))} style={{...inp,height:72,resize:"vertical"}} placeholder="Payment for goods/services as per PO/invoice-" />
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
            <button onClick={() => setShowNew(false)} style={{padding:"9px 18px",background:"#f1f5f9",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151"}}>Cancel</button>
            <button onClick={createVoucher} disabled={saving} style={{padding:"9px 20px",background:"linear-gradient(135deg,#0e7490,#0c6380)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
              {saving ? "- Saving-" : "- Create Voucher"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{...card,marginBottom:20,padding:"14px 20px"}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="- Search voucher, payee, reference-" style={{...inp,maxWidth:320,flex:1}} />
          <div style={{display:"flex",gap:6}}>
            {["all","draft","pending","approved","paid","rejected"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{padding:"6px 14px",borderRadius:16,fontSize:12,fontWeight:statusFilter===s?700:500,background:statusFilter===s?(STATUS_COLORS[s]||"#374151")+"18":"transparent",color:statusFilter===s?(STATUS_COLORS[s]||"#374151"):"#6b7280",border:`1px solid ${statusFilter===s?(STATUS_COLORS[s]||"#e2e8f0"):"#e2e8f0"}`,cursor:"pointer",textTransform:"capitalize"}}>
                {s}{s!=="all" && ` (${vouchers.filter(v=>v.status===s).length})`}
              </button>
            ))}
          </div>
          <div style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{filtered.length} vouchers - {fmt(totalAmount)}</div>
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {loading ? (
          <div style={{textAlign:"center",padding:"48px",color:"#9ca3af"}}>Loading payment vouchers-</div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{...th,width:40}}><input type="checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(v=>v.id) : [])} checked={selected.length===filtered.length&&filtered.length>0} /></th>
                  {["Voucher #","Payee","Amount","Method","Vote Head","GL Account","Due Date","Status","Actions"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} style={{transition:"background 0.15s"}}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background=""}>
                    <td style={td}><input type="checkbox" checked={selected.includes(v.id)} onChange={e => setSelected(p => e.target.checked ? [...p,v.id] : p.filter(i=>i!==v.id))} /></td>
                    <td style={td}><span style={{fontWeight:700,color:"#0e7490",fontFamily:"monospace",cursor:"pointer"}} onClick={() => setViewVoucher(v)}>{v.voucher_number||v.id.slice(-8)}</span></td>
                    <td style={td}>{v.payee||"-"}</td>
                    <td style={{...td,fontWeight:700,color:"#059669"}}>{fmt(v.total_amount||0)}</td>
                    <td style={{...td,textTransform:"capitalize"}}>{v.payment_method||"-"}</td>
                    <td style={{...td,fontFamily:"monospace",fontSize:12}}>{v.vote_head||"-"}</td>
                    <td style={{...td,fontFamily:"monospace",fontSize:12}}>{v.gl_account||"-"}</td>
                    <td style={td}>{v.due_date?fmtDate(v.due_date):"-"}</td>
                    <td style={td}>{statusBadge(v.status)}</td>
                    <td style={td}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <button onClick={() => setViewVoucher(v)} style={{padding:"4px 8px",background:"#e0f2fe",color:"#0e7490",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>View</button>
                        <button onClick={() => printVoucher(v)} style={{padding:"4px 8px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>- Print</button>
                        {v.status==="draft" && <button onClick={() => updateStatus(v.id,"pending")} style={{padding:"4px 8px",background:"#fff7ed",color:"#f97316",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>Submit</button>}
                        {v.status==="pending" && <button onClick={() => updateStatus(v.id,"approved")} style={{padding:"4px 8px",background:"#f0fdf4",color:"#22c55e",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>- Approve</button>}
                        {v.status==="approved" && <button onClick={() => updateStatus(v.id,"paid")} style={{padding:"4px 8px",background:"#d1fae5",color:"#059669",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>Mark Paid</button>}
                        {(v.status==="draft"||v.status==="pending") && <button onClick={() => updateStatus(v.id,"cancelled")} style={{padding:"4px 8px",background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{textAlign:"center",padding:"48px",color:"#9ca3af",fontSize:14}}>No payment vouchers found. Create one above.</div>}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewVoucher && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={() => setViewVoucher(null)}>
          <div style={{background:"#fff",borderRadius:16,padding:"32px",maxWidth:640,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}} onClick={e => e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>- {viewVoucher.voucher_number}</div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{fmtDate(viewVoucher.created_at)}</div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {statusBadge(viewVoucher.status)}
                <button onClick={() => printVoucher(viewVoucher)} style={{padding:"8px 16px",background:"linear-gradient(135deg,#0e7490,#0c6380)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>- Print</button>
                <button onClick={() => setViewVoucher(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:13,color:"#374151"}}>- Close</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {label:"Payee",value:viewVoucher.payee},
                {label:"Amount",value:fmt(viewVoucher.total_amount||0)},
                {label:"Bank",value:viewVoucher.bank_name},
                {label:"Account #",value:viewVoucher.payee_account},
                {label:"Payment Method",value:viewVoucher.payment_method},
                {label:"Due Date",value:fmtDate(viewVoucher.due_date||"")},
                {label:"PO Reference",value:viewVoucher.po_reference},
                {label:"Invoice Ref",value:viewVoucher.invoice_reference},
                {label:"GL Account",value:viewVoucher.gl_account},
                {label:"Vote Head",value:viewVoucher.vote_head},
                {label:"Currency",value:viewVoucher.currency},
              ].map((f,i) => (
                <div key={i} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{f.label}</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#0f172a"}}>{f.value||"-"}</div>
                </div>
              ))}
            </div>
            {viewVoucher.description && (
              <div style={{marginTop:16,padding:"12px 16px",background:"#fffbeb",borderRadius:8,border:"1px solid #fef3c7"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:4}}>DESCRIPTION</div>
                <div style={{fontSize:13,color:"#374151"}}>{viewVoucher.description}</div>
              </div>
            )}
            <div style={{marginTop:16,display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              {viewVoucher.status==="draft" && <button onClick={() => { updateStatus(viewVoucher.id,"pending"); setViewVoucher(null); }} style={{padding:"9px 18px",background:"#fff7ed",color:"#f97316",border:"1.5px solid #fed7aa",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit for Approval</button>}
              {viewVoucher.status==="pending" && <button onClick={() => { updateStatus(viewVoucher.id,"approved"); setViewVoucher(null); }} style={{padding:"9px 18px",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>- Approve</button>}
              {viewVoucher.status==="approved" && <button onClick={() => { updateStatus(viewVoucher.id,"paid"); setViewVoucher(null); }} style={{padding:"9px 18px",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Mark as Paid</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
