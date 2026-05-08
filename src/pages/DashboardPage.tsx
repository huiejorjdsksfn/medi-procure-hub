/**
 * ProcurBosse - Dashboard v8.0 (Microsoft Dynamics 365 Module Tiles)
 * D365 CRM-style colored module tiles, role-based, no charts/wheel
 * Reception/Comm available to ALL roles, KPI bar at top
 * EL5 MediProcure, Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { pageCache } from "@/lib/pageCache";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";
import {
  ShoppingCart, Package, DollarSign, Truck, BarChart3,
  Clock, AlertTriangle, Activity, Users, FileText, Bell,
  Phone, MessageSquare, RefreshCw, ChevronRight, Shield,
  Globe, Calendar, Star, Zap, Home, TrendingUp, PiggyBank,
  BookOpen, Building2, Layers, Scale, Gavel, Search, Archive,
  Database, Settings, Wrench, Lock, Mail, ClipboardList,
  Receipt, BookMarked, Eye, BarChart2
} from "lucide-react";

const db = supabase as any;

interface ModuleTile {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  icon: any;
  path: string;
  roles: string[];
  badge?: string;
}

const ALL_TILES: ModuleTile[] = [
  { id:"reception", label:"Reception", subtitle:"Front desk & visitor log", color:"#0072c6", icon:Users, path:"/reception", roles:[] },
  { id:"comms", label:"Communications", subtitle:"Email, SMS, Telephony", color:"#0078d4", icon:MessageSquare, path:"/email", roles:[] },
  { id:"inbox", label:"Inbox", subtitle:"Internal messages", color:"#038387", icon:Mail, path:"/inbox", roles:[] },
  { id:"notifs", label:"Notifications", subtitle:"System alerts", color:"#d83b01", icon:Bell, path:"/notifications", roles:[], badge:"notifications" },
  { id:"sms", label:"SMS", subtitle:"Twilio bulk messaging", color:"#0072c6", icon:MessageSquare, path:"/sms", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner"] },
  { id:"telephony", label:"Telephony", subtitle:"Call log and voice", color:"#0078d4", icon:Phone, path:"/telephony", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner"] },
  { id:"reqs", label:"Requisitions", subtitle:"Create and track requests", color:"#0078d4", icon:ClipboardList, path:"/requisitions", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"], badge:"requisitions" },
  { id:"pos", label:"Purchase Orders", subtitle:"Issue and manage POs", color:"#106ebe", icon:ShoppingCart, path:"/purchase-orders", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant"], badge:"purchase_orders" },
  { id:"grn", label:"Goods Received", subtitle:"Record and verify deliveries", color:"#005a9e", icon:Package, path:"/goods-received", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","warehouse_officer","inventory_manager","accountant"], badge:"goods_received" },
  { id:"suppliers", label:"Suppliers", subtitle:"Vendor management", color:"#004578", icon:Truck, path:"/suppliers", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"] },
  { id:"tenders", label:"Tenders", subtitle:"Open tenders and bids", color:"#00188f", icon:Gavel, path:"/tenders", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"] },
  { id:"contracts", label:"Contracts", subtitle:"Active supplier contracts", color:"#0078d4", icon:FileText, path:"/contracts", roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"bideval", label:"Bid Evaluations", subtitle:"Evaluate tender bids", color:"#106ebe", icon:Scale, path:"/bid-evaluations", roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"procplan", label:"Proc. Planning", subtitle:"Annual procurement plan", color:"#005a9e", icon:Calendar, path:"/procurement-planning", roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"finance", label:"Finance", subtitle:"Overview and budgets", color:"#7719aa", icon:DollarSign, path:"/financials/dashboard", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"budgets", label:"Budgets", subtitle:"Vote heads and allocations", color:"#8764b8", icon:PiggyBank, path:"/financials/budgets", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"accounts", label:"Chart of Accounts", subtitle:"GL accounts and mapping", color:"#b4009e", icon:BookOpen, path:"/financials/chart-of-accounts", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"assets", label:"Fixed Assets", subtitle:"Asset register", color:"#7719aa", icon:Building2, path:"/financials/fixed-assets", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"pvouchers", label:"Pay Vouchers", subtitle:"Payment voucher processing", color:"#d83b01", icon:Receipt, path:"/vouchers/payment", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant"], badge:"payment_vouchers" },
  { id:"rvouchers", label:"Receipt Vouchers", subtitle:"Receipt documentation", color:"#a4262c", icon:FileText, path:"/vouchers/receipt", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"jvouchers", label:"Journal Vouchers", subtitle:"Journal entries", color:"#7719aa", icon:BookMarked, path:"/vouchers/journal", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"acctws", label:"Accountant WS", subtitle:"Workspace and reconciliation", color:"#5c2d91", icon:BarChart2, path:"/accountant-workspace", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"items", label:"Items / Stock", subtitle:"Inventory and stock levels", color:"#038387", icon:Package, path:"/items", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"], badge:"low_stock" },
  { id:"categories", label:"Categories", subtitle:"Item classifications", color:"#007d79", icon:Layers, path:"/categories", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"] },
  { id:"departments", label:"Departments", subtitle:"Hospital departments", color:"#038387", icon:Building2, path:"/departments", roles:["admin","superadmin","webmaster","procurement_manager","inventory_manager"] },
  { id:"scanner", label:"Scanner", subtitle:"Barcode and QR scanner", color:"#005b70", icon:Search, path:"/scanner", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"] },
  { id:"quality", label:"Quality Control", subtitle:"QC dashboard", color:"#498205", icon:Shield, path:"/quality/dashboard", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"] },
  { id:"inspect", label:"Inspections", subtitle:"Goods inspection records", color:"#3f7305", icon:Eye, path:"/quality/inspections", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"] },
  { id:"nonconf", label:"Non-Conformance", subtitle:"NCR tracking", color:"#498205", icon:AlertTriangle, path:"/quality/non-conformance", roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"] },
  { id:"reports", label:"Reports & BI", subtitle:"Analytics and data exports", color:"#5c2d91", icon:BarChart3, path:"/reports", roles:[] },
  { id:"documents", label:"Documents", subtitle:"Document library", color:"#374151", icon:FileText, path:"/documents", roles:[] },
  { id:"audit", label:"Audit Log", subtitle:"System activity trail", color:"#5c2d91", icon:Activity, path:"/audit-log", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"users", label:"Users", subtitle:"User accounts and roles", color:"#00188f", icon:Users, path:"/users", roles:["admin","superadmin","webmaster","database_admin"] },
  { id:"settings", label:"Settings", subtitle:"System configuration", color:"#00188f", icon:Wrench, path:"/settings", roles:["admin","superadmin","webmaster"] },
  { id:"adminpanel", label:"Admin Panel", subtitle:"Full admin controls", color:"#a4262c", icon:Settings, path:"/admin/panel", roles:["admin","superadmin","webmaster"] },
  { id:"database", label:"Database", subtitle:"DBGate browser and SQL", color:"#00188f", icon:Database, path:"/admin/database", roles:["admin","superadmin","webmaster","database_admin"] },
  { id:"dbmonitor", label:"DB Monitor", subtitle:"Connection and health tests", color:"#038387", icon:Activity, path:"/admin/db-test", roles:["admin","superadmin","webmaster","database_admin"] },
  { id:"backup", label:"Backup", subtitle:"Data backup and restore", color:"#005a9e", icon:Archive, path:"/backup", roles:["admin","superadmin","database_admin"] },
  { id:"facilities", label:"Facilities", subtitle:"Hospital facilities", color:"#00188f", icon:Building2, path:"/facilities", roles:["admin","superadmin","webmaster"] },
  { id:"webmaster", label:"Webmaster", subtitle:"Module and system controls", color:"#d83b01", icon:Globe, path:"/webmaster", roles:["admin","superadmin","webmaster"] },
];

function KPICard({label,value,color,icon:Icon,onClick}:{label:string;value:number|string;color:string;icon:any;onClick?:()=>void}) {
  return (
    <div onClick={onClick}
      style={{background:"#fff",border:"1px solid "+T.border,borderRadius:T.rLg,padding:"12px 14px",cursor:onClick?"pointer":"default",
        display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 4px rgba(0,0,0,.05)",transition:"all .15s"}}
      onMouseEnter={e=>{if(onClick){(e.currentTarget as any).style.borderColor=color;(e.currentTarget as any).style.boxShadow="0 2px 12px "+color+"22";}}}
      onMouseLeave={e=>{if(onClick){(e.currentTarget as any).style.borderColor=T.border;(e.currentTarget as any).style.boxShadow="0 1px 4px rgba(0,0,0,.05)";}}}
    >
      <div style={{width:36,height:36,borderRadius:T.rMd,background:color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon size={17} color={color}/>
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:20,fontWeight:800,color,lineHeight:1,marginBottom:1}}>{typeof value==="number"?value.toLocaleString():value}</div>
        <div style={{fontSize:10,color:T.fgMuted,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
      </div>
    </div>
  );
}

function Tile({tile,badge,nav}:{tile:ModuleTile;badge:number;nav:(p:string)=>void}) {
  const [hov,setHov]=useState(false);
  const Icon=tile.icon;
  return (
    <div onClick={()=>nav(tile.path)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?tile.color:"linear-gradient(140deg, "+tile.color+"ee 0%, "+tile.color+"cc 100%)",borderRadius:T.rXl,padding:"18px 16px",cursor:"pointer",
        display:"flex",flexDirection:"column",gap:8,position:"relative",overflow:"hidden",minHeight:100,
        boxShadow:hov?"0 8px 24px "+tile.color+"44":"0 2px 8px "+tile.color+"22",
        transform:hov?"translateY(-2px)":"none",transition:"all .18s ease"}}>
      <div style={{position:"absolute",bottom:-16,right:-16,width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,.07)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:-24,right:8,width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{width:38,height:38,borderRadius:T.rMd,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon size={18} color="#fff"/>
        </div>
        {badge>0&&<span style={{minWidth:19,height:19,borderRadius:10,background:"rgba(255,255,255,.9)",color:tile.color,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{badge>99?"99+":badge}</span>}
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",lineHeight:1.2,marginBottom:2}}>{tile.label}</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.7)",lineHeight:1.4}}>{tile.subtitle}</div>
      </div>
      {hov&&<div style={{position:"absolute",bottom:8,right:10}}><ChevronRight size={13} color="rgba(255,255,255,.7)"/></div>}
    </div>
  );
}

function GroupHdr({label,color}:{label:string;color:string}) {
  return (
    <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,marginTop:6}}>
      <div style={{width:4,height:16,borderRadius:2,background:color,flexShrink:0}}/>
      <span style={{fontSize:11,fontWeight:700,color:T.fgMuted,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>
      <div style={{flex:1,height:1,background:T.border}}/>
    </div>
  );
}

export default function DashboardPage() {
  const nav=useNavigate();
  const {profile,roles,primaryRole,hasRole}=useAuth();
  const settings=useSystemSettings();
  const isAdmin=hasRole("admin","superadmin","webmaster");

  const [kpi,setKpi]=useState({reqs:0,pos:0,pvs:0,items:0,suppliers:0,grn:0,contracts:0,unread:0,lowStock:0,tenders:0});
  const [loading,setLoading]=useState(false);
  const [clock,setClock]=useState("");

  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const name=profile?.full_name?.split(" ")[0]||"Staff";
  const today=new Date().toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Nairobi"});

  useEffect(()=>{
    const t=()=>setClock(new Date().toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    t();const iv=setInterval(t,1000);return()=>clearInterval(iv);
  },[]);

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const [r,p,pv,i,s,g,c,n,ls,t2]=await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending"]),
        db.from("items").select("id",{count:"exact",head:true}),
        db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
        db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        db.from("tenders").select("id",{count:"exact",head:true}).eq("status","open"),
      ]);
      const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
      const kpiData={reqs:v(r),pos:v(p),pvs:v(pv),items:v(i),suppliers:v(s),grn:v(g),contracts:v(c),unread:v(n),lowStock:v(ls),tenders:v(t2)};
      setKpi(kpiData); pageCache.set("dashboard_kpi",kpiData,2*60*1000);
    } catch(e:any) {
      const cached=pageCache.get<any>("dashboard_kpi");
      if(cached) setKpi(cached);
      console.error("[Dashboard]",e);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    load();
    const iv=setInterval(load,60_000);
    const ch=db.channel("dash8:live")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},load)
      .subscribe();
    return()=>{clearInterval(iv);db.removeChannel(ch);};
  },[load]);

  const badgeMap:Record<string,number>={
    requisitions:kpi.reqs,purchase_orders:kpi.pos,goods_received:kpi.grn,
    payment_vouchers:kpi.pvs,low_stock:kpi.lowStock,notifications:kpi.unread,
  };

  const canSee=(t:ModuleTile)=>{
    if(!t.roles.length)return true;
    if(isAdmin)return true;
    return t.roles.some(r=>roles?.includes(r));
  };

  const visibleTiles=ALL_TILES.filter(canSee);

  const groups=[
    {id:"comms",      label:"Reception & Communications", color:T.comms||"#0072c6", ids:["reception","comms","inbox","notifs","sms","telephony"]},
    {id:"procurement",label:"Procurement",                color:T.procurement,       ids:["reqs","pos","grn","suppliers","tenders","contracts","bideval","procplan"]},
    {id:"finance",    label:"Finance & Accounting",       color:T.finance,           ids:["finance","budgets","accounts","assets","pvouchers","rvouchers","jvouchers","acctws"]},
    {id:"inventory",  label:"Inventory & Warehouse",      color:T.inventory,         ids:["items","categories","departments","scanner"]},
    {id:"quality",    label:"Quality Control",            color:T.quality,           ids:["quality","inspect","nonconf"]},
    {id:"reports",    label:"Reports & Documents",        color:T.reports||"#5c2d91",ids:["reports","documents","audit"]},
    {id:"admin",      label:"Administration",             color:T.system,            ids:["users","settings","adminpanel","database","dbmonitor","backup","facilities","webmaster"]},
  ];

  const sysName = (settings as any)?.get
    ? (settings as any).get("system_name","EL5 MediProcure")
    : ((settings as any)?.settings?.system_name || "EL5 MediProcure");

  return(
    <div style={{background:T.bg,minHeight:"100%",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{background:"#fff",borderBottom:"1px solid "+T.border,padding:"14px 24px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
        <div style={{width:40,height:40,borderRadius:T.r,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Home size={20} color={T.primary}/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.fg}}>{greeting}, {name}</h1>
          <div style={{fontSize:12,color:T.fgMuted,marginTop:1}}>{sysName} - {today}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:T.fgMuted,fontVariantNumeric:"tabular-nums"}}>{clock}</div>
          <div style={{padding:"3px 10px",borderRadius:T.r,background:T.primaryBg,border:"1px solid "+T.primary+"33",fontSize:11,fontWeight:600,color:T.primary,textTransform:"capitalize"}}>
            {primaryRole?.replace(/_/g," ")||"Staff"}
          </div>
          <button onClick={load} style={{padding:"6px 12px",background:T.bg,border:"1px solid "+T.border,borderRadius:T.r,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.fgMuted}}>
            <RefreshCw size={12} style={loading?{animation:"spin 1s linear infinite"}:{}}/> Refresh
          </button>
        </div>
      </div>

      <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          <KPICard label="Pending Reqs"     value={kpi.reqs}      color={T.warning}            icon={Clock}         onClick={()=>nav("/requisitions")}/>
          <KPICard label="Open POs"         value={kpi.pos}       color={T.primary}             icon={ShoppingCart}  onClick={()=>nav("/purchase-orders")}/>
          <KPICard label="Vouchers Due"     value={kpi.pvs}       color={T.finance}             icon={DollarSign}    onClick={()=>nav("/vouchers/payment")}/>
          <KPICard label="Low Stock"        value={kpi.lowStock}  color={T.error}               icon={AlertTriangle} onClick={()=>nav("/items")}/>
          <KPICard label="Pending GRN"      value={kpi.grn}       color={T.inventory}           icon={Package}       onClick={()=>nav("/goods-received")}/>
          <KPICard label="Suppliers"        value={kpi.suppliers} color={T.comms||"#0072c6"}    icon={Truck}         onClick={()=>nav("/suppliers")}/>
          <KPICard label="Open Tenders"     value={kpi.tenders}   color={"#5c2d91"}             icon={Zap}           onClick={()=>nav("/tenders")}/>
          <KPICard label="Unread Alerts"    value={kpi.unread}    color={T.error}               icon={Bell}          onClick={()=>nav("/notifications")}/>
        </div>

        {groups.map(group=>{
          const gTiles=visibleTiles.filter(t=>group.ids.includes(t.id));
          if(!gTiles.length)return null;
          return(
            <div key={group.id} style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
              <GroupHdr label={group.label} color={group.color}/>
              {gTiles.map(tile=><Tile key={tile.id} tile={tile} badge={tile.badge?(badgeMap[tile.badge]||0):0} nav={nav}/>)}
            </div>
          );
        })}

        <div style={{textAlign:"center",padding:"12px 0",fontSize:11,color:T.fgDim,borderTop:"1px solid "+T.border,marginTop:4}}>
          EL5 MediProcure ProcurBosse v6.0 - Embu Level 5 Hospital - {new Date().getFullYear()} Embu County Government
        </div>
      </div>
    </div>
  );
}

import type React from "react";
