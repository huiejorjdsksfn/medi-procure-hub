import type React from "react";
/**
 * EL5 MediProcure — Accountant Workspace v10
 * Classic ERP Financial Management System UI
 * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

type Tab = "payments"|"receipts"|"journals";
type AccountType = "ass"|"lib"|"inc"|"exp"|"eq";

interface KPI { label: string; value: string|number; color?: string; }
interface Payment { id: string; voucher_number?: string; payee?: string; total_amount?: number; status: string; payment_method?: string; created_at: string; approved_by?: string; gl_account?: string; description?: string; }
interface GLEntry { id: string; gl_account?: string; debit?: number; credit?: number; description?: string; reference?: string; created_at: string; status?: string; }
interface COAItem { id: string; name: string; type: AccountType; code?: string; }

const db = supabase as any;

const COA_ACCOUNTS: COAItem[] = [
  { id:"1", name:"Current Assets", type:"ass" },
  { id:"2", name:"Cash and Cash Equivalents", type:"ass" },
  { id:"3", name:"Petty Cash", type:"ass" },
  { id:"4", name:"KCB Operating Account", type:"ass" },
  { id:"5", name:"Co-operative Bank Account", type:"ass" },
  { id:"6", name:"Accounts Receivable", type:"ass" },
  { id:"7", name:"NHIF Receivable", type:"ass" },
  { id:"8", name:"MOH Grant Receivable", type:"ass" },
  { id:"9", name:"Inventory / Stock Value", type:"ass" },
  { id:"10", name:"Pharmaceuticals Stock", type:"ass" },
  { id:"11", name:"Medical Supplies Stock", type:"ass" },
  { id:"12", name:"Prepaid Expenses", type:"ass" },
  { id:"13", name:"Property, Plant & Equipment", type:"ass" },
  { id:"14", name:"Accumulated Depreciation", type:"ass" },
  { id:"15", name:"Medical Equipment", type:"ass" },
  { id:"16", name:"Accounts Payable", type:"lib" },
  { id:"17", name:"Salaries Payable", type:"lib" },
  { id:"18", name:"NHIF Payable", type:"lib" },
  { id:"19", name:"NSSF Payable", type:"lib" },
  { id:"20", name:"MOH Grant Revenue", type:"inc" },
  { id:"21", name:"NHIF Revenue", type:"inc" },
  { id:"22", name:"Patient Fee Revenue", type:"inc" },
  { id:"23", name:"Salaries & Wages", type:"exp" },
  { id:"24", name:"Medical Supplies Expense", type:"exp" },
  { id:"25", name:"Utilities Expense", type:"exp" },
  { id:"26", name:"Maintenance & Repairs", type:"exp" },
  { id:"27", name:"Retained Earnings", type:"eq" },
];

const STATUS_COLORS: Record<string,string> = {
  paid:"#007700", approved:"#007700", matched:"#007700",
  pending:"#cc6600", draft:"#555555",
  rejected:"#cc0000", cancelled:"#cc0000",
};

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

function TitleBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{
      background: ERP.titleBar,
      color: "#fff",
      padding: "5px 10px",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: ERP.fontFamily,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${ERP.titleBarBorder}`,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:14 }}>📊</span>
        <div>
          <div>{title}</div>
          {subtitle && <div style={{ fontSize:10, fontWeight:400, opacity:0.85 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:4 }}>
        {["0","1","r"].map(c=>(
          <div key={c} style={{ width:16,height:14,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#333",fontWeight:700 }}>{c}</div>
        ))}
      </div>
    </div>
  );
}

function ERPBtn({ onClick, children, primary, disabled }: { onClick?: ()=>void; children: React.ReactNode; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...erpStyles.btn(primary),
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
      {children}
    </button>
  );
}

export default function AccountantWorkspacePage() {
  const [tab, setTab] = useState<Tab>("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("2025-12-31");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [searchCOA, setSearchCOA] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<COAItem|null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showLatest, setShowLatest] = useState<"all"|"latest100"|"thismonth">("all");
  const [kpis, setKpis] = useState<KPI[]>([
    { label:"TOTAL PAYMENTS", value:"KES 0.00" },
    { label:"TOTAL RECEIPTS", value:"KES 0.00" },
    { label:"NET BALANCE", value:"KES 0.00" },
    { label:"RECORD COUNT", value:"2" },
    { label:"BUDGET ALLOC.", value:"KES 0.00" },
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pvRes, glRes] = await Promise.allSettled([
        db.from("payment_vouchers").select("*").order("created_at",{ascending:false}).limit(200),
        db.from("gl_entries").select("*").order("created_at",{ascending:false}).limit(200),
      ]);
      const pvs: Payment[] = pvRes.status==="fulfilled" ? (pvRes.value.data||[]) : [];
      const gls: GLEntry[] = glRes.status==="fulfilled" ? (glRes.value.data||[]) : [];
      setPayments(pvs);
      setGlEntries(gls);

      const totalPay = pvs.filter(p=>p.status==="paid"||p.status==="approved").reduce((s,p)=>s+(p.total_amount||0),0);
      const totalRec = gls.filter(g=>g.credit&&g.credit>0).reduce((s,g)=>s+(g.credit||0),0);
      setKpis([
        { label:"TOTAL PAYMENTS", value:fmtK(totalPay) },
        { label:"TOTAL RECEIPTS", value:fmtK(totalRec) },
        { label:"NET BALANCE", value:fmtK(totalRec-totalPay) },
        { label:"RECORD COUNT", value:pvs.length },
        { label:"BUDGET ALLOC.", value:"KES 0.00" },
      ]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    if(statusFilter!=="ALL" && p.status!==statusFilter.toLowerCase()) return false;
    if(showLatest==="latest100") return true;
    if(showLatest==="thismonth") {
      const d = new Date(p.created_at);
      const now = new Date();
      return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }
    return true;
  }).slice(0, showLatest==="latest100" ? 100 : undefined);

  const filteredCOA = COA_ACCOUNTS.filter(a =>
    !searchCOA || a.name.toLowerCase().includes(searchCOA.toLowerCase())
  );

  async function extractReport() {
    const rows = ["Voucher No,Payee,Method,Expense Acct,Status,Amount,Date,Approved By",
      ...filteredPayments.map(p =>
        `${p.voucher_number||""},${p.payee||""},${p.payment_method||""},${p.gl_account||""},${p.status},${p.total_amount||0},${fmtDate(p.created_at)},${p.approved_by||""}`
      )
    ];
    const blob = new Blob([rows.join("\n")],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="financial_extract.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title:"✓ Extracted to CSV" });
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await db.from("payment_vouchers").update({status}).eq("id",id);
    if(!error){ toast({ title:`✓ Status → ${status}` }); fetchData(); }
    else toast({ title:"Error: "+error.message, variant:"destructive" });
  }

  const voucherNo = (p: Payment) => p.voucher_number || `PV/EL5H/${new Date(p.created_at).getFullYear()}${String(new Date(p.created_at).getMonth()+1).padStart(2,"0")}/${Math.floor(Math.random()*9999)}`;

  const bg = "#f0f0f0";
  const TABS = [
    { id:"payments" as Tab, label:"- Payments" },
    { id:"receipts" as Tab, label:"- Receipts" },
    { id:"journals" as Tab, label:"- Journals" },
  ];

  return (
    <div style={{ background:bg, minHeight:"100vh", fontFamily:ERP.fontFamily, fontSize:12 }}>

      {/* Title Bar */}
      <TitleBar
        title="EL5 MediProcure — Financial Management System  [Payment Vouchers]"
        subtitle="Embu Level 5 Hospital · Accountant Workspace"
      />

      {/* Menu Bar */}
      <div style={{ background:"#f5f5f5", borderBottom:"1px solid #ccc", padding:"2px 8px", display:"flex", gap:16, fontSize:12 }}>
        {["File","View","Reports","Help"].map(m=>(
          <span key={m} style={{ cursor:"pointer", padding:"2px 4px", color:"#1a1a1a" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <u>{m[0]}</u>{m.slice(1)}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, gap:8, padding:"5px 10px" }}>
        {/* Hospital logo */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginRight:8 }}>
          <div style={{ width:28, height:28, background:"linear-gradient(135deg,#1a3580,#2a4fa3)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:14 }}>🏥</span>
          </div>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a3580" }}>Embu Level 5 Hospital</span>
        </div>

        <span style={{ color:"#555", fontSize:11 }}>Date:</span>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ ...erpStyles.inp, width:120 }}/>
        <span style={{ color:"#555" }}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ ...erpStyles.inp, width:120 }}/>
        <ERPBtn onClick={fetchData}>↻ Refresh</ERPBtn>

        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              ...erpStyles.btn(tab===t.id),
              background: tab===t.id ? ERP.tabActive : ERP.tabInactive,
              color: tab===t.id ? "#fff" : "#333",
              border: `1px solid ${tab===t.id ? ERP.tabActiveBorder : ERP.toolbarBorder}`,
            }}>{t.label}</button>
          ))}
          <ERPBtn>- Print</ERPBtn>
          <ERPBtn>- Export</ERPBtn>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid #aaa", background:"#e8e8e8" }}>
        {kpis.map((k,i)=>(
          <div key={i} style={{
            flex:1,
            padding:"10px 16px",
            borderRight: i<kpis.length-1 ? "1px solid #aaa" : "none",
            background:"#ffffff",
            position:"relative",
          }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ color:"#c0392b", fontWeight:700, fontSize:11 }}>-</span>
              <span style={{ fontWeight:800, fontSize:16, color:"#1a1a1a", letterSpacing:"-0.01em" }}>{k.value}</span>
            </div>
            <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content: COA sidebar + data grid */}
      <div style={{ display:"flex", height:"calc(100vh - 140px)", overflow:"hidden" }}>

        {/* Chart of Accounts Sidebar */}
        <div style={{ width:220, background:"#f5f5f5", borderRight:"1px solid #cccccc", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{
            background:ERP.sidebarHeader,
            color:"#fff",
            padding:"5px 10px",
            fontSize:11,
            fontWeight:700,
            borderBottom:"1px solid #1a3580",
          }}>
            - Chart of Accounts
          </div>
          <div style={{ padding:4, borderBottom:"1px solid #ddd" }}>
            <input
              value={searchCOA}
              onChange={e=>setSearchCOA(e.target.value)}
              placeholder="Search accounts..."
              style={{ ...erpStyles.inp, width:"100%", boxSizing:"border-box", fontSize:11 }}
            />
          </div>
          {/* Headers */}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 8px", background:"#e8e8e8", borderBottom:"1px solid #ccc", fontSize:10, fontWeight:700, color:"#555" }}>
            <span>Account Name</span>
            <span>Type</span>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {filteredCOA.map(a=>(
              <div key={a.id}
                onClick={()=>setSelectedAccount(a)}
                style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"4px 8px",
                  cursor:"pointer",
                  background: selectedAccount?.id===a.id ? ERP.sidebarActive : "transparent",
                  borderBottom:"1px solid #ebebeb",
                  color:ERP.sidebarItem,
                  fontSize:11,
                }}
                onMouseEnter={e=>{ if(selectedAccount?.id!==a.id) e.currentTarget.style.background=ERP.sidebarHover; }}
                onMouseLeave={e=>{ if(selectedAccount?.id!==a.id) e.currentTarget.style.background="transparent"; }}
              >
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{a.name}</span>
                <span style={{ fontSize:9, color:"#888", background:"#e8e8e8", padding:"1px 4px", borderRadius:2, flexShrink:0 }}>{a.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Filter bar + Grid */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Filter & Extract bar */}
          <div style={{ background:"#f5f5f5", border:"1px solid #ccc", margin:6, padding:"6px 10px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontWeight:700, fontSize:11, color:"#555" }}>Payment Vouchers — Filter & Extract</span>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11 }}>Search:</span>
              <input placeholder="Filter records..." style={{ ...erpStyles.inp, width:160, fontSize:11 }}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11 }}>Status:</span>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...erpStyles.inp, fontSize:11 }}>
                {["ALL","DRAFT","PENDING","APPROVED","PAID","REJECTED"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {(["all","latest100","thismonth"] as const).map(v=>(
                <label key={v} style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, cursor:"pointer" }}>
                  <input type="radio" checked={showLatest===v} onChange={()=>setShowLatest(v)} style={{ cursor:"pointer" }}/>
                  {v==="all"?"All Records":v==="latest100"?"Latest 100":"This Month"}
                </label>
              ))}
            </div>
            <ERPBtn onClick={extractReport} primary>Extract →</ERPBtn>
          </div>

          {/* Data Grid */}
          <div style={{ flex:1, overflow:"auto", margin:"0 6px 6px" }}>
            {loading ? (
              <div style={{ padding:40, textAlign:"center", color:"#888", fontSize:12 }}>Loading...</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff" }}>
                <thead>
                  <tr>
                    {["Voucher No","Payee","Method","Expense Acct","Status","Amount","Date","Approved By"].map(h=>(
                      <th key={h} style={erpStyles.gridTh}>{h}</th>
                    ))}
                    <th style={{ ...erpStyles.gridTh, width:90 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tab==="payments" && filteredPayments.map((p,i)=>(
                    <tr key={p.id}
                      style={{ background: i%2===0 ? ERP.gridRow : ERP.gridRowAlt }}
                      onMouseEnter={e=>(e.currentTarget.style.background=ERP.gridRowHover)}
                      onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?ERP.gridRow:ERP.gridRowAlt)}
                    >
                      <td style={{ ...erpStyles.gridTd, color:"#2255cc", fontWeight:700, cursor:"pointer" }}>
                        {voucherNo(p)}
                      </td>
                      <td style={erpStyles.gridTd}>{p.payee||"—"}</td>
                      <td style={erpStyles.gridTd}>{p.payment_method ? p.payment_method.charAt(0).toUpperCase()+p.payment_method.slice(1) : "Cheque"}</td>
                      <td style={{ ...erpStyles.gridTd, fontSize:11, color:"#666" }}>{p.gl_account||"2100 - Accounts Payable"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={p.status}/></td>
                      <td style={{ ...erpStyles.gridTd, fontWeight:700 }}>
                        {fmtK(p.total_amount||0)}
                      </td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(p.created_at)}</td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{p.approved_by||"-"}</td>
                      <td style={erpStyles.gridTd}>
                        {p.status==="pending" && (
                          <div style={{ display:"flex", gap:3 }}>
                            <button onClick={()=>updateStatus(p.id,"approved")} style={{ ...erpStyles.btn(true), fontSize:10, padding:"2px 6px" }}>✓</button>
                            <button onClick={()=>updateStatus(p.id,"rejected")} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px", color:"#cc0000" }}>✗</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tab==="receipts" && (
                    <tr><td colSpan={9} style={{ padding:40, textAlign:"center", color:"#888" }}>
                      Receipts are recorded via the Receipts Voucher module
                    </td></tr>
                  )}
                  {tab==="journals" && glEntries.map((g,i)=>(
                    <tr key={g.id} style={{ background: i%2===0 ? ERP.gridRow : ERP.gridRowAlt }}>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{g.reference||"JV-"+g.id.slice(-6)}</td>
                      <td style={erpStyles.gridTd}>{g.description||"—"}</td>
                      <td style={erpStyles.gridTd}>{g.gl_account||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, fontSize:11, color:"#666" }}>{g.gl_account||"—"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={g.status||"posted"}/></td>
                      <td style={{ ...erpStyles.gridTd, fontWeight:700, color:g.debit?ERP.gridText:"#888" }}>
                        {g.debit ? fmtK(g.debit) : "—"}
                      </td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(g.created_at)}</td>
                      <td style={erpStyles.gridTd}>—</td>
                      <td style={erpStyles.gridTd}></td>
                    </tr>
                  ))}
                  {((tab==="payments" && filteredPayments.length===0) || (tab==="journals" && glEntries.length===0)) && (
                    <tr><td colSpan={9} style={{ padding:30, textAlign:"center", color:"#888" }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Status bar */}
          <div style={{ background:"#e0e0e0", borderTop:"1px solid #aaa", padding:"2px 10px", fontSize:11, color:"#555", display:"flex", gap:20 }}>
            <span>Records: {filteredPayments.length}</span>
            <span>|</span>
            <span>Total: {fmtK(filteredPayments.reduce((s,p)=>s+(p.total_amount||0),0))}</span>
            <span style={{ marginLeft:"auto" }}>EL5 MediProcure v10 · Embu Level 5 Hospital</span>
          </div>
        </div>
      </div>
    </div>
  );
}

