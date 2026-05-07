/**
 * ProcurBosse - 404 Not Found Page v2.0
 * Full D365-style error page with quick navigation
 * EL5 MediProcure, Embu Level 5 Hospital
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ArrowLeft, Search, AlertCircle, LayoutDashboard,
  ShoppingCart, Package, DollarSign, FileText, Users } from "lucide-react";

const QUICK_LINKS = [
  { label:"Dashboard",     path:"/dashboard",      icon:LayoutDashboard, color:"#0078d4" },
  { label:"Requisitions",  path:"/requisitions",   icon:ShoppingCart,    color:"#106ebe" },
  { label:"Inventory",     path:"/items",          icon:Package,         color:"#038387" },
  { label:"Finance",       path:"/financials/dashboard", icon:DollarSign,color:"#7719aa" },
  { label:"Documents",     path:"/documents",      icon:FileText,        color:"#374151" },
  { label:"Reception",     path:"/reception",      icon:Users,           color:"#0072c6" },
];

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg,#0a2558 0%,#1a3a6b 55%,#0f3460 100%)",
      fontFamily:"'Segoe UI','Inter',sans-serif",padding:24}}>

      {/* Animated background circles */}
      <div style={{position:"fixed",top:"15%",left:"10%",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,.03)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"10%",right:"8%",width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",top:"40%",right:"20%",width:150,height:150,borderRadius:"50%",background:"rgba(0,120,212,.15)",pointerEvents:"none"}}/>

      {/* Main card */}
      <div style={{textAlign:"center",maxWidth:580,width:"100%",zIndex:1}}>

        {/* Error icon */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.1)",border:"2px solid rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <AlertCircle size={40} color="rgba(255,255,255,.8)"/>
          </div>
        </div>

        {/* 404 number */}
        <div style={{fontSize:110,fontWeight:900,lineHeight:1,
          background:"linear-gradient(135deg,rgba(255,255,255,.95),rgba(255,255,255,.35))",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:8}}>
          404
        </div>

        <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:10}}>Page Not Found</div>

        <div style={{fontSize:14,color:"rgba(255,255,255,.55)",marginBottom:8,lineHeight:1.7}}>
          The page <code style={{background:"rgba(255,255,255,.1)",padding:"1px 7px",borderRadius:4,fontSize:13,color:"rgba(255,255,255,.8)"}}>{location.pathname}</code> does not exist or has been moved.
        </div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:32}}>
          Please use the navigation above or one of the quick links below.
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:36,flexWrap:"wrap"}}>
          <button onClick={()=>navigate(-1)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",
            background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,
            cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",transition:"all .15s"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.2)")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,.12)")}>
            <ArrowLeft size={14}/> Go Back
          </button>
          <button onClick={()=>navigate("/dashboard")} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",
            background:"#0078d4",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:800,color:"#fff",
            boxShadow:"0 4px 16px rgba(0,120,212,.4)",transition:"all .15s"}}
            onMouseEnter={e=>{(e.currentTarget as any).style.background="#106ebe";(e.currentTarget as any).style.boxShadow="0 6px 20px rgba(0,120,212,.5)";}}
            onMouseLeave={e=>{(e.currentTarget as any).style.background="#0078d4";(e.currentTarget as any).style.boxShadow="0 4px 16px rgba(0,120,212,.4)";}}>
            <Home size={14}/> Go to Dashboard
          </button>
        </div>

        {/* Quick navigation tiles */}
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",padding:"20px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:14}}>
            Quick Navigation
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
            {QUICK_LINKS.map(link=>{
              const Icon=link.icon;
              return(
                <button key={link.path} onClick={()=>navigate(link.path)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"14px 10px",
                    background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,
                    cursor:"pointer",color:"#fff",transition:"all .15s"}}
                  onMouseEnter={e=>{(e.currentTarget as any).style.background=link.color+"33";(e.currentTarget as any).style.borderColor=link.color+"66";}}
                  onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(255,255,255,.06)";(e.currentTarget as any).style.borderColor="rgba(255,255,255,.1)";}}>
                  <div style={{width:34,height:34,borderRadius:8,background:link.color+"33",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Icon size={16} color={link.color}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.8)"}}>{link.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{marginTop:24,fontSize:11,color:"rgba(255,255,255,.25)"}}>
          EL5 MediProcure - ProcurBosse v6.0 - Embu Level 5 Hospital
        </div>
      </div>
    </div>
  );
}
