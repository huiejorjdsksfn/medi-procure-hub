import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Building2, BookMarked, BarChart3, RefreshCw, ArrowRight, ChevronRight } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const fmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(2)}M`
  : n >= 1000 ? `KES ${(n/1000).toFixed(1)}K`
  : `KES ${n.toLocaleString()}`;

const today = new Date().toISOString().split("T")[0];
const thisMonth = today.slice(0, 7);

const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  pending:  {bg:"#fef3c7",text:"#92400e"},
  approved: {bg:"#d1fae5",text:"#065f46"},
  paid:     {bg:"#dbeafe",text:"#1e40af"},
  draft:    {bg:"#f3f4f6",text:"#374151"},
  rejected: {bg:"#fee2e2",text:"#991b1b"},
};

export default function FinancialDashboardPage() {
  const navigate = useNavigate();
  const { data: pv, refetch: rpv } = useRealtimeTable("payment_vouchers",  { order: { column: "created_at" } });
  const { data: rv, refetch: rrv } = useRealtimeTable("receipt_vouchers",  { order: { column: "created_at" } });
  const { data: jv, refetch: rjv } = useRealtimeTable("journal_vouchers",  { order: { column: "created_at" } });
  const { data: bud, refetch: rb } = useRealtimeTable("budgets",            { order: { column: "created_at" } });
  const { data: coa }               = useRealtimeTable("chart_of_accounts");
  const { data: banks }             = useRealtimeTable("bank_accounts");

  const pvRows = pv as any[];
  const rvRows = rv as any[];
  const jvRows = jv as any[];
  const budRows = bud as any[];

  const pvMTD = pvRows.filter(v => v.voucher_date?.startsWith(thisMonth));
  const rvMTD = rvRows.filter(v => v.receipt_date?.startsWith(thisMonth));

  const totalPaid       = pvMTD.filter(v => v.status === "paid").reduce((s,v) => s+Number(v.amount||0),0);
  const totalPending    = pvRows.filter(v => ["pending","approved"].includes(v.status)).reduce((s,v) => s+Number(v.amount||0),0);
  const totalReceived   = rvRows.reduce((s,v) => s+Number(v.amount||0),0);
  const totalReceivedMTD = rvMTD.reduce((s,v) => s+Number(v.amount||0),0);
  const cashBalance     = (banks as any[]).reduce((s,b) => s+Number(b.balance||0),0);
  const totalAllocated  = budRows.reduce((s,b) => s+Number(b.allocated_amount||0),0);
  const totalSpent      = budRows.reduce((s,b) => s+Number(b.spent_amount||0),0);
  const budgetUtil      = totalAllocated > 0 ? Math.round(totalSpent/totalAllocated*100) : 0;

  const refetch = () => { rpv(); rrv(); rjv(); rb(); };

  const navCards = [
    { label:"Payment Vouchers", icon:DollarSign,  path:"/vouchers/payment",          color:"#0078d4", count:pvRows.length },
    { label:"Receipt Vouchers", icon:TrendingUp,   path:"/vouchers/receipt",          color:"#107c10", count:rvRows.length },
    { label:"Journal Entries",  icon:BookMarked,   path:"/vouchers/journal",          color:"#5C2D91", count:jvRows.length },
    { label:"Chart of Accounts",icon:BarChart3,    path:"/financials/chart-of-accounts", color:"#1F6090", count:(coa as any[]).length },
    { label:"Budgets",          icon:PiggyBank,    path:"/financials/budgets",        color:"#C45911", count:budRows.length },
    { label:"Fixed Assets",     icon:Building2,    path:"/financials/fixed-assets",   color:"#375623", count:0 },
  ];

  const recentPV = pvRows.slice(0,8);

  return (
    <div style={{background:"transparent",minHeight:"calc(100vh-100px)",fontFamily:"'Segoe UI',system-ui"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#0a2558,#1F6090)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{color:"#fff",fontWeight:900,fontSize:15,margin:0}}>Finance Dashboard</h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:10,margin:"2px 0 0"}}>{thisMonth} · MTD Summary</p>
        </div>
        <button onClick={refetch} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <RefreshCw style={{width:12,height:12}}/>Refresh
        </button>
      </div>

      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:16}}>
        {/* KPI Row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
          {[
            {label:"Cash Balance",    value:fmt(cashBalance),   color:"#0078d4", icon:DollarSign,  sub:"All bank accounts"},
            {label:"MTD Payments",    value:fmt(totalPaid),     color:"#dc2626", icon:TrendingDown, sub:`${pvMTD.filter(v=>v.status==="paid").length} vouchers paid`},
            {label:"MTD Receipts",    value:fmt(totalReceivedMTD), color:"#107c10", icon:TrendingUp, sub:`${rvMTD.length} receipts`},
            {label:"Pending Approval",value:fmt(totalPending),  color:"#d97706", icon:DollarSign,  sub:`${pvRows.filter(v=>v.status==="pending").length} vouchers`},
            {label:"Budget Utilisation",value:`${budgetUtil}%`, color:budgetUtil>90?"#dc2626":budgetUtil>70?"#d97706":"#107c10",icon:BarChart3, sub:fmt(totalSpent)+" spent"},
          ].map(k => (
            <div key={k.label} style={{background:"rgba(255,255,255,0.92)",borderRadius:10,padding:"14px 16px",border:"1px solid #edebe9",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,fontWeight:700,color:"#605e5c",textTransform:"uppercase",letterSpacing:"0.05em"}}>{k.label}</span>
                <div style={{width:28,height:28,borderRadius:6,background:`${k.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <k.icon style={{width:14,height:14,color:k.color}}/>
                </div>
              </div>
              <div style={{fontSize:18,fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
              <div style={{fontSize:10,color:"#a19f9d",marginTop:4}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Module Quick Access */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10}}>
          {navCards.map(c => (
            <button key={c.path} onClick={()=>navigate(c.path)}
              style={{background:"rgba(255,255,255,0.92)",border:`1px solid ${c.color}30`,borderRadius:10,padding:"12px 14px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:8,transition:"all 0.15s",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${c.color}08`;(e.currentTarget as HTMLElement).style.borderColor=c.color;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#fff";(e.currentTarget as HTMLElement).style.borderColor=`${c.color}30`;}}>
              <div style={{width:32,height:32,borderRadius:8,background:`${c.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <c.icon style={{width:16,height:16,color:c.color}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#323130"}}>{c.label}</div>
                {c.count>0 && <div style={{fontSize:10,color:c.color,fontWeight:600}}>{c.count} records</div>}
              </div>
            </button>
          ))}
        </div>

        {/* Budget Progress */}
        {budRows.length > 0 && (
          <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,border:"1px solid #edebe9",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",background:"#C45911",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{color:"#fff",fontWeight:800,fontSize:12}}>Budget Utilisation by Department</span>
              <button onClick={()=>navigate("/financials/budgets")} style={{color:"rgba(255,255,255,0.7)",background:"none",border:"none",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                Manage <ArrowRight style={{width:12,height:12}}/>
              </button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              {budRows.slice(0,5).map((b:any) => {
                const util = b.allocated_amount>0 ? Math.round(Number(b.spent_amount||0)/Number(b.allocated_amount)*100) : 0;
                const barColor = util>90?"#dc2626":util>70?"#d97706":"#107c10";
                return (
                  <div key={b.id} style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:160,fontSize:11,fontWeight:600,color:"#323130",flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.budget_name}</div>
                    <div style={{flex:1,height:8,background:"transparent",borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(util,100)}%`,height:"100%",background:barColor,borderRadius:4,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{width:100,fontSize:10,textAlign:"right",color:barColor,fontWeight:700}}>{util}% · {fmt(Number(b.allocated_amount||0))}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Payment Vouchers Table */}
        <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,border:"1px solid #edebe9",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <div style={{padding:"10px 16px",background:"#0078d4",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{color:"#fff",fontWeight:800,fontSize:12}}>Recent Payment Vouchers</span>
            <button onClick={()=>navigate("/vouchers/payment")} style={{color:"rgba(255,255,255,0.7)",background:"none",border:"none",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              View all <ArrowRight style={{width:12,height:12}}/>
            </button>
          </div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"transparent"}}>
                {["Voucher No.","Date","Payee","Account","Amount","Status"].map(h=>(
                  <th key={h} style={{padding:"8px 16px",textAlign:"left",fontWeight:700,color:"#605e5c",fontSize:10,borderBottom:"1px solid #edebe9"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPV.length === 0 ? (
                <tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#a19f9d"}}>No payment vouchers yet</td></tr>
              ) : recentPV.map((v:any,i:number)=>{
                const sc = STATUS_COLORS[v.status] || {bg:"#f3f4f6",text:"#374151"};
                return (
                  <tr key={v.id} onClick={()=>navigate("/vouchers/payment")} style={{background:i%2===0?"#fff":"#faf9f8",borderBottom:"1px solid #f3f2f1",cursor:"pointer"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#eff6ff"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#faf9f8"}>
                    <td style={{padding:"8px 16px",fontWeight:700,color:"#0078d4"}}>{v.voucher_number}</td>
                    <td style={{padding:"8px 16px",color:"#605e5c"}}>{v.voucher_date?new Date(v.voucher_date).toLocaleDateString("en-KE",{month:"short",day:"2-digit"}):"—"}</td>
                    <td style={{padding:"8px 16px",color:"#323130"}}>{v.payee_name||"—"}</td>
                    <td style={{padding:"8px 16px",color:"#605e5c"}}>{v.account_name||"—"}</td>
                    <td style={{padding:"8px 16px",fontWeight:700,color:"#323130"}}>KES {Number(v.amount||0).toLocaleString()}</td>
                    <td style={{padding:"8px 16px"}}>
                      <span style={{background:sc.bg,color:sc.text,padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,textTransform:"capitalize"}}>{v.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
