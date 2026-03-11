import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Mail, Settings, Users, FileText,
  Calendar, FileCheck, Search, Database, TrendingUp,
  Activity, Archive, Scale, Building2, PiggyBank,
  Layers, BookMarked, Receipt, LogOut, Bell, ChevronRight,
  Hash, RefreshCw, Plus, Eye, Edit3, Check, AlertTriangle,
  Clock, Filter, Download, Printer, MoreHorizontal, CheckCircle,
  XCircle, Cpu, Globe, Home, BookOpen
} from "lucide-react";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";

// ── Navigation modules ────────────────────────────────────────────────────
const NAV = [
  { id:"overview",       label:"Overview",           icon:Home,          path:"/dashboard" },
  { id:"requisitions",   label:"Requisitions",        icon:ClipboardList, path:"/requisitions" },
  { id:"purchase_orders",label:"Purchase Orders",     icon:ShoppingCart,  path:"/purchase-orders" },
  { id:"goods_received", label:"Goods Received",      icon:Package,       path:"/goods-received" },
  { id:"suppliers",      label:"Suppliers",           icon:Truck,         path:"/suppliers" },
  { id:"tenders",        label:"Tenders",             icon:Gavel,         path:"/tenders" },
  { id:"contracts",      label:"Contracts",           icon:FileCheck,     path:"/contracts" },
  { id:"bid_eval",       label:"Bid Evaluations",     icon:Scale,         path:"/bid-evaluations" },
  { id:"proc_plan",      label:"Procurement Plan",    icon:Calendar,      path:"/procurement-planning" },
];
const NAV2 = [
  { id:"financials",    label:"Financials",           icon:TrendingUp,    path:"/financials/dashboard" },
  { id:"budgets",       label:"Budgets",              icon:PiggyBank,     path:"/financials/budgets" },
  { id:"vouchers",      label:"Vouchers",             icon:DollarSign,    path:"/vouchers/payment" },
  { id:"inventory",     label:"Inventory",            icon:Package,       path:"/items" },
  { id:"quality",       label:"Quality Control",      icon:Shield,        path:"/quality/dashboard" },
  { id:"reports",       label:"Reports & BI",         icon:BarChart3,     path:"/reports" },
  { id:"documents",     label:"Documents",            icon:FileText,      path:"/documents" },
];
const NAV3 = [
  { id:"users",         label:"Users",                icon:Users,         path:"/users" },
  { id:"settings",      label:"Settings",             icon:Settings,      path:"/settings" },
  { id:"audit",         label:"Audit Log",            icon:Activity,      path:"/audit-log" },
  { id:"admin",         label:"Admin Panel",          icon:Cpu,           path:"/admin/panel" },
  { id:"database",      label:"Database",             icon:Database,      path:"/admin/database" },
  { id:"backup",        label:"Backup",               icon:Archive,       path:"/backup" },
  { id:"email",         label:"Mail & Inbox",         icon:Mail,          path:"/email" },
];

const STATUS_BADGE:Record<string,{bg:string;color:string;label:string}> = {
  pending:    {bg:"#fff7ed",color:"#c45911",label:"Pending"},
  approved:   {bg:"#f0fdf4",color:"#15803d",label:"Approved"},
  rejected:   {bg:"#fef2f2",color:"#dc2626",label:"Rejected"},
  draft:      {bg:"#f3f4f6",color:"#6b7280",label:"Draft"},
  completed:  {bg:"#eff6ff",color:"#1d4ed8",label:"Completed"},
  active:     {bg:"#f0fdf4",color:"#15803d",label:"Active"},
  expired:    {bg:"#fef2f2",color:"#dc2626",label:"Expired"},
  open:       {bg:"#eff6ff",color:"#0369a1",label:"Open"},
  closed:     {bg:"#f3f4f6",color:"#374151",label:"Closed"},
  low_stock:  {bg:"#fefce8",color:"#ca8a04",label:"Low Stock"},
  in_stock:   {bg:"#f0fdf4",color:"#15803d",label:"In Stock"},
};
function sb(s:string){ return STATUS_BADGE[s]||{bg:"#f3f4f6",color:"#374151",label:s}; }

