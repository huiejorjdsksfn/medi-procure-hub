import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import {
  ShoppingCart, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Mail, Settings, Users, FileText,
  Calendar, FileCheck, Search, Database, TrendingUp,
  Activity, Archive, Scale, Building2, PiggyBank,
  Layers, BookMarked, Cpu, LogOut, Bell, User, ChevronRight,
  Receipt, Hash
} from "lucide-react";

// ── SVG Wheel helpers ────────────────────────────────────────────────────
function polar(cx:number,cy:number,r:number,deg:number){
  const rad=(deg-90)*(Math.PI/180);
  return{x:+(cx+r*Math.cos(rad)).toFixed(3),y:+(cy+r*Math.sin(rad)).toFixed(3)};
}
function arcPath(cx:number,cy:number,outerR:number,innerR:number,startDeg:number,endDeg:number):string{
  const span=((endDeg-startDeg)%360+360)%360;
  const large=span>180?1:0;
  const aEnd=startDeg+span;
  const os=polar(cx,cy,outerR,startDeg),oe=polar(cx,cy,outerR,aEnd);
  const ie=polar(cx,cy,innerR,aEnd),is=polar(cx,cy,innerR,startDeg);
  return`M ${os.x} ${os.y} A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y} Z`;
}
function mid(cx:number,cy:number,r:number,s:number,e:number){
  const span=((e-s)%360+360)%360;
  return polar(cx,cy,r,s+span/2);
}

// ── Wheel config ─────────────────────────────────────────────────────────
const CX=260,CY=260,OR=205,IR=85,GAP=10;

const SEGS=[
  {id:"procurement",label:"Procurement",num:"01",start:205,end:338,color:"#5ba8d0",sub:"Create & Source",
   pages:[
     {label:"Requisitions",    path:"/requisitions",         icon:ClipboardList},
     {label:"Purchase Orders", path:"/purchase-orders",      icon:ShoppingCart},
     {label:"Goods Received",  path:"/goods-received",       icon:Package},
     {label:"Suppliers",       path:"/suppliers",            icon:Truck},
     {label:"Tenders",         path:"/tenders",              icon:Gavel},
     {label:"Contracts",       path:"/contracts",            icon:FileCheck},
     {label:"Bid Evaluations", path:"/bid-evaluations",      icon:Scale},
     {label:"Proc. Planning",  path:"/procurement-planning", icon:Calendar},
   ]},
  {id:"finance",label:"Finance",num:"02",start:348,end:110,color:"#2a5f8a",sub:"Track & Pay",
   pages:[
     {label:"Financial Dashboard",  path:"/financials/dashboard",         icon:TrendingUp},
     {label:"Payment Vouchers",     path:"/vouchers/payment",             icon:DollarSign},
     {label:"Receipt Vouchers",     path:"/vouchers/receipt",             icon:Receipt},
     {label:"Journal Vouchers",     path:"/vouchers/journal",             icon:BookMarked},
     {label:"Budgets",              path:"/financials/budgets",           icon:PiggyBank},
     {label:"Chart of Accounts",    path:"/financials/chart-of-accounts", icon:Layers},
     {label:"Fixed Assets",         path:"/financials/fixed-assets",      icon:Building2},
   ]},
  {id:"operations",label:"Operations",num:"03",start:120,end:195,color:"#1a3461",sub:"Manage & Control",
   pages:[
     {label:"Inventory",      path:"/items",               icon:Package},
     {label:"Categories",     path:"/categories",          icon:Hash},
     {label:"Departments",    path:"/departments",         icon:Building2},
     {label:"Scanner",        path:"/scanner",             icon:Search},
     {label:"Quality Control",path:"/quality/dashboard",  icon:Shield},
     {label:"Inspections",    path:"/quality/inspections", icon:Shield},
   ]},
];

