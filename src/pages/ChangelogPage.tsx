/**
 * ChangelogPage — Full version release history
 * ProcurBosse EL5 MediProcure v9.6
 */
import { useState } from "react";
import { T } from "@/lib/theme";
import { RELEASES, getTotalStats, CURRENT_VERSION } from "@/lib/version";
import { useToast } from "@/hooks/use-toast";
import { Package, CheckCircle, Clock, Archive, Zap, Database, Bug, LayoutGrid } from "lucide-react";

const STATUS_COLORS: Record<string,string> = {
  stable:"#107c10", lts:"#0078d4", beta:"#d39a04", deprecated:"#94a3b8",
};
const STATUS_BG: Record<string,string> = {
  stable:"#f0fdf4", lts:"#eff6ff", beta:"#fffbeb", deprecated:"#f8fafc",
};

export default function ChangelogPage() {
  const [filter, setFilter] = useState<"all"|"stable"|"lts"|"beta">("all");
  const stats = getTotalStats();
  const filtered = [...RELEASES].reverse().filter(r => filter === "all" || r.status === filter);
  const S = {
    page:{background:"var(--color-page-bg,#f3f5f8)",minHeight:"100%",padding:"20px 24px",fontFamily:"var(--font-family,'Segoe UI',sans-serif)"},
    header:{display:"flex",alignItems:"center",gap:12,marginBottom:20},
    card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"14px 16px",marginBottom:12},
    kpi:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px",flex:1,textAlign:"center" as const},
    badge:(s:string)=>({fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:99,background:STATUS_BG[s]||"#f8fafc",color:STATUS_COLORS[s]||"#64748b",textTransform:"uppercase" as const,letterSpacing:"0.06em"}),
    filterBtn:(active:boolean)=>({padding:"5px 14px",borderRadius:6,border:`1px solid ${active?"#0078d4":"#e2e8f0"}`,background:active?"#0078d4":"#fff",color:active?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}),
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#0d3b7a,#1a5ca8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Package size={19} color="#fff"/>
        </div>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:"#1e293b"}}>Changelog — ProcurBosse</div>
          <div style={{fontSize:11,color:"#64748b"}}>EL5 MediProcure · Embu Level 5 Hospital · v{CURRENT_VERSION}</div>
        </div>
        <div style={{marginLeft:"auto",padding:"6px 14px",borderRadius:8,background:"#0078d4",color:"#fff",fontSize:12,fontWeight:700}}>
          v{CURRENT_VERSION} Current
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap" as const}}>
        {[
          {icon:<Package size={14}/>,label:"Total Releases",val:stats.totalReleases,color:"#0078d4"},
          {icon:<Database size={14}/>,label:"DB Migrations",val:stats.totalMigrations,color:"#7c3aed"},
          {icon:<Bug size={14}/>,label:"Bugs Fixed",val:stats.totalBugsFixed,color:"#dc2626"},
          {icon:<Zap size={14}/>,label:"Engines Built",val:stats.allEngines.length,color:"#d97706"},
          {icon:<LayoutGrid size={14}/>,label:"Total Pages",val:stats.totalPages,color:"#059669"},
        ].map((k,i)=>(
          <div key={i} style={S.kpi}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,color:k.color,marginBottom:3}}>{k.icon}<span style={{fontSize:10,fontWeight:600}}>{k.label}</span></div>
            <div style={{fontSize:22,fontWeight:900,color:"#1e293b"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" as const}}>
        {(["all","stable","lts","beta"] as const).map(f=>(
          <button key={f} style={S.filterBtn(filter===f)} onClick={()=>setFilter(f)}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Release list */}
      {filtered.map(rel=>(
        <div key={rel.version} style={{...S.card, borderLeft:`4px solid ${STATUS_COLORS[rel.status]||"#e2e8f0"}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{fontSize:16,fontWeight:800,color:"#1e293b",fontFamily:"monospace"}}>v{rel.version}</div>
            <span style={S.badge(rel.status)}>{rel.status}</span>
            <div style={{fontSize:12,color:"#64748b",fontWeight:600}}>{rel.codename}</div>
            <div style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:4}}>
              <Clock size={11}/>{rel.date}
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap" as const}}>
            {rel.dbMigrations>0&&<span style={{fontSize:10,color:"#7c3aed",background:"#f5f3ff",padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              <Database size={9} style={{display:"inline",marginRight:3}}/>
              {rel.dbMigrations} migrations
            </span>}
            {rel.bugsFixed>0&&<span style={{fontSize:10,color:"#dc2626",background:"#fef2f2",padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              <Bug size={9} style={{display:"inline",marginRight:3}}/>
              {rel.bugsFixed} bugs fixed
            </span>}
            {rel.engines.length>0&&<span style={{fontSize:10,color:"#d97706",background:"#fffbeb",padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              <Zap size={9} style={{display:"inline",marginRight:3}}/>
              {rel.engines.length} engines
            </span>}
          </div>

          {/* Highlights */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:4}}>
            {rel.highlights.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:11.5,color:"#374151",lineHeight:1.5}}>
                <CheckCircle size={11} style={{color:"#22c55e",marginTop:2,flexShrink:0}}/>
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* Modules */}
          {rel.modules.length>0&&rel.modules[0]!=="All existing modules"&&rel.modules[0]!=="All 54 pages"&&(
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap" as const,gap:4}}>
              {rel.modules.map((m,i)=>(
                <span key={i} style={{fontSize:9.5,padding:"2px 8px",borderRadius:4,background:"#f1f5f9",color:"#475569",fontWeight:600}}>{m}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
