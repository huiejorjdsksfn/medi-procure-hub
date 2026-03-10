import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank, Building2, BookMarked,
  BarChart3, RefreshCw, ArrowRight, Printer, Download, Search,
  CheckCircle, Clock, AlertCircle, XCircle, FileText, CreditCard,
  Landmark, Receipt, BookOpen, Wallet, Activity,
  Plus, Send, Check, X, Archive,
} from "lucide-react";

const fmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000 ? `KES ${(n / 1000).toFixed(1)}K`
      : `KES ${n.toLocaleString()}`;

const today = new Date().toISOString().split("T")[0];
const thisMonth = today.slice(0, 7);

const STATUS_META: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending:  { bg:"rgba(251,191,36,0.25)",  text:"#fbbf24", icon:Clock,        label:"Pending" },
  approved: { bg:"rgba(52,211,153,0.25)",  text:"#34d399", icon:CheckCircle,  label:"Approved" },
  paid:     { bg:"rgba(96,165,250,0.25)",  text:"#60a5fa", icon:Check,        label:"Paid" },
  draft:    { bg:"rgba(148,163,184,0.25)", text:"#94a3b8", icon:FileText,     label:"Draft" },
  rejected: { bg:"rgba(248,113,113,0.25)", text:"#f87171", icon:XCircle,      label:"Rejected" },
  posted:   { bg:"rgba(167,139,250,0.25)", text:"#a78bfa", icon:Send,         label:"Posted" },
  reversed: { bg:"rgba(251,146,60,0.25)",  text:"#fb923c", icon:X,            label:"Reversed" },
  active:   { bg:"rgba(52,211,153,0.25)",  text:"#34d399", icon:CheckCircle,  label:"Active" },
  disposed: { bg:"rgba(248,113,113,0.25)", text:"#f87171", icon:Archive,      label:"Disposed" },
  under_maintenance:{ bg:"rgba(251,191,36,0.25)", text:"#fbbf24", icon:AlertCircle, label:"Maintenance" },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { bg:"rgba(148,163,184,0.2)", text:"#94a3b8", icon:FileText, label:status };
  const Icon = m.icon;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:m.bg, color:m.text, padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, textTransform:"capitalize", border:`1px solid ${m.text}40` }}>
      <Icon style={{ width:10, height:10 }} />{m.label}
    </span>
  );
}

const glass: React.CSSProperties = {
  background:"rgba(10,22,50,0.72)",
  backdropFilter:"blur(16px)",
  WebkitBackdropFilter:"blur(16px)",
  border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:14,
};

type Tab = "overview"|"payments"|"receipts"|"journals"|"budgets"|"assets"|"accounts";

