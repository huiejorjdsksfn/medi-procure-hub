/**
 * EL5 MediProcure — Payment Vouchers v10
 * Classic ERP Financial Management System UI
 */
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";
import { pageCache } from "@/lib/pageCache";

interface PaymentVoucher {
  id: string; voucher_number?: string; payee?: string; payee_account?: string; bank_name?: string;
  total_amount?: number; status: string; payment_method?: string; due_date?: string;
  description?: string; approved_by?: string; created_at: string; po_reference?: string;
  invoice_reference?: string; gl_account?: string; vote_head?: string; currency?: string;
}

const db = supabase as any;
function fmt(n: number) { return `KES ${(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtK(n: number) {
  if(n>=1000000) return `KES ${(n/1000000).toFixed(2)}M`;
  if(n>=1000) return `KES ${(n/1000).toFixed(2)}K`;
  return fmt(n);
}
function fmtDate(s: string) { if(!s) return "—"; return new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}); }

function StatusChip({ status }: { status: string }) {
  return <span style={erpStyles.statusChip(status)}>{status}</span>;
}

const METHODS = ["bank_transfer","cheque","cash","mpesa","rtgs","swift"];
const VOTE_HEADS = ["2210100","2210200","2210300","2211100","3110200","3110300","2710200","2640400"];
const GL_ACCOUNTS = [
  "1000 - Cash","2100 - Accounts Payable","5100 - Medical Supplies",
  "5200 - Pharmaceuticals","5300 - Salaries & Wages","5400 - Utilities",
  "5500 - Maintenance","6100 - Equipment","6200 - Transport",
];

export default function PaymentVouchersPage() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showLatest, setShowLatest] = useState<"all"|"latest100"|"thismonth">("all");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewVoucher, setViewVoucher] = useState<PaymentVoucher|null>(null);
  const [dateFrom, setDateFrom] = useState("2025-12-31");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({
    payee:"", payee_account:"", bank_name:"", total_amount:"",
    payment_method:"cheque", due_date:"", description:"",
    po_reference:"", invoice_reference:"", gl_account:"2100 - Accounts Payable",
    vote_head:"", currency:"KES",
  });

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from("payment_vouchers").select("*").order("created_at",{ascending:false}).limit(200);
      if(error) throw error;
      const rows = data||[];
      setVouchers(rows);
      pageCache.set("payment_vouchers", rows);
    } catch(e:any) {
      const cached = pageCache.get<any[]>("payment_vouchers");
      if(cached) setVouchers(cached);
      console.error("[PaymentVouchers]", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchVouchers(); },[fetchVouchers]);

  useEffect(()=>{
    const ch = db.channel("pv_realtime_v10")
      .on("postgres_changes",{event:"*",schema:"public",table:"payment_vouchers"},fetchVouchers)
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[fetchVouchers]);

  async function createVoucher() {
    if(!form.payee||!form.total_amount){ toast({title:"Payee and amount required",variant:"destructive"}); return; }
    setSaving(true);
    const vNum = `PV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
    const { error } = await db.from("payment_vouchers").insert({
      voucher_number:vNum, payee:form.payee, payee_account:form.payee_account,
      bank_name:form.bank_name, total_amount:parseFloat(form.total_amount),
      payment_method:form.payment_method, due_date:form.due_date||null,
      description:form.description, po_reference:form.po_reference,
      invoice_reference:form.invoice_reference, gl_account:form.gl_account,
      vote_head:form.vote_head, currency:form.currency, status:"draft",
    });
    setSaving(false);
    if(error){ toast({title:"Error: "+error.message,variant:"destructive"}); return; }
    toast({title:`✓ Voucher ${vNum} created`});
    setShowNew(false);
    setForm({payee:"",payee_account:"",bank_name:"",total_amount:"",payment_method:"cheque",due_date:"",description:"",po_reference:"",invoice_reference:"",gl_account:"2100 - Accounts Payable",vote_head:"",currency:"KES"});
    fetchVouchers();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await db.from("payment_vouchers").update({status}).eq("id",id);
    if(!error){ toast({title:`✓ Status → ${status}`}); fetchVouchers(); }
    else toast({title:"Error: "+error.message,variant:"destructive"});
  }

  async function bulkApprove() {
    if(!selected.length) return;
    for(const id of selected) await db.from("payment_vouchers").update({status:"approved"}).eq("id",id);
    toast({title:`✓ ${selected.length} vouchers approved`});
    setSelected([]); fetchVouchers();
  }

  function printVoucher(v: PaymentVoucher) {
    const w = window.open("","_blank","width=800,height=600");
    if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payment Voucher ${v.voucher_number}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:12px}
      .hdr{background:linear-gradient(180deg,#2a4fa3,#1a3580);color:#fff;padding:10px 16px;margin:-30px -30px 20px;display:flex;justify-content:space-between;align-items:center}
      h2{margin:0;font-size:16px} table{width:100%;border-collapse:collapse;margin-top:12px}
      td{padding:6px 10px;border:1px solid #ccc;font-size:12px}
      .lbl{background:#f5f5f5;font-weight:700;width:30%;color:#555}
      .tot{font-size:18px;font-weight:800;color:#007700}
      .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px;text-align:center}
      .sig{border-top:1px solid #555;padding-top:6px;font-size:10px;color:#666;margin-top:40px}
    </style></head><body>
    <div class="hdr">
      <div><h2>EL5 MediProcure</h2><div style="font-size:10px;opacity:.8">Embu Level 5 Hospital — Financial Management System</div></div>
      <div style="text-align:right"><strong>PAYMENT VOUCHER</strong><br/><span style="font-size:14px">${v.voucher_number||""}</span></div>
    </div>
    <table>
      <tr><td class="lbl">Payee</td><td><strong>${v.payee||""}</strong></td><td class="lbl">Date</td><td>${fmtDate(v.created_at)}</td></tr>
      <tr><td class="lbl">Bank / Account No.</td><td>${v.bank_name||""} – ${v.payee_account||""}</td><td class="lbl">Due Date</td><td>${fmtDate(v.due_date||"")}</td></tr>
      <tr><td class="lbl">Payment Method</td><td style="text-transform:capitalize">${v.payment_method||""}</td><td class="lbl">Status</td><td><strong>${v.status.toUpperCase()}</strong></td></tr>
      <tr><td class="lbl">PO Reference</td><td>${v.po_reference||"—"}</td><td class="lbl">Invoice Ref</td><td>${v.invoice_reference||"—"}</td></tr>
      <tr><td class="lbl">GL Account</td><td>${v.gl_account||"—"}</td><td class="lbl">Vote Head</td><td>${v.vote_head||"—"}</td></tr>
      <tr><td class="lbl">Description</td><td colspan="3">${v.description||""}</td></tr>
      <tr><td class="lbl">TOTAL AMOUNT</td><td colspan="3" class="tot">${fmt(v.total_amount||0)}</td></tr>
    </table>
    <div class="sigs">
      <div><div class="sig">Prepared By / Date</div></div>
      <div><div class="sig">Approved By / Date</div></div>
      <div><div class="sig">Finance Officer / Date</div></div>
    </div>
    <div style="margin-top:20px;font-size:9px;color:#aaa;text-align:center">Embu County Government · Embu Level 5 Hospital · ProcurBosse ERP v10</div>
    </body></html>`);
    w.document.close(); setTimeout(()=>w.print(), 400);
  }

  function exportCSV() {
    const rows = ["Voucher No,Payee,Amount,Method,Status,GL Account,Vote Head,Due Date,Approved By,Created",
      ...filtered.map(v=>`${v.voucher_number||""},${v.payee||""},${v.total_amount||0},${v.payment_method||""},${v.status},${v.gl_account||""},${v.vote_head||""},${fmtDate(v.due_date||"")},${v.approved_by||""},${fmtDate(v.created_at)}`)
    ];
    const blob = new Blob([rows.join("\n")],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="payment_vouchers.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({title:"✓ Exported"});
  }

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !search || [v.voucher_number,v.payee,v.description,v.invoice_reference,v.po_reference].some(f=>f?.toLowerCase().includes(q));
    const matchStatus = statusFilter==="ALL" || v.status===statusFilter.toLowerCase();
    let matchDate = true;
    if(showLatest==="thismonth") {
      const d = new Date(v.created_at); const now = new Date();
      matchDate = d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }
    return matchSearch && matchStatus && matchDate;
  }).slice(0, showLatest==="latest100" ? 100 : undefined);

  const totalFiltered = filtered.reduce((s,v)=>s+(v.total_amount||0),0);
  const totalApproved = vouchers.filter(v=>v.status==="approved"||v.status==="paid").reduce((s,v)=>s+(v.total_amount||0),0);
  const inp: React.CSSProperties = { ...erpStyles.inp, width:"100%", boxSizing:"border-box" };

  // KPI stats
  const kpiData = [
    { label:"TOTAL PAYMENTS", value:fmtK(totalApproved) },
    { label:"TOTAL RECEIPTS", value:"KES 0.00" },
    { label:"NET BALANCE", value:fmtK(totalApproved) },
    { label:"RECORD COUNT", value:filtered.length },
    { label:"BUDGET ALLOC.", value:"KES 0.00" },
  ];

  return (
    <div style={{ background:"#f0f0f0", minHeight:"100vh", fontFamily:ERP.fontFamily, fontSize:12 }}>

      {/* Title Bar */}
      <div style={{ background:ERP.titleBar, color:"#fff", padding:"5px 10px", fontSize:12, fontWeight:700, fontFamily:ERP.fontFamily, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>💳</span>
          <div>
            <div>EL5 MediProcure — Financial Management System  [Payment Vouchers]</div>
            <div style={{ fontSize:10, fontWeight:400, opacity:.85 }}>Embu Level 5 Hospital</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {["0","1","r"].map(c=><div key={c} style={{ width:16,height:14,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#333",fontWeight:700 }}>{c}</div>)}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background:"#f5f5f5", borderBottom:"1px solid #ccc", padding:"2px 8px", display:"flex", gap:16, fontSize:12 }}>
        {["File","View","Reports","Help"].map(m=>(
          <span key={m} style={{ cursor:"pointer", padding:"2px 4px" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><u>{m[0]}</u>{m.slice(1)}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, padding:"5px 10px", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginRight:8 }}>
          <div style={{ width:28,height:28,background:"linear-gradient(135deg,#1a3580,#2a4fa3)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:14 }}>🏥</span>
          </div>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a3580" }}>Embu Level 5 Hospital</span>
        </div>
        <span style={{ fontSize:11, color:"#555" }}>Date:</span>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ ...erpStyles.inp, width:120 }}/>
        <span style={{ color:"#555" }}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ ...erpStyles.inp, width:120 }}/>
        <button onClick={fetchData} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          <button style={{ ...erpStyles.btn(true) }} onClick={()=>setShowNew(v=>!v)}>+ New Voucher</button>
          {selected.length>0 && <button onClick={bulkApprove} style={{ ...erpStyles.btn(true), background:"linear-gradient(180deg,#22c55e,#16a34a)", borderColor:"#16a34a" }}>✓ Approve {selected.length}</button>}
          <button onClick={exportCSV} style={erpStyles.btn(false)}>- Export</button>
          <button style={erpStyles.btn(false)}>- Print</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:"flex", borderBottom:"1px solid #aaa" }}>
        {kpiData.map((k,i)=>(
          <div key={i} style={{ flex:1, padding:"10px 16px", borderRight:i<kpiData.length-1?"1px solid #aaa":"none", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ color:"#c0392b", fontWeight:700, fontSize:11 }}>-</span>
              <span style={{ fontWeight:800, fontSize:16, color:"#1a1a1a" }}>{k.value}</span>
            </div>
            <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* New Voucher Form */}
      {showNew && (
        <div style={{ margin:"8px 8px 0", background:"#fff", border:"1px solid #ccc", padding:"12px 16px" }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>
            📝 New Payment Voucher
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { label:"Payee *", key:"payee", type:"text", placeholder:"Enter payee name" },
              { label:"Amount (KES) *", key:"total_amount", type:"number", placeholder:"0.00" },
              { label:"Bank Name", key:"bank_name", type:"text", placeholder:"" },
              { label:"Account No.", key:"payee_account", type:"text", placeholder:"" },
              { label:"PO Reference", key:"po_reference", type:"text", placeholder:"" },
              { label:"Invoice Reference", key:"invoice_reference", type:"text", placeholder:"" },
              { label:"Due Date", key:"due_date", type:"date", placeholder:"" },
              { label:"Vote Head", key:"vote_head", type:"select", options:VOTE_HEADS },
            ].map(f=>(
              <div key={f.key}>
                <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>{f.label}</label>
                {f.type==="select" ? (
                  <select value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={inp}>
                    <option value="">— Select —</option>
                    {f.options?.map(o=><option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inp}/>
                )}
              </div>
            ))}
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Payment Method</label>
              <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))} style={inp}>
                {METHODS.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1).replace("_"," ")}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>GL Account</label>
              <select value={form.gl_account} onChange={e=>setForm(p=>({...p,gl_account:e.target.value}))} style={inp}>
                {GL_ACCOUNTS.map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Description</label>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Purpose of payment..." style={inp}/>
            </div>
          </div>
          <div style={{ marginTop:10, display:"flex", gap:8 }}>
            <button onClick={createVoucher} disabled={saving} style={erpStyles.btn(true)}>
              {saving?"⏳ Saving...":"💾 Create Voucher"}
            </button>
            <button onClick={()=>setShowNew(false)} style={erpStyles.btn(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewVoucher && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", border:"2px solid #2a4fa3", width:560, maxHeight:"80vh", overflow:"auto" }}>
            <div style={{ background:ERP.titleBar, color:"#fff", padding:"6px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700 }}>Payment Voucher — {viewVoucher.voucher_number}</span>
              <button onClick={()=>setViewVoucher(null)} style={{ background:"none", border:"1px solid #fff", color:"#fff", cursor:"pointer", padding:"1px 8px", fontSize:12 }}>✕</button>
            </div>
            <div style={{ padding:16 }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                {[
                  ["Payee", viewVoucher.payee||"—", "Status", <StatusChip status={viewVoucher.status}/>],
                  ["Bank / Account", `${viewVoucher.bank_name||""}  ${viewVoucher.payee_account||""}`, "Method", viewVoucher.payment_method||"—"],
                  ["GL Account", viewVoucher.gl_account||"—", "Vote Head", viewVoucher.vote_head||"—"],
                  ["PO Ref", viewVoucher.po_reference||"—", "Invoice Ref", viewVoucher.invoice_reference||"—"],
                  ["Due Date", fmtDate(viewVoucher.due_date||""), "Created", fmtDate(viewVoucher.created_at)],
                  ["Description", viewVoucher.description||"—", "Approved By", viewVoucher.approved_by||"—"],
                ].map((row,i)=>(
                  <tr key={i} style={{ background: i%2===0?"#f9f9f9":"#fff" }}>
                    <td style={{ ...erpStyles.gridTd, fontWeight:700, color:"#555", width:"20%", fontSize:11 }}>{row[0]}</td>
                    <td style={{ ...erpStyles.gridTd, width:"30%" }}>{row[1]}</td>
                    <td style={{ ...erpStyles.gridTd, fontWeight:700, color:"#555", width:"20%", fontSize:11 }}>{row[2]}</td>
                    <td style={{ ...erpStyles.gridTd, width:"30%" }}>{row[3]}</td>
                  </tr>
                ))}
                <tr style={{ background:"#f0f7f0" }}>
                  <td style={{ ...erpStyles.gridTd, fontWeight:700, color:"#555" }}>TOTAL AMOUNT</td>
                  <td colSpan={3} style={{ ...erpStyles.gridTd, fontWeight:800, fontSize:18, color:"#007700" }}>{fmt(viewVoucher.total_amount||0)}</td>
                </tr>
              </table>
              <div style={{ marginTop:12, display:"flex", gap:8 }}>
                <button onClick={()=>printVoucher(viewVoucher)} style={erpStyles.btn(true)}>🖨 Print</button>
                {viewVoucher.status==="pending" && <>
                  <button onClick={()=>{ updateStatus(viewVoucher.id,"approved"); setViewVoucher(null); }} style={{ ...erpStyles.btn(true), background:"linear-gradient(180deg,#22c55e,#16a34a)", borderColor:"#16a34a" }}>✓ Approve</button>
                  <button onClick={()=>{ updateStatus(viewVoucher.id,"rejected"); setViewVoucher(null); }} style={{ ...erpStyles.btn(false), color:"#cc0000" }}>✗ Reject</button>
                </>}
                <button onClick={()=>setViewVoucher(null)} style={erpStyles.btn(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div style={{ margin:"6px 8px", display:"flex", flexDirection:"column", height:"calc(100vh - 200px)" }}>
        {/* Filter Bar */}
        <div style={{ background:"#f5f5f5", border:"1px solid #ccc", padding:"5px 10px", marginBottom:4, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, fontSize:11, color:"#555" }}>Payment Vouchers — Filter & Extract</span>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:11 }}>Search:</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter records..." style={{ ...erpStyles.inp, width:180, fontSize:11 }}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:11 }}>Status:</span>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...erpStyles.inp, fontSize:11 }}>
              {["ALL","DRAFT","PENDING","APPROVED","PAID","REJECTED"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {(["all","latest100","thismonth"] as const).map(v=>(
              <label key={v} style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, cursor:"pointer" }}>
                <input type="radio" checked={showLatest===v} onChange={()=>setShowLatest(v)}/>
                {v==="all"?"All Records":v==="latest100"?"Latest 100":"This Month"}
              </label>
            ))}
          </div>
          <button onClick={exportCSV} style={{ ...erpStyles.btn(true), marginLeft:"auto" }}>Extract →</button>
        </div>

        {/* Data Grid */}
        <div style={{ flex:1, overflow:"auto", background:"#fff", border:"1px solid #ccc" }}>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#888" }}>Loading payment vouchers...</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                <tr>
                  <th style={{ ...erpStyles.gridTh, width:32 }}>
                    <input type="checkbox" checked={selected.length===filtered.length && filtered.length>0}
                      onChange={e=>setSelected(e.target.checked ? filtered.map(v=>v.id) : [])}/>
                  </th>
                  {["Voucher No","Payee","Method","Expense Acct","Status","Amount","Date","Approved By",""].map(h=>(
                    <th key={h} style={erpStyles.gridTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v,i)=>(
                  <tr key={v.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")}
                    onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}
                  >
                    <td style={{ ...erpStyles.gridTd, textAlign:"center" }}>
                      <input type="checkbox" checked={selected.includes(v.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,v.id]:s.filter(x=>x!==v.id))}/>
                    </td>
                    <td style={{ ...erpStyles.gridTd, color:"#2255cc", fontWeight:700, cursor:"pointer" }}
                      onClick={()=>setViewVoucher(v)}>
                      {v.voucher_number||`PV/EL5H/${new Date(v.created_at).getFullYear()}${String(new Date(v.created_at).getMonth()+1).padStart(2,"0")}/${v.id.slice(-4)}`}
                    </td>
                    <td style={erpStyles.gridTd}>{v.payee||"—"}</td>
                    <td style={erpStyles.gridTd}>{v.payment_method ? v.payment_method.charAt(0).toUpperCase()+v.payment_method.slice(1).replace("_"," ") : "Cheque"}</td>
                    <td style={{ ...erpStyles.gridTd, fontSize:11, color:"#666" }}>{v.gl_account||"2100 - Accounts Payable"}</td>
                    <td style={erpStyles.gridTd}><StatusChip status={v.status}/></td>
                    <td style={{ ...erpStyles.gridTd, fontWeight:700 }}>{fmtK(v.total_amount||0)}</td>
                    <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(v.created_at)}</td>
                    <td style={{ ...erpStyles.gridTd, color:"#555" }}>{v.approved_by||"—"}</td>
                    <td style={erpStyles.gridTd}>
                      <div style={{ display:"flex", gap:3 }}>
                        <button onClick={()=>setViewVoucher(v)} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px" }}>View</button>
                        <button onClick={()=>printVoucher(v)} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px" }}>🖨</button>
                        {v.status==="pending" && <>
                          <button onClick={()=>updateStatus(v.id,"approved")} style={{ ...erpStyles.btn(true), fontSize:10, padding:"2px 6px" }}>✓</button>
                          <button onClick={()=>updateStatus(v.id,"rejected")} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px", color:"#cc0000" }}>✗</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && (
                  <tr><td colSpan={10} style={{ padding:30, textAlign:"center", color:"#888" }}>No payment vouchers found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Status Bar */}
        <div style={{ background:"#e0e0e0", borderTop:"1px solid #aaa", padding:"2px 10px", fontSize:11, color:"#555", display:"flex", gap:16 }}>
          <span>Showing: {filtered.length} records</span>
          <span>|</span>
          <span>Approved: {vouchers.filter(v=>v.status==="approved"||v.status==="paid").length}</span>
          <span>|</span>
          <span>Pending: {vouchers.filter(v=>v.status==="pending").length}</span>
          <span>|</span>
          <span>Total: {fmtK(totalFiltered)}</span>
          <span style={{ marginLeft:"auto" }}>EL5 MediProcure v10 · Payment Vouchers</span>
        </div>
      </div>
    </div>
  );
}


