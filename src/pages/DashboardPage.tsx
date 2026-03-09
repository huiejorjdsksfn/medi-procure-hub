import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ERPWheelButton from "@/components/ERPWheelButton";
import {
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Plus, Calendar, FileCheck, BookMarked,
  Building2, Home, Search, Mail, Settings, ChevronDown, RefreshCw,
  Grid2x2, Bell, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Users, Activity, Zap
} from "lucide-react";

const fmtKES = (n: number) =>
  n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M`
  : n >= 1000    ? `KES ${(n/1000).toFixed(1)}K`
  : `KES ${n.toFixed(0)}`;

const STATUS: Record<string,{bg:string;color:string}> = {
  pending:   {bg:"#fef3c7",color:"#92400e"},
  approved:  {bg:"#dcfce7",color:"#15803d"},
  rejected:  {bg:"#fee2e2",color:"#dc2626"},
  draft:     {bg:"#f3f4f6",color:"#6b7280"},
  submitted: {bg:"#dbeafe",color:"#1d4ed8"},
  active:    {bg:"#dbeafe",color:"#1e40af"},
  issued:    {bg:"#ede9fe",color:"#5b21b6"},
  received:  {bg:"#dcfce7",color:"#15803d"},
  completed: {bg:"#dcfce7",color:"#15803d"},
  paid:      {bg:"#dcfce7",color:"#15803d"},
};

/* ── QUICK ACTIONS (role-filtered) ── */
const QUICK_ACTIONS_BY_ROLE: Record<string,{label:string;path:string;icon:any;color:string}[]> = {
  admin: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList, color:"#0078d4"},
    {label:"New Purchase Order", path:"/purchase-orders",      icon:ShoppingCart,  color:"#C45911"},
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,       color:"#107c10"},
    {label:"Payment Voucher",    path:"/vouchers/payment",     icon:DollarSign,    color:"#5C2D91"},
    {label:"New Tender",         path:"/tenders",              icon:Gavel,         color:"#1F6090"},
    {label:"Admin Panel",        path:"/admin/panel",          icon:Settings,      color:"#374151"},
    {label:"Send Email",         path:"/email",                icon:Mail,          color:"#c0185a"},
    {label:"User Management",    path:"/users",                icon:Users,         color:"#4b4b9b"},
  ],
  procurement_manager: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList, color:"#0078d4"},
    {label:"Approve POs",        path:"/purchase-orders",      icon:ShoppingCart,  color:"#C45911"},
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,       color:"#107c10"},
    {label:"Payment Voucher",    path:"/vouchers/payment",     icon:DollarSign,    color:"#5C2D91"},
    {label:"New Tender",         path:"/tenders",              icon:Gavel,         color:"#1F6090"},
    {label:"Suppliers",          path:"/suppliers",            icon:Truck,         color:"#374151"},
    {label:"Contracts",          path:"/contracts",            icon:FileCheck,     color:"#00695C"},
    {label:"Send Email",         path:"/email",                icon:Mail,          color:"#c0185a"},
  ],
  procurement_officer: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList, color:"#0078d4"},
    {label:"Purchase Orders",    path:"/purchase-orders",      icon:ShoppingCart,  color:"#C45911"},
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,       color:"#107c10"},
    {label:"Suppliers",          path:"/suppliers",            icon:Truck,         color:"#374151"},
    {label:"Send Email",         path:"/email",                icon:Mail,          color:"#c0185a"},
    {label:"Documents",          path:"/documents",            icon:FileText,      color:"#2d6a4f"},
  ],
  inventory_manager: [
    {label:"Manage Items",       path:"/items",                icon:Package,       color:"#107c10"},
    {label:"Categories",         path:"/categories",           icon:Building2,     color:"#374151"},
    {label:"Departments",        path:"/departments",          icon:Building2,     color:"#0078d4"},
    {label:"Barcode Scanner",    path:"/scanner",              icon:Search,        color:"#C45911"},
    {label:"Reports",            path:"/reports",              icon:BarChart3,     color:"#5C2D91"},
  ],
  warehouse_officer: [
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,       color:"#107c10"},
    {label:"Barcode Scanner",    path:"/scanner",              icon:Search,        color:"#C45911"},
    {label:"Items",              path:"/items",                icon:Package,       color:"#374151"},
    {label:"Quality Check",      path:"/quality/inspections",  icon:Shield,        color:"#00695C"},
  ],
  requisitioner: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList, color:"#0078d4"},
    {label:"My Requisitions",    path:"/requisitions",         icon:ClipboardList, color:"#374151"},
    {label:"Inbox",              path:"/inbox",                icon:Mail,          color:"#c0185a"},
  ],
};

/* ── MINI BAR CHART ── */
function MiniBar({ data }: { data:{label:string;value:number;color:string}[] }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height:50,paddingTop:4}}>
      {data.map((d,i)=>(
        <div key={i} title={`${d.label}: ${d.value}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{width:"100%",height:`${(d.value/max)*44}px`,background:d.color,borderRadius:"2px 2px 0 0",minHeight:3,transition:"height 0.5s"}}/>
          <span style={{fontSize:8,color:"#9ca3af",textAlign:"center",lineHeight:1}}>{d.label.slice(0,5)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── STAT CARD ── */
function StatCard({label,value,sub,color,icon:Icon,trend}:{label:string;value:string;sub:string;color:string;icon:any;trend?:number}) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"14px 16px",display:"flex",flexDirection:"column",gap:8,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</span>
        <div style={{width:30,height:30,borderRadius:6,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:15,height:15,color}}/>
        </div>
      </div>
      <div style={{fontSize:22,fontWeight:800,color:"#111827",lineHeight:1}}>{value}</div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {trend!==undefined && (
          trend >= 0
            ? <span style={{display:"flex",alignItems:"center",gap:2,fontSize:10,color:"#15803d",fontWeight:700}}><TrendingUp style={{width:10,height:10}}/>+{trend}%</span>
            : <span style={{display:"flex",alignItems:"center",gap:2,fontSize:10,color:"#dc2626",fontWeight:700}}><TrendingDown style={{width:10,height:10}}/>{trend}%</span>
        )}
        <span style={{fontSize:10,color:"#9ca3af"}}>{sub}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();

  const primaryRole = (
    roles.includes("admin")               ? "admin" :
    roles.includes("procurement_manager") ? "procurement_manager" :
    roles.includes("procurement_officer") ? "procurement_officer" :
    roles.includes("inventory_manager")   ? "inventory_manager" :
    roles.includes("warehouse_officer")   ? "warehouse_officer" : "requisitioner"
  ) as keyof typeof QUICK_ACTIONS_BY_ROLE;

  const [loading,    setLoading]    = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats,      setStats]      = useState({ reqs:0, pos:0, grns:0, pendingAmt:0, approvedAmt:0, suppliers:0 });
  const [chartData,  setChartData]  = useState<{label:string;value:number;color:string}[]>([]);
  const [actTab,     setActTab]     = useState<"reqs"|"pos"|"grns">("reqs");
  const [search,     setSearch]     = useState("");
  const [logoUrl,    setLogoUrl]    = useState<string|null>(null);
  const [sysName,    setSysName]    = useState("EL5 MediProcure");
  const [notifs,     setNotifs]     = useState<any[]>([]);

  const quickActions = QUICK_ACTIONS_BY_ROLE[primaryRole] || QUICK_ACTIONS_BY_ROLE.requisitioner;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rD, pD, gD, supD, rr, rp, rg, notifD, settD] = await Promise.all([
        (supabase as any).from("requisitions").select("status,total_amount").limit(200),
        (supabase as any).from("purchase_orders").select("status,total_amount").limit(200),
        (supabase as any).from("goods_received").select("id",{count:"exact",head:true}).limit(1),
        (supabase as any).from("suppliers").select("id",{count:"exact",head:true}).limit(1),
        (supabase as any).from("requisitions").select("requisition_number,status,total_amount,requested_by_name,department_name,created_at").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("purchase_orders").select("po_number,status,total_amount,supplier_name,created_by_name,created_at").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("goods_received").select("grn_number,po_number,received_by_name,status,created_at").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("notifications").select("*").eq("is_read",false).order("created_at",{ascending:false}).limit(5),
        (supabase as any).from("system_settings").select("key,value").in("key",["system_name","system_logo_url"]),
      ]);

      // Stats
      const allReqs = rD.data||[];
      const allPos  = pD.data||[];
      const pendingAmt = allReqs.filter((r:any)=>r.status==="pending").reduce((s:number,r:any)=>s+Number(r.total_amount||0),0);
      const approvedAmt= allPos.filter((p:any)=>p.status==="approved"||p.status==="issued").reduce((s:number,p:any)=>s+Number(p.total_amount||0),0);
      setStats({
        reqs: allReqs.length, pos: allPos.length,
        grns: gD.count||0, suppliers: supD.count||0,
        pendingAmt, approvedAmt,
      });

      // Chart
      const stC: Record<string,{v:number;c:string}> = {
        draft:{v:0,c:"#9ca3af"}, pending:{v:0,c:"#f59e0b"},
        approved:{v:0,c:"#22c55e"}, rejected:{v:0,c:"#ef4444"},
        issued:{v:0,c:"#60a5fa"}, received:{v:0,c:"#10b981"},
      };
      allReqs.forEach((r:any)=>{ if(stC[r.status]) stC[r.status].v++; });
      setChartData(Object.entries(stC).filter(([,d])=>d.v>0).map(([l,d])=>({label:l,value:d.v,color:d.c})));

      // Activities
      setActivities([
        ...(rr.data||[]).map((r:any)=>({_tab:"reqs",subject:r.requisition_number||"—",regarding:r.department_name||"—",type:"Requisition",status:r.status||"draft",owner:r.requested_by_name||"—",amount:r.total_amount,date:r.created_at})),
        ...(rp.data||[]).map((r:any)=>({_tab:"pos",subject:r.po_number||"—",regarding:r.supplier_name||"—",type:"Purchase Order",status:r.status||"draft",owner:r.created_by_name||"—",amount:r.total_amount,date:r.created_at})),
        ...(rg.data||[]).map((r:any)=>({_tab:"grns",subject:r.grn_number||"—",regarding:r.po_number||"—",type:"GRN",status:r.status||"draft",owner:r.received_by_name||"—",amount:null,date:r.created_at})),
      ]);
      setNotifs(notifD.data||[]);

      // Settings
      const m: Record<string,string> = {};
      (settD.data||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value; });
      if(m.system_name) setSysName(m.system_name);
      if(m.system_logo_url) setLogoUrl(m.system_logo_url);
    } catch(e){ console.error("Dashboard error:",e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch=(supabase as any).channel("dash-rt2")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},()=>load())
      .subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[load]);

  const visActs = activities.filter(r=>{
    const ok = actTab==="reqs"?r._tab==="reqs":actTab==="pos"?r._tab==="pos":r._tab==="grns";
    const s  = !search||Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()));
    return ok&&s;
  });
  const actPath = actTab==="reqs"?"/requisitions":actTab==="pos"?"/purchase-orders":"/goods-received";

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f4f6f9",minHeight:"calc(100vh - 57px)",padding:"12px 14px",display:"flex",flexDirection:"column",gap:12}}>

      {/* ══ WELCOME BANNER ══ */}
      <div style={{background:"linear-gradient(135deg,#0a2558 0%,#1a3a6b 60%,#1d4a87 100%)",borderRadius:10,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 4px 20px rgba(26,58,107,0.3)"}}>
        <div>
          <div style={{fontSize:13,fontWeight:800,color:"rgba(255,255,255,0.6)",marginBottom:3,letterSpacing:"0.04em"}}>WELCOME BACK</div>
          <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>{profile?.full_name || "User"}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{sysName} · {new Date().toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {notifs.length > 0 && (
            <div style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"6px 12px",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>navigate("/inbox")}>
              <Bell style={{width:14,height:14,color:"#fbbf24"}}/>
              <span style={{fontSize:11,color:"#fff",fontWeight:700}}>{notifs.length} alerts</span>
            </div>
          )}
          <button onClick={load} disabled={loading} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",color:"rgba(255,255,255,0.7)"}}>
            <RefreshCw style={{width:14,height:14}} className={loading?"animate-spin":""}/>
          </button>
        </div>
      </div>

      {/* ══ STAT CARDS ══ */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        <StatCard label="Requisitions" value={String(stats.reqs)} sub="total records" color="#0078d4" icon={ClipboardList} trend={5}/>
        <StatCard label="Purchase Orders" value={String(stats.pos)} sub="total records" color="#C45911" icon={ShoppingCart}/>
        <StatCard label="GRNs" value={String(stats.grns)} sub="received" color="#107c10" icon={Package} trend={2}/>
        <StatCard label="Suppliers" value={String(stats.suppliers)} sub="registered" color="#5C2D91" icon={Truck}/>
        <StatCard label="Pending Amount" value={fmtKES(stats.pendingAmt)} sub="awaiting approval" color="#f59e0b" icon={AlertCircle}/>
        <StatCard label="Approved PO Value" value={fmtKES(stats.approvedAmt)} sub="this period" color="#22c55e" icon={CheckCircle} trend={8}/>
      </div>

      {/* ══ MAIN BODY: Left content + Right Wheel ══ */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 460px",gap:12,alignItems:"start"}}>

        {/* LEFT COLUMN */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Quick Actions */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <Zap style={{width:14,height:14,color:"#f59e0b"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>Quick Actions</span>
              <span style={{fontSize:10,color:"#9ca3af",marginLeft:4}}>Role: {primaryRole.replace(/_/g," ")}</span>
            </div>
            <div style={{padding:"12px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8}}>
              {quickActions.map((qa,i)=>(
                <button key={i} onClick={()=>navigate(qa.path)}
                  style={{
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    gap:7,padding:"12px 8px",borderRadius:8,border:"1px solid #f3f4f6",
                    background:"#fafafa",cursor:"pointer",transition:"all 0.15s",
                  }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${qa.color}10`;(e.currentTarget as HTMLElement).style.borderColor=`${qa.color}40`;(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLElement).style.boxShadow=`0 4px 12px ${qa.color}20`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#fafafa";(e.currentTarget as HTMLElement).style.borderColor="#f3f4f6";(e.currentTarget as HTMLElement).style.transform="";(e.currentTarget as HTMLElement).style.boxShadow="";}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${qa.color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <qa.icon style={{width:18,height:18,color:qa.color}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:"#374151",textAlign:"center",lineHeight:1.3}}>{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Requisition status chart */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <BarChart3 style={{width:13,height:13,color:"#6b7280"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>Requisition Status</span>
              </div>
              <span style={{fontSize:10,color:"#9ca3af"}}>by count</span>
            </div>
            {loading ? <div style={{height:60,display:"flex",alignItems:"center",justifyContent:"center"}}><RefreshCw style={{width:16,height:16,color:"#d1d5db"}} className="animate-spin"/></div>
              : <MiniBar data={chartData}/>}
          </div>

          {/* All Activities */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            {/* Header */}
            <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <Activity style={{width:13,height:13,color:"#6b7280"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>All Activities</span>
              <div style={{display:"flex",marginLeft:8}}>
                {([["reqs","Requisitions"],["pos","Purchase Orders"],["grns","GRN"]] as const).map(([tab,lbl])=>(
                  <button key={tab} onClick={()=>setActTab(tab)} style={{
                    padding:"3px 10px",fontSize:11,fontWeight:600,border:"none",background:"transparent",cursor:"pointer",
                    color:actTab===tab?"#0078d4":"#9ca3af",
                    borderBottom:actTab===tab?"2px solid #0078d4":"2px solid transparent",
                  }}>{lbl}</button>
                ))}
              </div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                <div style={{position:"relative"}}>
                  <Search style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#9ca3af"}}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                    style={{paddingLeft:24,paddingRight:8,paddingTop:4,paddingBottom:4,fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,width:140,outline:"none",background:"#f9fafb"}}/>
                </div>
                <button onClick={()=>navigate(actPath)} style={{background:"#0078d4",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                  <Plus style={{width:11,height:11}}/> New
                </button>
                <button onClick={load} disabled={loading} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}>
                  <RefreshCw style={{width:12,height:12}} className={loading?"animate-spin":""}/>
                </button>
              </div>
            </div>
            {/* Table */}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#f9fafb",borderBottom:"2px solid #f3f4f6"}}>
                    {["Subject","Regarding","Type","Status","Owner","Amount","Date"].map(c=>(
                      <th key={c} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:"#9ca3af",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [1,2,3,4].map(i=>(
                        <tr key={i} style={{borderBottom:"1px solid #f9fafb"}}>
                          {[1,2,3,4,5,6,7].map(j=>(
                            <td key={j} style={{padding:"10px 12px"}}>
                              <div style={{height:10,borderRadius:4,background:"#f3f4f6",width:j===1?"70%":"50%"}} className="animate-pulse"/>
                            </td>
                          ))}
                        </tr>
                      ))
                    : visActs.length===0
                    ? <tr><td colSpan={7} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>
                        No records yet. <button onClick={()=>navigate(actPath)} style={{color:"#0078d4",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Create one →</button>
                      </td></tr>
                    : visActs.map((row,i)=>{
                        const sc = STATUS[row.status]||{bg:"#f3f4f6",color:"#6b7280"};
                        return (
                          <tr key={i} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer"}}
                            onClick={()=>navigate(actPath)}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                            <td style={{padding:"8px 12px",color:"#0078d4",fontWeight:700}}>{row.subject}</td>
                            <td style={{padding:"8px 12px",color:"#374151",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.regarding}</td>
                            <td style={{padding:"8px 12px",color:"#6b7280"}}>{row.type}</td>
                            <td style={{padding:"8px 12px"}}>
                              <span style={{background:sc.bg,color:sc.color,padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,textTransform:"capitalize" as const}}>{row.status}</span>
                            </td>
                            <td style={{padding:"8px 12px",color:"#374151",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.owner}</td>
                            <td style={{padding:"8px 12px",color:"#374151",fontWeight:600}}>{row.amount?fmtKES(Number(row.amount)):"—"}</td>
                            <td style={{padding:"8px 12px",color:"#9ca3af",whiteSpace:"nowrap"}}>
                              {new Date(row.date).toLocaleDateString("en-KE",{day:"2-digit",month:"short"})}
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — ERP WHEEL */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{textAlign:"center",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>ERP Ecosystem</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>Click any node to navigate</div>
            </div>
            <ERPWheelButton logoUrl={logoUrl}/>
          </div>

          {/* Notifications panel */}
          {notifs.length > 0 && (
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:6}}>
                <Bell style={{width:12,height:12,color:"#f59e0b"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>Notifications</span>
                <span style={{marginLeft:"auto",fontSize:10,color:"#0078d4",cursor:"pointer"}} onClick={()=>navigate("/inbox")}>View all</span>
              </div>
              {notifs.map((n,i)=>(
                <div key={i} style={{padding:"10px 14px",borderBottom:i<notifs.length-1?"1px solid #f9fafb":"none",display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#0078d4",marginTop:4,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>{n.title||"Notification"}</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>{n.message?.slice(0,60)||""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