const QUICK=[
  {label:"Reports",        path:"/reports",         icon:BarChart3,  color:"#9333ea"},
  {label:"Email",          path:"/email",           icon:Mail,       color:"#c0185a"},
  {label:"Documents",      path:"/documents",       icon:FileText,   color:"#92400e"},
  {label:"Audit Log",      path:"/audit-log",       icon:Activity,   color:"#78350f"},
  {label:"Users",          path:"/users",           icon:Users,      color:"#4b4b9b"},
  {label:"Settings",       path:"/settings",        icon:Settings,   color:"#374151"},
  {label:"Admin Panel",    path:"/admin/panel",     icon:Cpu,        color:"#0a2558"},
  {label:"Database",       path:"/admin/database",  icon:Database,   color:"#1e3a5f"},
  {label:"Backup",         path:"/backup",          icon:Archive,    color:"#374151"},
];

export default function DashboardPage(){
  const{profile,roles,signOut}=useAuth();
  const navigate=useNavigate();
  const[hovSeg,setHovSeg]=useState<string|null>(null);
  const[actSeg,setActSeg]=useState<string|null>(null);
  const[sysName,setSysName]=useState("EL5 MediProcure");
  const[hospital,setHospital]=useState("Embu Level 5 Hospital");
  const[clock,setClock]=useState("");
  const primaryRole=roles[0]||"requisitioner";
  const isAdmin=roles.includes("admin");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{
        data?.forEach((r:any)=>{
          if(r.key==="system_name")setSysName(r.value||"EL5 MediProcure");
          if(r.key==="hospital_name")setHospital(r.value||"Embu Level 5 Hospital");
        });
      });
  },[]);

  useEffect(()=>{
    const tick=()=>setClock(new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[]);

  const activeSeg=SEGS.find(s=>s.id===actSeg);

  return(
    <div style={{position:"relative",width:"100%",height:"100vh",overflow:"hidden",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{filter:drop-shadow(0 0 5px rgba(91,168,208,0.2))}50%{filter:drop-shadow(0 0 20px rgba(91,168,208,0.5))}}
        .seg{cursor:pointer;transition:filter 0.18s;}
        .seg:hover{filter:brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.2));}
        .qbtn{cursor:pointer;transition:transform 0.16s,box-shadow 0.16s;}
        .qbtn:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,0.4)!important;}
        .pgbtn{transition:background 0.15s;}
        .pgbtn:hover{background:rgba(255,255,255,0.1)!important;}
      `}</style>

      {/* Wallpaper */}
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(135deg,rgba(3,8,22,0.9) 0%,rgba(7,20,55,0.83) 50%,rgba(3,8,22,0.8) 100%),url(${procBg})`,backgroundSize:"cover",backgroundPosition:"center"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.013) 0,rgba(255,255,255,0.013) 1px,transparent 1px,transparent 70px),repeating-linear-gradient(0deg,rgba(255,255,255,0.013) 0,rgba(255,255,255,0.013) 1px,transparent 1px,transparent 70px)",pointerEvents:"none"}}/>

      {/* Top bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:52,display:"flex",alignItems:"center",padding:"0 20px",gap:12,zIndex:10,background:"rgba(5,10,28,0.6)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <img src={logoImg} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"rgba(255,255,255,0.1)",padding:3}}/>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:"#fff",lineHeight:1}}>{sysName}</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:1}}>{hospital}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"monospace"}}>{clock}</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:600,background:"rgba(255,255,255,0.08)",padding:"2px 9px",borderRadius:20,border:"1px solid rgba(255,255,255,0.1)"}}>{primaryRole.replace(/_/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase())}</span>
          <button onClick={()=>navigate("/profile")} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",gap:4,fontSize:11}}>
            <User style={{width:12,height:12}}/>{profile?.full_name?.split(" ")[0]||"User"}
          </button>
          <button onClick={()=>navigate("/email")} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:6,padding:"5px",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}>
            <Bell style={{width:13,height:13}}/>
          </button>
          <button onClick={()=>{signOut();navigate("/login");}} style={{background:"rgba(220,38,38,0.12)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#f87171",fontSize:11,display:"flex",alignItems:"center",gap:4}}>
            <LogOut style={{width:11,height:11}}/>Sign out
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div style={{position:"absolute",top:60,left:0,right:0,display:"flex",flexDirection:"column",alignItems:"center",zIndex:5,pointerEvents:"none"}}>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",fontWeight:500,letterSpacing:"0.03em"}}>Welcome back,</div>
        <div style={{fontSize:20,color:"#fff",fontWeight:800,letterSpacing:"0.01em"}}>{profile?.full_name||"Staff"}</div>
      </div>

      {/* Centre content area */}
      <div style={{position:"absolute",top:52,left:0,right:0,bottom:76,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>

        {/* Left banner */}
        <div style={{position:"absolute",left:"max(16px,calc(50% - 420px))",top:"50%",transform:"translateY(-60%)",zIndex:5,display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
          <div style={{background:"#e8a020",color:"#fff",fontWeight:800,fontSize:9,letterSpacing:"0.12em",padding:"4px 14px",borderRadius:3,textTransform:"uppercase",boxShadow:"2px 4px 10px rgba(0,0,0,0.4)"}}>ONBOARD 01</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",textAlign:"right",lineHeight:1.7}}>Click a segment<br/>to explore modules</div>
        </div>

        {/* Right banner */}
        <div style={{position:"absolute",right:"max(16px,calc(50% - 420px))",bottom:"calc(50% - 140px)",zIndex:5,display:"flex",flexDirection:"column",gap:8,alignItems:"flex-start"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",lineHeight:1.7}}>Complete cycle,<br/>drive results</div>
          <div style={{background:"#e8a020",color:"#fff",fontWeight:800,fontSize:9,letterSpacing:"0.12em",padding:"4px 14px",borderRadius:3,textTransform:"uppercase",boxShadow:"2px 4px 10px rgba(0,0,0,0.4)"}}>GROWTH &amp; EFFICIENCY</div>
        </div>

        {/* SVG Wheel */}
        <div style={{position:"relative",animation:"scaleIn 0.5s ease-out forwards",animation:"glow 5s ease-in-out infinite"}}>
          <svg width={520} height={520} viewBox="0 0 520 520">
            <defs>
              <radialGradient id="goldGrad" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#f5cc50"/>
                <stop offset="60%" stopColor="#e8a020"/>
                <stop offset="100%" stopColor="#b8760a"/>
              </radialGradient>
              <filter id="segGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>

            {/* Tick marks */}
            {Array.from({length:36}).map((_,i)=>{
              const p1=polar(CX,CY,OR+8,i*10);
              const p2=polar(CX,CY,OR+16,i*10);
              return<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.12)" strokeWidth={i%9===0?1.5:0.5}/>;
            })}
            <circle cx={CX} cy={CY} r={OR+20} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>

            {/* Segments */}
            {SEGS.map(seg=>{
              const d=arcPath(CX,CY,OR,IR,seg.start+GAP/2,seg.end-GAP/2);
              const lMid=mid(CX,CY,(OR+IR)/2,seg.start+GAP/2,seg.end-GAP/2);
              const nMid=mid(CX,CY,OR-20,seg.start+GAP/2,seg.end-GAP/2);
              // Arrow connector at end gap
              const ao=polar(CX,CY,OR+4,seg.end-GAP/2);
              const ai=polar(CX,CY,IR-4,seg.end-GAP/2);
              const at=polar(CX,CY,(OR+IR)/2+18,seg.end+2);
              const isH=hovSeg===seg.id,isA=actSeg===seg.id;
              return(
                <g key={seg.id}>
                  <path d={d} fill={seg.color} opacity={isA?1:isH?0.92:0.78}
                    className="seg"
                    style={{filter:isA||isH?`drop-shadow(0 0 14px ${seg.color}aa)`:undefined}}
                    onMouseEnter={()=>setHovSeg(seg.id)}
                    onMouseLeave={()=>setHovSeg(null)}
                    onClick={()=>setActSeg(actSeg===seg.id?null:seg.id)}/>
                  <polygon points={`${ao.x},${ao.y} ${at.x},${at.y} ${ai.x},${ai.y}`} fill={seg.color} opacity={0.65}/>
                  <text x={nMid.x} y={nMid.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.45)" fontSize={8} fontWeight={700} letterSpacing={1} fontFamily="Segoe UI,sans-serif" style={{pointerEvents:"none"}}>{seg.num}</text>
                  <text x={lMid.x} y={lMid.y-8} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={14} fontWeight={800} fontFamily="Segoe UI,sans-serif" style={{pointerEvents:"none"}}>{seg.label}</text>
                  <text x={lMid.x} y={lMid.y+10} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize={8.5} fontFamily="Segoe UI,sans-serif" style={{pointerEvents:"none"}}>{seg.sub}</text>
                </g>
              );
            })}

            {/* Inner ring */}
            <circle cx={CX} cy={CY} r={IR-3} fill="#11172e"/>
            <circle cx={CX} cy={CY} r={IR-3} fill="none" stroke="#e8a020" strokeWidth={2.5}/>
            {/* Gold center */}
            <circle cx={CX} cy={CY} r={IR-9} fill="url(#goldGrad)"/>
            {/* Logo image in center */}
            <image href={logoImg} x={CX-15} y={CY-26} width={30} height={30}/>
            <text x={CX} y={CY+14} textAnchor="middle" fill="#fff" fontSize={8.5} fontWeight={800} fontFamily="Segoe UI,sans-serif" letterSpacing={0.5}>EXPERIENCE</text>
            <text x={CX} y={CY+24} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={8} fontFamily="Segoe UI,sans-serif">&amp;</text>
            <text x={CX} y={CY+34} textAnchor="middle" fill="#fff" fontSize={8.5} fontWeight={800} fontFamily="Segoe UI,sans-serif" letterSpacing={0.5}>EXPERTISE</text>
          </svg>
        </div>

        {/* Pages panel */}
        {activeSeg&&(
          <div style={{position:"absolute",right:"max(20px,calc(50% - 440px))",top:"50%",transform:"translateY(-50%)",width:230,animation:"fadeSlide 0.22s ease-out",zIndex:20}}>
            <div style={{background:"rgba(8,14,36,0.95)",backdropFilter:"blur(14px)",borderRadius:13,border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
              <div style={{padding:"11px 14px",background:activeSeg.color,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{activeSeg.label}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.7)"}}>{activeSeg.sub}</div>
                </div>
                <button onClick={()=>setActSeg(null)} style={{background:"rgba(0,0,0,0.2)",border:"none",borderRadius:20,width:22,height:22,cursor:"pointer",color:"#fff",fontSize:16,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
              <div style={{padding:6}}>
                {activeSeg.pages.map(pg=>(
                  <button key={pg.path} onClick={()=>navigate(pg.path)} className="pgbtn"
                    style={{display:"flex",alignItems:"center",gap:9,padding:"7px 9px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",width:"100%",textAlign:"left",color:"rgba(255,255,255,0.82)",fontSize:12,fontWeight:500}}>
                    <div style={{width:24,height:24,borderRadius:6,background:`${activeSeg.color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <pg.icon style={{width:12,height:12,color:activeSeg.color}}/>
                    </div>
                    <span style={{flex:1}}>{pg.label}</span>
                    <ChevronRight style={{width:10,height:10,opacity:0.35}}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom quick links */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:76,display:"flex",alignItems:"center",padding:"0 20px",gap:7,background:"rgba(3,8,22,0.88)",backdropFilter:"blur(12px)",borderTop:"1px solid rgba(255,255,255,0.07)",overflowX:"auto",zIndex:10}}>
        <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap",marginRight:6,flexShrink:0}}>MORE MODULES</div>
        {QUICK.filter(q=>isAdmin||!["Admin Panel","Database","Backup"].includes(q.label)).map(q=>(
          <button key={q.path} className="qbtn" onClick={()=>navigate(q.path)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 11px",borderRadius:10,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.05)",cursor:"pointer",flexShrink:0,minWidth:62,boxShadow:"0 2px 6px rgba(0,0,0,0.25)"}}>
            <q.icon style={{width:15,height:15,color:q.color}}/>
            <span style={{fontSize:8.5,fontWeight:600,color:"rgba(255,255,255,0.7)",whiteSpace:"nowrap"}}>{q.label}</span>
          </button>
        ))}
        <div style={{marginLeft:"auto",flexShrink:0,fontSize:8.5,color:"rgba(255,255,255,0.18)",textAlign:"right",lineHeight:1.6,whiteSpace:"nowrap"}}>
          <div style={{fontWeight:700,color:"rgba(255,255,255,0.35)"}}>{sysName}</div>
          <div>{hospital} · Embu County Government</div>
        </div>
      </div>
    </div>
  );
}