function formatKES(n:number){ return `KES ${n.toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtDate(d:string){ return d?new Date(d).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}):"—"; }

interface Req  { id:string;req_number?:string;title?:string;description?:string;status:string;total_amount?:number;created_at:string;requester_name?:string; }
interface PO   { id:string;po_number?:string;supplier_name?:string;status:string;total_amount?:number;created_at:string;expected_delivery?:string; }
interface Sup  { id:string;name:string;status?:string;category?:string;contact_person?:string;phone?:string; }
interface GRN  { id:string;grn_number?:string;supplier_name?:string;status?:string;received_date?:string;created_at:string; }
interface Contract { id:string;contract_number?:string;supplier_name?:string;title?:string;status?:string;start_date?:string;end_date?:string;value?:number; }
interface Tender   { id:string;tender_number?:string;title?:string;status?:string;closing_date?:string;budget?:number; }

export default function DashboardPage(){
  const{profile,roles,signOut}=useAuth();
  const navigate=useNavigate();
  const[activeNav,setActiveNav]=useState("overview");
  const[search,setSearch]=useState("");
  const[reqs,setReqs]=useState<Req[]>([]);
  const[pos,setPOs]=useState<PO[]>([]);
  const[suppliers,setSuppliers]=useState<Sup[]>([]);
  const[grns,setGRNs]=useState<GRN[]>([]);
  const[contracts,setContracts]=useState<Contract[]>([]);
  const[tenders,setTenders]=useState<Tender[]>([]);
  const[loading,setLoading]=useState(false);
  const[sysName,setSysName]=useState("EL5 MediProcure");
  const[hospital,setHospital]=useState("Embu Level 5 Hospital");
  const primaryRole=roles[0]||"requisitioner";
  const isAdmin=roles.includes("admin");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[rr,pr,sr,gr,cr,tr,ss]=await Promise.all([
        (supabase as any).from("requisitions").select("id,req_number,title,description,status,total_amount,created_at,requester_name").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("purchase_orders").select("id,po_number,supplier_name,status,total_amount,created_at,expected_delivery").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("suppliers").select("id,name,status,category,contact_person,phone").order("name").limit(30),
        (supabase as any).from("goods_received").select("id,grn_number,supplier_name,status,received_date,created_at").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("contracts").select("id,contract_number,supplier_name,title,status,start_date,end_date,value").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("tenders").select("id,tender_number,title,status,closing_date,budget").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"]),
      ]);
      if(rr.data) setReqs(rr.data);
      if(pr.data) setPOs(pr.data);
      if(sr.data) setSuppliers(sr.data);
      if(gr.data) setGRNs(gr.data);
      if(cr.data) setContracts(cr.data);
      if(tr.data) setTenders(tr.data);
      if(ss.data){
        ss.data.forEach((r:any)=>{
          if(r.key==="system_name")setSysName(r.value||"EL5 MediProcure");
          if(r.key==="hospital_name")setHospital(r.value||"Embu Level 5 Hospital");
        });
      }
    }catch(e){ console.error("Dashboard load",e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const ROLE_LABELS:Record<string,string>={
    admin:"Administrator",procurement_manager:"Proc. Manager",
    procurement_officer:"Proc. Officer",inventory_manager:"Inventory Mgr",
    warehouse_officer:"Warehouse",requisitioner:"Requisitioner",
  };

  // ── Counts for sidebar badges ────────────────────────────────────────
  const pendingReqs=reqs.filter(r=>r.status==="pending").length;
  const pendingPOs=pos.filter(p=>p.status==="pending"||p.status==="draft").length;
  const openTenders=tenders.filter(t=>t.status==="open"||t.status==="active").length;

  const NavBtn=({item,badge=0}:{item:{id:string;label:string;icon:any;path:string};badge?:number})=>(
    <button
      onClick={()=>{setActiveNav(item.id);navigate(item.path);}}
      style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 14px",border:"none",borderRadius:8,background:activeNav===item.id?"rgba(20,184,166,0.18)":"transparent",cursor:"pointer",textAlign:"left",marginBottom:2,transition:"background 0.12s"}}>
      <item.icon style={{width:14,height:14,color:activeNav===item.id?"#14b8a6":"rgba(255,255,255,0.55)",flexShrink:0}}/>
      <span style={{flex:1,fontSize:12,fontWeight:activeNav===item.id?700:400,color:activeNav===item.id?"#fff":"rgba(255,255,255,0.65)"}}>{item.label}</span>
      {badge>0&&<span style={{minWidth:18,height:16,borderRadius:8,background:"#14b8a6",color:"#fff",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{badge}</span>}
    </button>
  );

  const inp:React.CSSProperties={width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box",color:"#111827",background:"#fff"};
  const actionBtn=(label:string,icon:any,color:string,path:string)=>{
    const Icon=icon;
    return(
      <button onClick={()=>navigate(path)}
        style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",background:"#fff",border:`1.5px solid ${color}20`,borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:700,color:color,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",transition:"all 0.14s"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${color}10`;(e.currentTarget as HTMLElement).style.borderColor=`${color}50`;}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#fff";(e.currentTarget as HTMLElement).style.borderColor=`${color}20`;}}>
        <Icon style={{width:13,height:13}}/>{label}
      </button>
    );
  };

  const tableHead=(cols:string[])=>(
    <thead>
      <tr style={{background:"#0a2558"}}>
        {cols.map(c=><th key={c} style={{textAlign:"left",padding:"10px 12px",color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{c}</th>)}
      </tr>
    </thead>
  );

  return(
    <div style={{display:"flex",height:"100%",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden",background:"#f0f2f5"}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .erp-row:hover{background:#f8faff!important;}
        .nav-sec-lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:0.1em;padding:8px 14px 4px;display:block;}
      `}</style>

      {/* ════════ DARK SIDEBAR ════════ */}
      <div style={{width:220,flexShrink:0,background:"#111827",display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
        {/* Logo */}
        <div style={{padding:"16px 14px 12px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <img src={logoImg} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"rgba(255,255,255,0.1)",padding:3}}/>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"#fff",lineHeight:1}}>{sysName}</div>
              <div style={{fontSize:8.5,color:"rgba(255,255,255,0.35)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{hospital}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,overflowY:"auto",padding:"8px 6px"}}>
          <span className="nav-sec-lbl">Procurement</span>
          {NAV.map(n=><NavBtn key={n.id} item={n} badge={n.id==="requisitions"?pendingReqs:n.id==="purchase_orders"?pendingPOs:n.id==="tenders"?openTenders:0}/>)}

          <span className="nav-sec-lbl" style={{marginTop:6}}>Finance & Ops</span>
          {NAV2.map(n=><NavBtn key={n.id} item={n}/>)}

          {isAdmin&&<>
            <span className="nav-sec-lbl" style={{marginTop:6}}>Administration</span>
            {NAV3.map(n=><NavBtn key={n.id} item={n}/>)}
          </>}
        </nav>

        {/* User */}
        <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>
              {(profile?.full_name||"U")[0].toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||"User"}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{ROLE_LABELS[primaryRole]||"Staff"}</div>
            </div>
          </div>
          <button onClick={()=>{signOut();navigate("/login");}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"6px 10px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,cursor:"pointer",color:"#f87171",fontSize:11,fontWeight:600}}>
            <LogOut style={{width:11,height:11}}/>Sign Out
          </button>
        </div>
      </div>

      {/* ════════ MAIN CONTENT ════════ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Top bar */}
        <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 20px",height:56,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1}}>Hello, {profile?.full_name?.split(" ")[0]||"Staff"}</div>
            <div style={{fontSize:10,color:"#9ca3af",marginTop:1,display:"flex",alignItems:"center",gap:4}}>
              <ChevronRight style={{width:9,height:9}}/>{new Date().toLocaleDateString("en-KE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
          <div style={{flex:1,maxWidth:340,position:"relative",marginLeft:20}}>
            <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requisitions, POs, suppliers..."
              style={{...inp,paddingLeft:32,height:34,fontSize:12}}/>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <button onClick={load} style={{padding:6,borderRadius:7,border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",lineHeight:0}}>
              <RefreshCw style={{width:13,height:13,color:"#6b7280",animation:loading?"spin 1s linear infinite":undefined}}/>
            </button>
            <button onClick={()=>navigate("/email")} style={{padding:6,borderRadius:7,border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",lineHeight:0}}>
              <Bell style={{width:13,height:13,color:"#6b7280"}}/>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>

          {/* ── QUICK ACTION BUTTONS ROW ── */}
          <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" as const}}>
            {actionBtn("New Requisition",ClipboardList,"#0a2558","/requisitions")}
            {actionBtn("New PO",ShoppingCart,"#C45911","/purchase-orders")}
            {actionBtn("Receive Goods",Package,"#107c10","/goods-received")}
            {actionBtn("Payment Voucher",DollarSign,"#5C2D91","/vouchers/payment")}
            {actionBtn("New Tender",Gavel,"#1F6090","/tenders")}
            {actionBtn("Add Supplier",Truck,"#374151","/suppliers")}
          </div>

          {/* ── THREE COLUMN LAYOUT ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

            {/* ── RECENT REQUISITIONS ── */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <ClipboardList style={{width:15,height:15,color:"#0a2558"}}/>
                  <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Recent Requisitions</span>
                  {pendingReqs>0&&<span style={{padding:"2px 7px",borderRadius:20,background:"#fff7ed",color:"#c45911",fontSize:10,fontWeight:700}}>{pendingReqs} pending</span>}
                </div>
                <button onClick={()=>navigate("/requisitions")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  View All<ChevronRight style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {tableHead(["Ref #","Title","Status","Amount","Date"])}
                  <tbody>
                    {reqs.filter(r=>!search||r.title?.toLowerCase().includes(search.toLowerCase())||r.req_number?.toLowerCase().includes(search.toLowerCase())).slice(0,8).map((r,i)=>{
                      const s=sb(r.status);
                      return(
                        <tr key={r.id} className="erp-row" style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer"}} onClick={()=>navigate("/requisitions")}>
                          <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#0a2558",whiteSpace:"nowrap"}}>{r.req_number||`REQ-${String(i+1).padStart(3,"0")}`}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#374151",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title||r.description||"Requisition"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{s.label}</span></td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#111827",whiteSpace:"nowrap"}}>{r.total_amount?formatKES(r.total_amount):"—"}</td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#9ca3af",whiteSpace:"nowrap"}}>{fmtDate(r.created_at)}</td>
                        </tr>
                      );
                    })}
                    {reqs.length===0&&<tr><td colSpan={5} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No requisitions found</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>navigate("/requisitions")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#0a2558",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/>New Requisition
                </button>
                <button onClick={()=>navigate("/requisitions")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#fff",color:"#374151",border:"1.5px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:11}}>
                  <Eye style={{width:11,height:11}}/>View All
                </button>
              </div>
            </div>

            {/* ── PURCHASE ORDERS ── */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <ShoppingCart style={{width:15,height:15,color:"#C45911"}}/>
                  <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Purchase Orders</span>
                  {pendingPOs>0&&<span style={{padding:"2px 7px",borderRadius:20,background:"#fff7ed",color:"#c45911",fontSize:10,fontWeight:700}}>{pendingPOs} pending</span>}
                </div>
                <button onClick={()=>navigate("/purchase-orders")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  View All<ChevronRight style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {tableHead(["PO #","Supplier","Status","Amount","Delivery"])}
                  <tbody>
                    {pos.filter(p=>!search||p.po_number?.toLowerCase().includes(search.toLowerCase())||p.supplier_name?.toLowerCase().includes(search.toLowerCase())).slice(0,8).map((p,i)=>{
                      const s=sb(p.status);
                      return(
                        <tr key={p.id} className="erp-row" style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer"}} onClick={()=>navigate("/purchase-orders")}>
                          <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#C45911",whiteSpace:"nowrap"}}>{p.po_number||`LPO-${String(i+1).padStart(3,"0")}`}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#374151",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.supplier_name||"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{s.label}</span></td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#111827",whiteSpace:"nowrap"}}>{p.total_amount?formatKES(p.total_amount):"—"}</td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#9ca3af",whiteSpace:"nowrap"}}>{fmtDate(p.expected_delivery||p.created_at)}</td>
                        </tr>
                      );
                    })}
                    {pos.length===0&&<tr><td colSpan={5} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No purchase orders found</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>navigate("/purchase-orders")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#C45911",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/>New PO
                </button>
                <button onClick={()=>navigate("/purchase-orders")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#fff",color:"#374151",border:"1.5px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:11}}>
                  <Eye style={{width:11,height:11}}/>View All
                </button>
              </div>
            </div>
          </div>

          {/* ── SECOND ROW: Suppliers + Tenders ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

            {/* SUPPLIERS */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Truck style={{width:15,height:15,color:"#374151"}}/>
                  <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Suppliers</span>
                  <span style={{padding:"2px 7px",borderRadius:20,background:"#f3f4f6",color:"#374151",fontSize:10,fontWeight:700}}>{suppliers.length} registered</span>
                </div>
                <button onClick={()=>navigate("/suppliers")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  View All<ChevronRight style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {tableHead(["Supplier Name","Category","Contact","Status"])}
                  <tbody>
                    {suppliers.filter(s=>!search||s.name?.toLowerCase().includes(search.toLowerCase())).slice(0,8).map(s=>{
                      const st=sb(s.status||"active");
                      return(
                        <tr key={s.id} className="erp-row" style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer"}} onClick={()=>navigate("/suppliers")}>
                          <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#374151",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#6b7280"}}>{s.category||"General"}</td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#6b7280",whiteSpace:"nowrap"}}>{s.contact_person||s.phone||"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:st.bg,color:st.color}}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                    {suppliers.length===0&&<tr><td colSpan={4} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No suppliers found</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>navigate("/suppliers")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#374151",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/>Add Supplier
                </button>
              </div>
            </div>

            {/* TENDERS */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Gavel style={{width:15,height:15,color:"#1F6090"}}/>
                  <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Tenders</span>
                  {openTenders>0&&<span style={{padding:"2px 7px",borderRadius:20,background:"#eff6ff",color:"#0369a1",fontSize:10,fontWeight:700}}>{openTenders} open</span>}
                </div>
                <button onClick={()=>navigate("/tenders")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  View All<ChevronRight style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {tableHead(["Tender #","Title","Status","Budget","Closes"])}
                  <tbody>
                    {tenders.filter(t=>!search||t.title?.toLowerCase().includes(search.toLowerCase())||t.tender_number?.toLowerCase().includes(search.toLowerCase())).slice(0,8).map((t,i)=>{
                      const s=sb(t.status||"open");
                      return(
                        <tr key={t.id} className="erp-row" style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer"}} onClick={()=>navigate("/tenders")}>
                          <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#1F6090",whiteSpace:"nowrap"}}>{t.tender_number||`TDR-${String(i+1).padStart(3,"0")}`}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#374151",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title||"Tender"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{s.label}</span></td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#111827",whiteSpace:"nowrap"}}>{t.budget?formatKES(t.budget):"—"}</td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#9ca3af",whiteSpace:"nowrap"}}>{fmtDate(t.closing_date||"")}</td>
                        </tr>
                      );
                    })}
                    {tenders.length===0&&<tr><td colSpan={5} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No tenders found</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>navigate("/tenders")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1F6090",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/>New Tender
                </button>
              </div>
            </div>
          </div>

          {/* ── THIRD ROW: GRNs + Contracts ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

            {/* GRNs */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Package style={{width:15,height:15,color:"#107c10"}}/>
                  <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Goods Received (GRN)</span>
                </div>
                <button onClick={()=>navigate("/goods-received")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  View All<ChevronRight style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {tableHead(["GRN #","Supplier","Status","Received Date"])}
                  <tbody>
                    {grns.slice(0,8).map((g,i)=>{
                      const s=sb(g.status||"completed");
                      return(
                        <tr key={g.id} className="erp-row" style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer"}} onClick={()=>navigate("/goods-received")}>
                          <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#107c10",whiteSpace:"nowrap"}}>{g.grn_number||`GRN-${String(i+1).padStart(3,"0")}`}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#374151",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.supplier_name||"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span></td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#9ca3af",whiteSpace:"nowrap"}}>{fmtDate(g.received_date||g.created_at)}</td>
                        </tr>
                      );
                    })}
                    {grns.length===0&&<tr><td colSpan={4} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No GRNs found</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>navigate("/goods-received")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#107c10",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/>Receive Goods
                </button>
              </div>
            </div>

            {/* CONTRACTS */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <FileCheck style={{width:15,height:15,color:"#0369a1"}}/>
                  <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Contracts</span>
                </div>
                <button onClick={()=>navigate("/contracts")} style={{fontSize:11,color:"#0a2558",background:"none",border:"none",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  View All<ChevronRight style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {tableHead(["Contract #","Supplier","Value","Status","Expires"])}
                  <tbody>
                    {contracts.filter(c=>!search||c.supplier_name?.toLowerCase().includes(search.toLowerCase())||c.contract_number?.toLowerCase().includes(search.toLowerCase())).slice(0,8).map((c,i)=>{
                      const s=sb(c.status||"active");
                      return(
                        <tr key={c.id} className="erp-row" style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer"}} onClick={()=>navigate("/contracts")}>
                          <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#0369a1",whiteSpace:"nowrap"}}>{c.contract_number||`CNT-${String(i+1).padStart(3,"0")}`}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#374151",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.supplier_name||"—"}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:"#111827",whiteSpace:"nowrap"}}>{c.value?formatKES(c.value):"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span></td>
                          <td style={{padding:"9px 12px",fontSize:10,color:"#9ca3af",whiteSpace:"nowrap"}}>{fmtDate(c.end_date||"")}</td>
                        </tr>
                      );
                    })}
                    {contracts.length===0&&<tr><td colSpan={5} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No contracts found</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>navigate("/contracts")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#0369a1",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <Plus style={{width:11,height:11}}/>New Contract
                </button>
              </div>
            </div>
          </div>

          {/* ── PENDING APPROVALS PANEL ── */}
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",marginBottom:16}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Clock style={{width:15,height:15,color:"#d97706"}}/>
                <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Pending Approvals</span>
                <span style={{padding:"2px 7px",borderRadius:20,background:"#fff7ed",color:"#d97706",fontSize:10,fontWeight:700}}>{pendingReqs+pendingPOs} items</span>
              </div>
            </div>
            <div style={{padding:"12px 16px",display:"flex",gap:10,flexWrap:"wrap" as const}}>
              {[...reqs.filter(r=>r.status==="pending").slice(0,4).map(r=>({type:"REQ",ref:r.req_number||r.id.slice(-6),label:r.title||"Requisition",amount:r.total_amount,path:"/requisitions",color:"#0a2558"})),
                ...pos.filter(p=>p.status==="pending").slice(0,4).map(p=>({type:"LPO",ref:p.po_number||p.id.slice(-6),label:p.supplier_name||"Purchase Order",amount:p.total_amount,path:"/purchase-orders",color:"#C45911"})),
              ].map((item,i)=>(
                <div key={i} onClick={()=>navigate(item.path)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f9fafb",borderRadius:10,border:"1px solid #e5e7eb",cursor:"pointer",flex:"1 1 200px",minWidth:200,transition:"all 0.14s"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0f6ff"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}>
                  <div style={{width:32,height:32,borderRadius:8,background:`${item.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Clock style={{width:14,height:14,color:item.color}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:item.color}}>{item.type} · {item.ref}</div>
                    <div style={{fontSize:11,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</div>
                    {item.amount&&<div style={{fontSize:10,color:"#9ca3af"}}>{formatKES(item.amount)}</div>}
                  </div>
                  <span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:"#fff7ed",color:"#c45911",flexShrink:0}}>Pending</span>
                </div>
              ))}
              {pendingReqs+pendingPOs===0&&<div style={{padding:"20px",color:"#9ca3af",fontSize:12,width:"100%",textAlign:"center"}}><CheckCircle style={{width:20,height:20,color:"#22c55e",display:"inline",marginRight:6}}/>All caught up — no pending approvals</div>}
            </div>
          </div>

          {/* Footer */}
          <div style={{textAlign:"center",padding:"8px 0 4px",fontSize:10,color:"#9ca3af"}}>
            {sysName} · {hospital} · Embu County Government
          </div>
        </div>
      </div>
    </div>
  );
}
