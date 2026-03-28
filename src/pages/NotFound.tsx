import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0a2558 0%,#1a3a6b 60%,#0f3460 100%)",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <div style={{textAlign:"center" as const,color:"#fff",padding:32,maxWidth:480}}>
        <div style={{fontSize:120,fontWeight:900,lineHeight:1,background:"linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.4))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>404</div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:10,color:"#fff"}}>Page Not Found</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.55)",marginBottom:32,lineHeight:1.7}}>
          The page you're looking for doesn't exist or has been moved.<br/>
          Please navigate using the sidebar menu.
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={()=>navigate(-1)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#e2e8f0",border:"1px solid rgba(255,255,255,0.25)",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>
            <ArrowLeft style={{width:14,height:14}}/> Go Back
          </button>
          <button onClick={()=>navigate("/dashboard")} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:800,color:"#0a2558"}}>
            <Home style={{width:14,height:14}}/> Dashboard
          </button>
        </div>
        <div style={{marginTop:24,fontSize:11,color:"rgba(255,255,255,0.3)"}}>EL5 MediProcure · Embu Level 5 Hospital</div>
      </div>
    </div>
  );
}
