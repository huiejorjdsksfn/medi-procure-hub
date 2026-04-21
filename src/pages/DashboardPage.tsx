/**
 * ProcurBosse — Dashboard v10 D365 Style
 * Microsoft Dynamics 365 home page style
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const ROLE_MODS: Record<string, string[]> = {
  superadmin:["proc","inv","fin","qual","comms","rep","users","sys","audit"],
  webmaster: ["proc","inv","fin","qual","comms","rep","users","sys","audit"],
  admin:     ["proc","inv","fin","qual","comms","rep","users","sys","audit"],
  database_admin:["sys","audit","rep"],
  procurement_manager:["proc","inv","qual","comms","rep","audit"],
  procurement_officer:["proc","inv","qual","comms"],
  inventory_manager:  ["inv","qual","rep"],
  warehouse_officer:  ["inv"],
  accountant:         ["fin","rep","audit"],
  requisitioner:      ["proc"],
};

const MODS = [
  {id:"proc",  label:"Procurement",      icon:"🛒", color:"#0078d4", items:[{l:"Requisitions",p:"/requisitions"},{l:"Purchase Orders",p:"/purchase-orders"},{l:"Suppliers",p:"/suppliers"},{l:"Tenders",p:"/tenders"},{l:"Contracts",p:"/contracts"}]},
  {id:"inv",   label:"Inventory",         icon:"📦", color:"#038387", items:[{l:"Items",p:"/items"},{l:"Categories",p:"/categories"},{l:"Goods Received",p:"/goods-received"},{l:"Departments",p:"/departments"}]},
  {id:"fin",   label:"Finance",           icon:"💰", color:"#7719aa", items:[{l:"Financial Dashboard",p:"/financials"},{l:"Budgets",p:"/financials/budgets"},{l:"Vouchers",p:"/vouchers"},{l:"Accountant Workspace",p:"/accountant-workspace"}]},
  {id:"qual",  label:"Quality",           icon:"✅", color:"#498205", items:[{l:"QC Dashboard",p:"/quality"},{l:"Inspections",p:"/quality/inspections"},{l:"Non-Conformance",p:"/quality/non-conformance"}]},
  {id:"comms", label:"Communications",   icon:"📧", color:"#0072c6", items:[{l:"Email",p:"/email"},{l:"SMS",p:"/sms"},{l:"Notifications",p:"/notifications"},{l:"Documents",p:"/documents"}]},
  {id:"rep",   label:"Reports",           icon:"📊", color:"#5c2d91", items:[{l:"Reports",p:"/reports"},{l:"Audit Log",p:"/audit-log"},{l:"Print Engine",p:"/print-engine"}]},
  {id:"users", label:"Users & Access",   icon:"👥", color:"#b4009e", items:[{l:"Users",p:"/users"},{l:"IP Access",p:"/admin/ip-access"},{l:"Facilities",p:"/facilities"}]},
  {id:"sys",   label:"System",            icon:"⚙️", color:"#00188f", items:[{l:"Settings",p:"/settings"},{l:"Database",p:"/admin/database"},{l:"Backup",p:"/backup"},{l:"Webmaster",p:"/webmaster"}]},
  {id:"audit", label:"Audit",             icon:"🔍", color:"#d83b01", items:[{l:"Audit Log",p:"/audit-log"},{l:"Reception",p:"/reception"}]},
];

export default function DashboardPage() {
  const { user, profile, primaryRole, hasRole, signOut } = useAuth();
  const nav = useNavigate();
  const [kpi, setKpi] = useState({req:0,po:0,items:0,notifs:0,lowstock:0,grn:0});
  const [sel, setSel] = useState<typeof MODS[0]|null>(null);
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const isAdmin = hasRole("admin","superadmin","webmaster");
  const allowed = ROLE_MODS[primaryRole] || ["proc"];
  const mods = MODS.filter(m=>allowed.includes(m.id));
  const name = profile?.full_name || user?.email?.split("@")[0] || "User";
  const role = primaryRole.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  useEffect(()=>{ const iv=setInterval(()=>setTime(new Date()),60000); return()=>clearInterval(iv); },[]);

  const loadKpi = useCallback(async()=>{
    if(!isAdmin) return;
    setLoading(true);
    try {
      const [r,p,i,n,ls,g]=await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("items").select("id",{count:"exact",head:true}),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
      ]);
      const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
      setKpi({req:v(r),po:v(p),items:v(i),notifs:v(n),lowstock:v(ls),grn:v(g)});
    } catch {}
    finally{setLoading(false);}
  },[isAdmin]);

  useEffect(()=>{ loadKpi(); },[loadKpi]);

  const S={
    page:{background:"#f3f5f8",minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"},
    topbar:{
      background:"#0078d4",height:48,
      display:"flex",alignItems:"center",padding:"0 20px",gap:12,
      boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
    },
    content:{padding:"24px"},
    card:{background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"},
  } as const;

  return (
    <div style={S.page}>
      {/* D365 Top Bar */}
      <div style={S.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <div style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚕</div>
          <span style={{color:"#fff",fontSize:13,fontWeight:600}}>EL5 MediProcure</span>
          <span style={{color:"rgba(255,255,255,0.4)",fontSize:12,margin:"0 4px"}}>|</span>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>Home</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#fff",fontSize:12,fontWeight:600}}>{name}</div>
            <div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>{role}</div>
          </div>
          <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:700}} onClick={()=>nav("/profile")}>
            {name[0]?.toUpperCase()}
          </div>
          <button onClick={()=>{signOut();nav("/login");}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,padding:"4px 10px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            Sign out
          </button>
        </div>
      </div>

      {/* Sub header */}
      <div style={{background:"#fff",borderBottom:"1px solid #e0e0e0",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:18,fontWeight:600,color:"#1a1a2e"}}>Home Dashboard</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>
            {time.toLocaleDateString("en-KE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
          </div>
        </div>
        <button onClick={loadKpi} style={{background:"#f3f5f8",border:"1px solid #e0e0e0",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#374151",fontFamily:"inherit"}}>
          ↻ Refresh
        </button>
      </div>

      <div style={S.content}>
        {/* KPI tiles — admin only */}
        {isAdmin && (
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Live Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
              {[
                {l:"Requisitions",v:kpi.req,  c:"#0078d4",i:"📋"},
                {l:"Purchase Orders",v:kpi.po, c:"#7719aa",i:"🛒"},
                {l:"Total Items",v:kpi.items,  c:"#038387",i:"📦"},
                {l:"Notifications",v:kpi.notifs,c:"#d83b01",i:"🔔"},
                {l:"Low Stock",v:kpi.lowstock,  c:"#c19c00",i:"⚠️"},
                {l:"Pending GRN",v:kpi.grn,     c:"#498205",i:"🚚"},
              ].map(k=>(
                <div key={k.l} style={{...S.card,padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <span style={{fontSize:22}}>{k.i}</span>
                    <div style={{width:8,height:8,borderRadius:"50%",background:k.c,marginTop:4}}/>
                  </div>
                  <div style={{fontSize:28,fontWeight:700,color:k.c,lineHeight:1,marginBottom:4}}>
                    {loading?"—":k.v.toLocaleString()}
                  </div>
                  <div style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{k.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module tiles */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>
            My Modules — {role}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
            {mods.map(m=>(
              <div key={m.id} onClick={()=>setSel(sel?.id===m.id?null:m)}
                style={{
                  background:sel?.id===m.id?m.color:`${m.color}ee`,
                  borderRadius:8,padding:"18px 14px",
                  cursor:"pointer",textAlign:"center",
                  color:"#fff",userSelect:"none",
                  boxShadow:sel?.id===m.id?`0 4px 20px ${m.color}55`:"0 2px 6px rgba(0,0,0,0.10)",
                  transform:sel?.id===m.id?"translateY(-2px)":"none",
                  transition:"all .15s",
                  outline:sel?.id===m.id?"3px solid rgba(255,255,255,0.5)":"none",
                  outlineOffset:"-3px",
                }}
                onMouseEnter={e=>{(e.currentTarget as any).style.transform="translateY(-2px)";(e.currentTarget as any).style.boxShadow=`0 6px 20px ${m.color}44`;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.transform=sel?.id===m.id?"translateY(-2px)":"none";(e.currentTarget as any).style.boxShadow=sel?.id===m.id?`0 4px 20px ${m.color}55`:"0 2px 6px rgba(0,0,0,0.10)";}}
              >
                <div style={{fontSize:28,marginBottom:8,lineHeight:1}}>{m.icon}</div>
                <div style={{fontSize:12,fontWeight:700,lineHeight:1.3}}>{m.label}</div>
                <div style={{fontSize:10,opacity:.7,marginTop:4}}>{m.items.length} areas</div>
              </div>
            ))}
          </div>
        </div>

        {/* Expanded sub-links */}
        {sel && (
          <div style={{...S.card,overflow:"hidden",marginBottom:16,border:`1.5px solid ${sel.color}33`}}>
            <div style={{background:sel.color,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>{sel.icon}</span>
                <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{sel.label}</span>
              </div>
              <button onClick={()=>setSel(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
                Close ✕
              </button>
            </div>
            <div style={{padding:"8px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:2}}>
              {sel.items.map(s=>(
                <button key={s.p} onClick={()=>nav(s.p)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:6,cursor:"pointer",background:"transparent",border:"none",textAlign:"left",fontFamily:"inherit",transition:"background .1s",width:"100%"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#f0f7ff")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:sel.color,flexShrink:0}}/>
                  <span style={{fontSize:13,color:"#374151",fontWeight:500}}>{s.l}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Quick Actions</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[
              {l:"+ New Requisition",p:"/requisitions",c:"#0078d4"},
              {l:"📦 Check Inventory",p:"/items",c:"#038387"},
              {l:"🔔 Notifications",p:"/notifications",c:"#d83b01"},
              {l:"📧 Email",p:"/email",c:"#0072c6"},
              ...(isAdmin?[
                {l:"👥 Users",p:"/users",c:"#b4009e"},
                {l:"⚙️ Settings",p:"/settings",c:"#00188f"},
                {l:"🗄️ Database",p:"/admin/database",c:"#7719aa"},
              ]:[]),
            ].map(a=>(
              <button key={a.p} onClick={()=>nav(a.p)} style={{
                background:`${a.c}10`,color:a.c,
                border:`1px solid ${a.c}25`,borderRadius:6,
                padding:"8px 16px",fontSize:13,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit",transition:"all .1s",
              }}
              onMouseEnter={e=>{(e.currentTarget as any).style.background=`${a.c}20`;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.background=`${a.c}10`;}}>
                {a.l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