const TABS: { id:Tab; label:string; icon:any; color:string }[] = [
  { id:"overview",  label:"Overview",         icon:BarChart3,  color:"#38bdf8" },
  { id:"payments",  label:"Payment Vouchers", icon:CreditCard, color:"#f87171" },
  { id:"receipts",  label:"Receipt Vouchers", icon:Receipt,    color:"#34d399" },
  { id:"journals",  label:"Journal Entries",  icon:BookOpen,   color:"#a78bfa" },
  { id:"budgets",   label:"Budgets",          icon:PiggyBank,  color:"#fb923c" },
  { id:"assets",    label:"Fixed Assets",     icon:Building2,  color:"#fbbf24" },
  { id:"accounts",  label:"Chart of Accounts",icon:BookMarked, color:"#60a5fa" },
];

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))];
  const blob = new Blob([lines.join("\n")], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

function printTable(title: string, rows: any[]) {
  if (!rows.length) { alert("No records to print."); return; }
  const keys = Object.keys(rows[0]);
  const html = `<html><head><title>${title}</title><style>
    body{font-family:'Segoe UI',sans-serif;font-size:11px;margin:20px}
    h2{color:#0a2558}table{width:100%;border-collapse:collapse}
    th{background:#0a2558;color:#fff;padding:6px 10px;text-align:left}
    td{padding:5px 10px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f5f5f5}
  </style></head><body>
    <h2>Embu Level 5 Hospital — ${title}</h2>
    <p>Printed: ${new Date().toLocaleString("en-KE")}</p>
    <table><thead><tr>${keys.map(k=>`<th>${k}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${r[k]??""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></body></html>`;
  const w = window.open("","_blank")!;
  w.document.write(html); w.document.close(); w.print();
}

export default function FinancialDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab]               = useState<Tab>("overview");
  const [search, setSearch]         = useState("");
  const [startDate, setStartDate]   = useState("2025-01-01");
  const [endDate, setEndDate]       = useState(today);
  const [recordFilter, setRecordFilter] = useState<"all"|"month"|"latest100">("all");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const { data:pv,  refetch:rpv } = useRealtimeTable("payment_vouchers",  { order:{column:"created_at"} });
  const { data:rv,  refetch:rrv } = useRealtimeTable("receipt_vouchers",  { order:{column:"created_at"} });
  const { data:jv,  refetch:rjv } = useRealtimeTable("journal_vouchers",  { order:{column:"created_at"} });
  const { data:bud, refetch:rb  } = useRealtimeTable("budgets",            { order:{column:"created_at"} });
  const { data:coa, refetch:rca } = useRealtimeTable("chart_of_accounts");
  const { data:banks, refetch:rba } = useRealtimeTable("bank_accounts");
  const { data:assets, refetch:ras } = useRealtimeTable("fixed_assets",   { order:{column:"created_at"} });

  const pvRows    = pv    as any[];
  const rvRows    = rv    as any[];
  const jvRows    = jv    as any[];
  const budRows   = bud   as any[];
  const coaRows   = coa   as any[];
  const bankRows  = banks as any[];
  const assetRows = assets as any[];

  const refetchAll = () => { rpv(); rrv(); rjv(); rb(); rca(); rba(); ras(); };

  const pvMTD    = pvRows.filter(v => v.voucher_date?.startsWith(thisMonth));
  const rvMTD    = rvRows.filter(v => v.receipt_date?.startsWith(thisMonth));
  const totalPaid         = pvMTD.filter(v => v.status==="paid").reduce((s,v)=>s+Number(v.amount||0),0);
  const totalPending      = pvRows.filter(v=>["pending","approved"].includes(v.status)).reduce((s,v)=>s+Number(v.amount||0),0);
  const totalReceived     = rvRows.reduce((s,v)=>s+Number(v.amount||0),0);
  const totalReceivedMTD  = rvMTD.reduce((s,v)=>s+Number(v.amount||0),0);
  const cashBalance       = bankRows.reduce((s,b)=>s+Number(b.balance||0),0);
  const totalAllocated    = budRows.reduce((s,b)=>s+Number(b.allocated_amount||0),0);
  const totalSpent        = budRows.reduce((s,b)=>s+Number(b.spent_amount||0),0);
  const budgetUtil        = totalAllocated>0 ? Math.round(totalSpent/totalAllocated*100) : 0;
  const assetValue        = assetRows.reduce((s,a)=>s+Number(a.current_value||0),0);

  function applyFilters(rows: any[], dateField: string) {
    let r = [...rows];
    if (recordFilter==="latest100") r = r.slice(0,100);
    if (recordFilter==="month") r = r.filter(x=>x[dateField]?.startsWith(thisMonth));
    if (startDate) r = r.filter(x=>!x[dateField]||x[dateField]>=startDate);
    if (endDate)   r = r.filter(x=>!x[dateField]||x[dateField]<=endDate);
    if (typeFilter!=="ALL") r = r.filter(x=>x.status===typeFilter.toLowerCase()||x.type===typeFilter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x=>Object.values(x).some(v=>String(v).toLowerCase().includes(q)));
    }
    return r;
  }

  const filteredPV     = applyFilters(pvRows, "voucher_date");
  const filteredRV     = applyFilters(rvRows, "receipt_date");
  const filteredJV     = applyFilters(jvRows, "journal_date");
  const filteredBud    = budRows.filter(b=>!search||b.budget_name?.toLowerCase().includes(search.toLowerCase()));
  const filteredAssets = assetRows.filter(a=>!search||a.name?.toLowerCase().includes(search.toLowerCase())||a.asset_code?.toLowerCase().includes(search.toLowerCase()));
  const filteredCOA    = coaRows.filter(c=>!search||c.name?.toLowerCase().includes(search.toLowerCase())||c.code?.toLowerCase().includes(search.toLowerCase()));

  const currentRows = () => {
    switch(tab){
      case "payments":  return filteredPV;
      case "receipts":  return filteredRV;
      case "journals":  return filteredJV;
      case "budgets":   return filteredBud;
      case "assets":    return filteredAssets;
      case "accounts":  return filteredCOA;
      default:          return pvRows;
    }
  };
  const currentTitle = TABS.find(t=>t.id===tab)?.label ?? "Finance";
  const activeColor  = TABS.find(t=>t.id===tab)?.color ?? "#38bdf8";

  const kpis = [
    { label:"Cash Balance",      value:fmt(cashBalance),      color:"#38bdf8", icon:Landmark,    sub:`${bankRows.length} bank account(s)`,             path:"/financials/chart-of-accounts" },
    { label:"MTD Payments",      value:fmt(totalPaid),        color:"#f87171", icon:TrendingDown, sub:`${pvMTD.filter(v=>v.status==="paid").length} paid this month`, path:"/vouchers/payment" },
    { label:"MTD Receipts",      value:fmt(totalReceivedMTD), color:"#34d399", icon:TrendingUp,   sub:`${rvMTD.length} receipts`,                      path:"/vouchers/receipt" },
    { label:"Pending Approval",  value:fmt(totalPending),     color:"#fbbf24", icon:Clock,        sub:`${pvRows.filter(v=>v.status==="pending").length} awaiting`, path:"/vouchers/payment" },
    { label:"Budget Utilised",   value:`${budgetUtil}%`,      color:budgetUtil>90?"#f87171":budgetUtil>70?"#fb923c":"#34d399", icon:PiggyBank, sub:`${fmt(totalSpent)} spent`, path:"/financials/budgets" },
    { label:"Total Receipts",    value:fmt(totalReceived),    color:"#a78bfa", icon:Receipt,      sub:`${rvRows.length} all-time`,                      path:"/vouchers/receipt" },
    { label:"Fixed Assets",      value:fmt(assetValue),       color:"#fb923c", icon:Building2,    sub:`${assetRows.length} registered`,                 path:"/financials/fixed-assets" },
    { label:"Journal Entries",   value:String(jvRows.length), color:"#60a5fa", icon:BookOpen,     sub:`${coaRows.length} accounts`,                     path:"/vouchers/journal" },
  ];

  const modules = [
    { label:"Payment Vouchers",   icon:CreditCard, path:"/vouchers/payment",              color:"#f87171", count:pvRows.length },
    { label:"Receipt Vouchers",   icon:Receipt,    path:"/vouchers/receipt",              color:"#34d399", count:rvRows.length },
    { label:"Journal Entries",    icon:BookOpen,   path:"/vouchers/journal",              color:"#a78bfa", count:jvRows.length },
    { label:"Chart of Accounts",  icon:BookMarked, path:"/financials/chart-of-accounts", color:"#60a5fa", count:coaRows.length },
    { label:"Budgets",            icon:PiggyBank,  path:"/financials/budgets",           color:"#fb923c", count:budRows.length },
    { label:"Fixed Assets",       icon:Building2,  path:"/financials/fixed-assets",      color:"#fbbf24", count:assetRows.length },
    { label:"Bank Accounts",      icon:Landmark,   path:"/financials/chart-of-accounts", color:"#38bdf8", count:bankRows.length },
    { label:"Purchase Vouchers",  icon:Wallet,     path:"/vouchers/purchase",            color:"#f472b6", count:0 },
  ];

  function renderTableRows(rows: any[], cols: string[], navPath?: string) {
    return (
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ background:"rgba(255,255,255,0.06)" }}>
              {cols.map(c=>(
                <th key={c} style={{ padding:"10px 14px", textAlign:"left", fontWeight:800, color:"#94a3b8", fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid rgba(255,255,255,0.1)", whiteSpace:"nowrap" }}>
                  {c.replace(/_/g," ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td colSpan={cols.length} style={{ padding:30, textAlign:"center", color:"#64748b", fontStyle:"italic" }}>No records found</td></tr>
            ) : rows.map((row,i)=>(
              <tr key={row.id??i}
                onClick={()=>navPath&&navigate(navPath)}
                style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", cursor:navPath?"pointer":"default", transition:"background 0.15s" }}
                onMouseEnter={e=>{ if(navPath)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                {cols.map((c,ci)=>{
                  const val = row[c];
                  if(c==="status") return <td key={c} style={{ padding:"9px 14px" }}><StatusPill status={String(val??"draft")} /></td>;
                  if(c==="is_active") return <td key={c} style={{ padding:"9px 14px" }}><StatusPill status={val?"active":"disposed"} /></td>;
                  if(["amount","purchase_cost","current_value","allocated_amount","spent_amount","remaining_amount","balance"].includes(c)){
                    const num=Number(val||0);
                    return <td key={c} style={{ padding:"9px 14px", fontWeight:700, color:num<0?"#f87171":"#e2e8f0", fontVariantNumeric:"tabular-nums" }}>
                      {val!==undefined&&val!==null ? `KES ${num.toLocaleString()}` : "—"}
                    </td>;
                  }
                  if(c.includes("date")&&val){
                    return <td key={c} style={{ padding:"9px 14px", color:"#94a3b8" }}>{new Date(val).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"})}</td>;
                  }
                  if(ci===0) return <td key={c} style={{ padding:"9px 14px", fontWeight:700, color:activeColor }}>{String(val??"—")}</td>;
                  return <td key={c} style={{ padding:"9px 14px", color:"#cbd5e1", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{String(val??"—")}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderBudgets() {
    if(filteredBud.length===0) return <p style={{ padding:30, textAlign:"center", color:"#64748b", fontStyle:"italic" }}>No budgets found</p>;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filteredBud.map((b:any)=>{
          const alloc=Number(b.allocated_amount||0), spent=Number(b.spent_amount||0);
          const util=alloc>0?Math.round(spent/alloc*100):0;
          const bar=util>90?"#f87171":util>70?"#fb923c":"#34d399";
          return (
            <div key={b.id} onClick={()=>navigate("/financials/budgets")}
              style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"14px 16px", cursor:"pointer", border:"1px solid rgba(255,255,255,0.07)", transition:"background 0.15s" }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:800, color:"#e2e8f0" }}>{b.budget_name} <span style={{ fontSize:10, color:"#64748b", marginLeft:6 }}>{b.fiscal_year}</span></span>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}><StatusPill status={b.status??"draft"} /><span style={{ fontSize:11, fontWeight:700, color:bar }}>{util}%</span></div>
              </div>
              <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${Math.min(util,100)}%`, height:"100%", background:bar, borderRadius:4, transition:"width 0.8s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <span style={{ fontSize:10, color:"#64748b" }}>Spent: <b style={{ color:"#e2e8f0" }}>{fmt(spent)}</b></span>
                <span style={{ fontSize:10, color:"#64748b" }}>Allocated: <b style={{ color:"#e2e8f0" }}>{fmt(alloc)}</b></span>
                <span style={{ fontSize:10, color:"#64748b" }}>Remaining: <b style={{ color:bar }}>{fmt(Number(b.remaining_amount||alloc-spent))}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderOverview() {
    const recentPV=pvRows.slice(0,6), recentRV=rvRows.slice(0,6);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        <div>
          <h3 style={{ margin:"0 0 12px", fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Finance Modules</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:8 }}>
            {modules.map(m=>(
              <button key={m.path+m.label} onClick={()=>navigate(m.path)}
                style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${m.color}30`, borderRadius:12, padding:"14px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all 0.2s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=`${m.color}15`; (e.currentTarget as HTMLElement).style.borderColor=m.color; (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.borderColor=`${m.color}30`; (e.currentTarget as HTMLElement).style.transform="none"; }}>
                <div style={{ width:34, height:34, borderRadius:9, background:`${m.color}20`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <m.icon style={{ width:17, height:17, color:m.color }} />
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:9, fontWeight:800, color:"#e2e8f0", lineHeight:1.3 }}>{m.label}</div>
                  {m.count>0 && <div style={{ fontSize:9, color:m.color, marginTop:2 }}>{m.count} records</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {bankRows.length>0&&(
          <div>
            <h3 style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Bank Accounts</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {bankRows.map((b:any)=>(
                <div key={b.id} style={{ background:"rgba(56,189,248,0.07)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:800, color:"#e2e8f0" }}>{b.bank_name}</div>
                      <div style={{ fontSize:9, color:"#64748b", marginTop:2 }}>{b.account_number} · {b.currency}</div>
                      <div style={{ fontSize:9, color:"#94a3b8", marginTop:1 }}>{b.branch}</div>
                    </div>
                    <Landmark style={{ width:18, height:18, color:"#38bdf8" }} />
                  </div>
                  <div style={{ marginTop:10, fontSize:18, fontWeight:900, color:"#38bdf8" }}>{fmt(Number(b.balance||0))}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[
            { label:"Recent Payments", rows:recentPV, color:"#f87171", path:"/vouchers/payment", numField:"amount", nameField:"payee_name", codeField:"voucher_number" },
            { label:"Recent Receipts", rows:recentRV, color:"#34d399", path:"/vouchers/receipt", numField:"amount", nameField:"received_from", codeField:"receipt_number" },
          ].map(panel=>(
            <div key={panel.label} style={{ ...glass, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, fontWeight:800, color:panel.color }}>{panel.label}</span>
                <button onClick={()=>navigate(panel.path)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", gap:3 }}>View all <ArrowRight style={{ width:10, height:10 }} /></button>
              </div>
              {panel.rows.length===0 ? <p style={{ padding:20, color:"#64748b", fontSize:11, textAlign:"center", fontStyle:"italic" }}>No records yet</p> :
                panel.rows.map((v:any)=>(
                  <div key={v.id} onClick={()=>navigate(panel.path)}
                    style={{ padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${panel.color}08`}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:panel.color }}>{v[panel.codeField]||"—"}</div>
                      <div style={{ fontSize:9, color:"#64748b" }}>{v[panel.nameField]||"—"}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, fontWeight:800, color:"#e2e8f0" }}>KES {Number(v[panel.numField]||0).toLocaleString()}</div>
                      <StatusPill status={v.status??"draft"} />
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {budRows.length>0&&(
          <div>
            <h3 style={{ margin:"0 0 10px", fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Budget Utilisation</h3>
            {renderBudgets()}
          </div>
        )}
      </div>
    );
  }

  function renderTabContent() {
    const c = (n:number)=>`${n} record${n!==1?"s":""}`;
    switch(tab){
      case "overview":  return renderOverview();
      case "payments":  return <div><div style={{ marginBottom:8, fontSize:10, color:"#64748b" }}>{c(filteredPV.length)} · {startDate} to {endDate}</div>{renderTableRows(filteredPV,["voucher_number","voucher_date","payee_name","account_name","amount","status"],"/vouchers/payment")}</div>;
      case "receipts":  return <div><div style={{ marginBottom:8, fontSize:10, color:"#64748b" }}>{c(filteredRV.length)} · {startDate} to {endDate}</div>{renderTableRows(filteredRV,["receipt_number","receipt_date","received_from","account_name","amount","status"],"/vouchers/receipt")}</div>;
      case "journals":  return <div><div style={{ marginBottom:8, fontSize:10, color:"#64748b" }}>{c(filteredJV.length)}</div>{renderTableRows(filteredJV,["voucher_number","journal_date","description","debit_account","credit_account","amount","status"],"/vouchers/journal")}</div>;
      case "budgets":   return <div><div style={{ marginBottom:12, fontSize:10, color:"#64748b" }}>{c(filteredBud.length)}</div>{renderBudgets()}</div>;
      case "assets":    return <div><div style={{ marginBottom:8, fontSize:10, color:"#64748b" }}>{c(filteredAssets.length)} · Total value: {fmt(assetValue)}</div>{renderTableRows(filteredAssets,["asset_code","name","purchase_date","purchase_cost","current_value","depreciation_method","status"],"/financials/fixed-assets")}</div>;
      case "accounts":  return <div><div style={{ marginBottom:8, fontSize:10, color:"#64748b" }}>{c(filteredCOA.length)}</div>{renderTableRows(filteredCOA,["code","name","type","balance","is_active"],"/financials/chart-of-accounts")}</div>;
      default: return null;
    }
  }

  const statusOptions = ["ALL","PENDING","APPROVED","PAID","DRAFT","REJECTED","POSTED","REVERSED","ACTIVE","DISPOSED"];

  return (
    <div style={{ minHeight:"calc(100vh - 60px)", fontFamily:"'Segoe UI',system-ui,sans-serif", backgroundImage:`url(${procBg})`, backgroundSize:"cover", backgroundPosition:"center", backgroundAttachment:"fixed", position:"relative" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(4,10,25,0.82)", zIndex:0 }} />

      <div style={{ position:"relative", zIndex:1 }}>

        {/* ── HEADER ── */}
        <div style={{ background:"rgba(6,14,35,0.92)", borderBottom:"1px solid rgba(255,255,255,0.1)", backdropFilter:"blur(20px)", padding:"8px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:8 }}>
            <img src={logoImg} alt="Logo" style={{ width:36, height:36, borderRadius:8, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:900, color:"#f8fafc", letterSpacing:"-0.01em" }}>Embu Level 5 Hospital</div>
              <div style={{ fontSize:9, color:"#64748b", letterSpacing:"0.06em", textTransform:"uppercase" }}>Finance & Accounts — Reports & Data Extraction</div>
            </div>
          </div>

          <span style={{ fontSize:10, color:"#94a3b8", fontWeight:700, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"4px 10px" }}>Date Range</span>
          <label style={{ fontSize:10, color:"#94a3b8" }}>Start Date</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
            style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, color:"#f8fafc", padding:"4px 8px", fontSize:11, outline:"none" }} />
          <label style={{ fontSize:10, color:"#94a3b8" }}>End Date</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
            style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, color:"#f8fafc", padding:"4px 8px", fontSize:11, outline:"none" }} />

          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={refetchAll}
              style={{ background:"rgba(56,189,248,0.15)", color:"#38bdf8", border:"1px solid rgba(56,189,248,0.3)", borderRadius:8, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(56,189,248,0.28)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(56,189,248,0.15)"}>
              <RefreshCw style={{ width:12, height:12 }} />Refresh
            </button>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
              style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#f8fafc", padding:"6px 10px", fontSize:11, outline:"none", cursor:"pointer" }}>
              {statusOptions.map(s=><option key={s} value={s} style={{ background:"#0f172a" }}>{s}</option>)}
            </select>
            <button onClick={()=>printTable(currentTitle,currentRows())}
              style={{ background:"rgba(248,113,113,0.15)", color:"#f87171", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.28)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.15)"}>
              <Printer style={{ width:12, height:12 }} />Print
            </button>
            <button onClick={()=>exportCSV(currentRows(),`${currentTitle.replace(/ /g,"_")}_${today}.csv`)}
              style={{ background:"rgba(52,211,153,0.15)", color:"#34d399", border:"1px solid rgba(52,211,153,0.3)", borderRadius:8, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(52,211,153,0.28)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(52,211,153,0.15)"}>
              <Download style={{ width:12, height:12 }} />Save
            </button>
          </div>
        </div>

        {/* ── KPI TILE STRIP ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          {kpis.map((k,i)=>(
            <button key={k.label} onClick={()=>navigate(k.path)}
              style={{ background:i%2===0?`${k.color}22`:`${k.color}18`, border:"none", borderRight:"1px solid rgba(255,255,255,0.07)", padding:"14px 12px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${k.color}38`}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?`${k.color}22`:`${k.color}18`}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{k.label}</span>
                <k.icon style={{ width:14, height:14, color:k.color }} />
              </div>
              <div style={{ fontSize:17, fontWeight:900, color:k.color, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{k.value}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{k.sub}</div>
            </button>
          ))}
        </div>

        {/* ── MAIN BODY ── */}
        <div style={{ padding:"14px 18px", display:"flex", gap:14 }}>

          {/* Sidebar */}
          <div style={{ width:196, flexShrink:0 }}>
            <div style={{ ...glass, padding:8, display:"flex", flexDirection:"column", gap:2 }}>
              <div style={{ padding:"7px 10px", fontSize:9, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.06)", marginBottom:4 }}>Finance Modules</div>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ background:tab===t.id?`${t.color}18`:"transparent", border:tab===t.id?`1px solid ${t.color}40`:"1px solid transparent", borderRadius:8, padding:"9px 12px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:8, transition:"all 0.15s", color:tab===t.id?t.color:"#94a3b8", fontWeight:tab===t.id?800:600, fontSize:11 }}
                  onMouseEnter={e=>{ if(tab!==t.id)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e=>{ if(tab!==t.id)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                  <t.icon style={{ width:14, height:14, flexShrink:0 }} />{t.label}
                </button>
              ))}

              <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:8, paddingTop:8, display:"flex", flexDirection:"column", gap:3 }}>
                <div style={{ fontSize:9, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 10px" }}>Quick Actions</div>
                {[
                  { label:"New Payment", path:"/vouchers/payment", color:"#f87171" },
                  { label:"New Receipt", path:"/vouchers/receipt", color:"#34d399" },
                  { label:"New Journal", path:"/vouchers/journal", color:"#a78bfa" },
                  { label:"View Reports", path:"/reports",         color:"#60a5fa" },
                ].map(a=>(
                  <button key={a.path+a.label} onClick={()=>navigate(a.path)}
                    style={{ background:"transparent", border:"none", color:a.color, cursor:"pointer", fontSize:10, fontWeight:700, padding:"6px 10px", textAlign:"left", borderRadius:6, display:"flex", alignItems:"center", gap:6, transition:"background 0.12s" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${a.color}15`}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <Plus style={{ width:11, height:11 }} />{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex:1, minWidth:0 }}>
            {/* Sub-header */}
            <div style={{ ...glass, padding:"10px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, fontWeight:900, color:activeColor }}>{TABS.find(t=>t.id===tab)?.label}</span>
              <span style={{ color:"rgba(255,255,255,0.15)", fontSize:14 }}>|</span>
              <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"4px 10px", gap:6, flex:1, maxWidth:280 }}>
                <Search style={{ width:12, height:12, color:"#64748b" }} />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter records..."
                  style={{ background:"none", border:"none", outline:"none", color:"#f8fafc", fontSize:11, width:"100%" }} />
              </div>
              <div style={{ display:"flex", gap:4 }}>
                {(["all","latest100","month"] as const).map(f=>(
                  <button key={f} onClick={()=>setRecordFilter(f)}
                    style={{ background:recordFilter===f?`${activeColor}20`:"transparent", color:recordFilter===f?activeColor:"#64748b", border:`1px solid ${recordFilter===f?activeColor+"50":"rgba(255,255,255,0.1)"}`, borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    {f==="all"?"ALL":f==="latest100"?"Latest 100":"This Month"}
                  </button>
                ))}
              </div>
              <button onClick={()=>exportCSV(currentRows(),`${currentTitle.replace(/ /g,"_")}_Extract_${today}.csv`)}
                style={{ marginLeft:"auto", background:`${activeColor}20`, color:activeColor, border:`1px solid ${activeColor}40`, borderRadius:8, padding:"6px 16px", fontSize:11, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${activeColor}35`}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=`${activeColor}20`}>
                <Download style={{ width:12, height:12 }} />Extract
              </button>
            </div>

            {/* Content */}
            <div style={{ ...glass, padding:16, minHeight:400 }}>{renderTabContent()}</div>

            {/* Bottom action bar */}
            <div style={{ ...glass, marginTop:10, padding:"8px 16px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              {[
                { label:"Refresh",         fn:refetchAll,                                        color:"#38bdf8", icon:RefreshCw },
                { label:"Export Excel",    fn:()=>exportCSV(currentRows(),`${currentTitle.replace(/ /g,"_")}_${today}.csv`), color:"#60a5fa", icon:Download },
                { label:"Print Report",    fn:()=>printTable(currentTitle,currentRows()),         color:"#a78bfa", icon:Printer },
                { label:"Full Reports",    fn:()=>navigate("/reports"),                           color:"#fb923c", icon:BarChart3 },
                { label:"Chart of Accounts",fn:()=>navigate("/financials/chart-of-accounts"),   color:"#34d399", icon:BookMarked },
                { label:"Budgets",         fn:()=>navigate("/financials/budgets"),               color:"#fbbf24", icon:PiggyBank },
                { label:"Fixed Assets",    fn:()=>navigate("/financials/fixed-assets"),          color:"#f87171", icon:Building2 },
                { label:"Audit Log",       fn:()=>navigate("/audit-log"),                        color:"#94a3b8", icon:Activity },
              ].map(b=>(
                <button key={b.label} onClick={b.fn}
                  style={{ background:`${b.color}12`, color:b.color, border:`1px solid ${b.color}25`, borderRadius:7, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"background 0.15s" }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=`${b.color}25`}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=`${b.color}12`}>
                  <b.icon style={{ width:11, height:11 }} />{b.label}
                </button>
              ))}
              <div style={{ marginLeft:"auto", fontSize:10, color:"#64748b" }}>
                {currentRows().length} records · {startDate} to {endDate}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
