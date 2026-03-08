import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, FileText, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Plus, Calendar, FileCheck, BookMarked,
  Building2, Home, Search, Mail, Settings, ChevronDown, RefreshCw, Grid2x2,
} from "lucide-react";

/* ─── HELPERS ─── */
const fmtKES = (n: number) =>
  n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(2)}M`
  : n >= 1000    ? `KES ${(n/1000).toFixed(1)}K`
  : `KES ${n.toFixed(0)}`;

/* ─── TILE GROUPS (like "My Work / Customers / Sales" in CRM) ─── */
const TILE_GROUPS = ["My Work","Procurement","Finance","Operations","Admin"];
const GROUP_TILES: Record<string,string[]> = {
  "My Work":     ["DASHBOARD","REQUISITIONS","INBOX"],
  "Procurement": ["PURCHASE ORDERS","GOODS RECEIVED","SUPPLIERS","TENDERS","CONTRACTS"],
  "Finance":     ["VOUCHERS","FINANCIALS","INVENTORY"],
  "Operations":  ["QUALITY","PLANNING","REPORTS"],
  "Admin":       ["DOCUMENTS","ADMIN"],
};
const ALL_TILES = [
  { label:"DASHBOARD",       path:"/dashboard",            icon:Home,          bg:"#008B8B" },
  { label:"REQUISITIONS",    path:"/requisitions",         icon:ClipboardList, bg:"#0078d4" },
  { label:"INBOX",           path:"/inbox",                icon:Mail,          bg:"#363636" },
  { label:"PURCHASE ORDERS", path:"/purchase-orders",      icon:ShoppingCart,  bg:"#C45911" },
  { label:"GOODS RECEIVED",  path:"/goods-received",       icon:Package,       bg:"#5C2D91" },
  { label:"SUPPLIERS",       path:"/suppliers",            icon:Truck,         bg:"#1F6090" },
  { label:"TENDERS",         path:"/tenders",              icon:Gavel,         bg:"#107c10" },
  { label:"CONTRACTS",       path:"/contracts",            icon:FileCheck,     bg:"#004E8C" },
  { label:"VOUCHERS",        path:"/vouchers/payment",     icon:DollarSign,    bg:"#7B3F00" },
  { label:"FINANCIALS",      path:"/financials/dashboard", icon:BarChart3,     bg:"#1a3a6b" },
  { label:"INVENTORY",       path:"/items",                icon:Building2,     bg:"#375623" },
  { label:"QUALITY",         path:"/quality/dashboard",    icon:Shield,        bg:"#603913" },
  { label:"PLANNING",        path:"/procurement-planning", icon:Calendar,      bg:"#4b4b9b" },
  { label:"REPORTS",         path:"/reports",              icon:FileText,      bg:"#444444" },
  { label:"DOCUMENTS",       path:"/documents",            icon:BookMarked,    bg:"#2d6a4f" },
  { label:"ADMIN",           path:"/admin/panel",          icon:Settings,      bg:"#1a1a2e" },
];

/* ─── STATUS COLORS ─── */
const STATUS: Record<string,{bg:string;text:string}> = {
  pending:   {bg:"#fef3c7",text:"#92400e"},
  approved:  {bg:"#d1fae5",text:"#065f46"},
  rejected:  {bg:"#fee2e2",text:"#991b1b"},
  draft:     {bg:"#f3f4f6",text:"#374151"},
  active:    {bg:"#dbeafe",text:"#1e40af"},
  sent:      {bg:"#ede9fe",text:"#5b21b6"},
  paid:      {bg:"#d1fae5",text:"#065f46"},
  open:      {bg:"#fef3c7",text:"#92400e"},
  issued:    {bg:"#dbeafe",text:"#1e40af"},
  received:  {bg:"#d1fae5",text:"#065f46"},
  completed: {bg:"#d1fae5",text:"#065f46"},
};

/* ═══════════════════════════════════════════
   FUNNEL CHART  — exact CRM trapezoid funnel
═══════════════════════════════════════════ */
function FunnelChart({ data }: { data:{label:string;value:number;color:string}[] }) {
  if (!data.length) return (
    <div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
      <p style={{color:"#a19f9d",fontSize:12}}>No pipeline data yet</p>
      <p style={{color:"#c8c6c4",fontSize:11}}>Create requisitions to see the pipeline</p>
    </div>
  );
  const sorted = [...data].sort((a,b)=>b.value-a.value);
  const n = sorted.length;
  const W = 300, hMin = 46, hStep = (n>1?0:0);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0 0"}}>
      <svg width={W} height={n*hMin+10} style={{overflow:"visible"}}>
        {sorted.map((d,i) => {
          const topPct = 1 - i/(n);
          const botPct = 1 - (i+1)/(n);
          const topW = W * (0.15 + topPct*0.85);
          const botW = W * (0.15 + botPct*0.85);
          const xTop = (W - topW)/2;
          const xBot = (W - botW)/2;
          const y = i * hMin;
          const slope = (topW-botW)/2;
          return (
            <g key={d.label}>
              <polygon
                points={`${xTop},${y} ${xTop+topW},${y} ${xBot+botW},${y+hMin} ${xBot},${y+hMin}`}
                fill={d.color}
                stroke="#fff" strokeWidth={1.5}
              />
              <text x={W/2} y={y+hMin/2+1} textAnchor="middle" dominantBaseline="middle"
                style={{fontSize:11,fill:"#fff",fontWeight:700,fontFamily:"Segoe UI,sans-serif",pointerEvents:"none"}}>
                {fmtKES(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10,marginTop:10}}>
        {sorted.map(d=>(
          <div key={d.label} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:12,height:12,background:d.color,borderRadius:2}}/>
            <span style={{fontSize:10,color:"#605e5c"}}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HORIZONTAL BAR CHART — "Leads by Source Campaign" style
═══════════════════════════════════════════ */
function HBarChart({ data }: { data:{label:string;value:number}[] }) {
  if (!data.length) return (
    <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:"#a19f9d",fontSize:12}}>No department data yet</p>
    </div>
  );
  const max = Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{padding:"6px 0"}}>
      {data.map((d,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",marginBottom:9,gap:0}}>
          <div style={{width:130,textAlign:"right",paddingRight:8,fontSize:10,color:"#605e5c",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {d.label}
          </div>
          <div style={{flex:1,height:18,background:"#f3f2f1",overflow:"hidden"}}>
            <div style={{
              height:"100%",width:`${(d.value/max)*100}%`,
              background:"#1F6090",
              display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4,
              minWidth:20,
            }}>
              <span style={{fontSize:9,color:"#fff",fontWeight:700}}>{d.value}</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:4,borderTop:"1px solid #edebe9",paddingTop:4}}>
        <span style={{fontSize:9,color:"#a19f9d"}}>Count:All (Records)</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STACKED BAR CHART — "Cases By Priority (Per Owner)" style
═══════════════════════════════════════════ */
function StackedBarChart({ data }: { data:{owner:string;low:number;normal:number;high:number}[] }) {
  if (!data.length) return (
    <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:"#a19f9d",fontSize:12}}>No PO data yet</p>
    </div>
  );
  const maxVal = Math.max(...data.map(d=>d.low+d.normal+d.high),1);
  const CH = 150;
  const ticks = Array.from({length:6},(_,i)=>Math.round((i/5)*Math.ceil(maxVal/10)*10));
  return (
    <div style={{padding:"4px 0 0"}}>
      <div style={{display:"flex",gap:4,alignItems:"flex-end",height:CH+24}}>
        {/* Y ticks */}
        <div style={{width:24,height:CH,display:"flex",flexDirection:"column-reverse",justifyContent:"space-between"}}>
          {ticks.map(t=>(
            <span key={t} style={{fontSize:8,color:"#a19f9d",textAlign:"right",display:"block",lineHeight:1}}>{t}</span>
          ))}
        </div>
        <div style={{width:1,height:CH,background:"#edebe9",flexShrink:0}}/>
        {/* Bars */}
        <div style={{flex:1,display:"flex",alignItems:"flex-end",justifyContent:"space-around",height:CH,borderBottom:"1px solid #edebe9",paddingBottom:0}}>
          {data.map((d,i)=>{
            const scale=(v:number)=>(v/maxVal)*CH;
            return (
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:30,display:"flex",flexDirection:"column",justifyContent:"flex-end",height:CH}}>
                  {d.high>0   && <div style={{height:scale(d.high),   background:"#1F6090",width:"100%"}} title={`High: ${d.high}`}/>}
                  {d.normal>0 && <div style={{height:scale(d.normal), background:"#C45911",width:"100%"}} title={`Normal: ${d.normal}`}/>}
                  {d.low>0    && <div style={{height:scale(d.low),    background:"#5C2D91",width:"100%"}} title={`Low: ${d.low}`}/>}
                </div>
                <span style={{fontSize:7.5,color:"#605e5c",marginTop:2,textAlign:"center",maxWidth:40,lineHeight:1.2,wordBreak:"break-word"}}>
                  {d.owner.split(" ").slice(0,2).join(" ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:8,borderTop:"1px solid #edebe9",paddingTop:7}}>
        {[["Low","#5C2D91"],["Normal","#C45911"],["High","#1F6090"]].map(([l,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:12,height:12,background:c}}/>
            <span style={{fontSize:10,color:"#605e5c"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════ */
export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(true);
  const [activities,   setActivities]   = useState<any[]>([]);
  const [funnelData,   setFunnelData]   = useState<{label:string;value:number;color:string}[]>([]);
  const [deptData,     setDeptData]     = useState<{label:string;value:number}[]>([]);
  const [ownerData,    setOwnerData]    = useState<{owner:string;low:number;normal:number;high:number}[]>([]);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName,      setSysName]      = useState("MediProcure");
  const [logoUrl,      setLogoUrl]      = useState<string|null>(null);
  const [activeGroup,  setActiveGroup]  = useState("My Work");
  const [actTab,       setActTab]       = useState<"reqs"|"pos"|"grns">("reqs");
  const [search,       setSearch]       = useState("");
  const [hovTile,      setHovTile]      = useState<string|null>(null);

  const primaryRole = (roles[0]||"user").replace(/_/g," ");

  /* ── DATA LOAD ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, rData, pData, rr, rp, rg] = await Promise.all([
        (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"]),
        (supabase as any).from("requisitions").select("status,total_amount,department_name").limit(200),
        (supabase as any).from("purchase_orders").select("status,total_amount,created_by_name").limit(200),
        (supabase as any).from("requisitions").select("requisition_number,status,total_amount,requested_by_name,department_name,created_at").order("created_at",{ascending:false}).limit(25),
        (supabase as any).from("purchase_orders").select("po_number,status,total_amount,supplier_name,created_by_name,created_at").order("created_at",{ascending:false}).limit(25),
        (supabase as any).from("goods_received").select("grn_number,po_number,received_by_name,status,created_at").order("created_at",{ascending:false}).limit(25),
      ]);

      const m: Record<string,string> = {};
      (cfg.data||[]).forEach((s:any)=>{ if(s.key) m[s.key]=s.value; });
      if(m.system_name)     setSysName(m.system_name);
      if(m.hospital_name)   setHospitalName(m.hospital_name);
      if(m.system_logo_url) setLogoUrl(m.system_logo_url);

      /* funnel */
      const stTot: Record<string,number> = {};
      (rData.data||[]).forEach((r:any)=>{ const s=r.status||"draft"; stTot[s]=(stTot[s]||0)+Number(r.total_amount||0); });
      const fC: Record<string,string> = {draft:"#e05a00",pending:"#ef4444",approved:"#8b5cf6",issued:"#d4a017",received:"#107c10",rejected:"#374151"};
      setFunnelData(Object.entries(stTot).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5)
        .map(([s,v])=>({label:s.charAt(0).toUpperCase()+s.slice(1),value:v,color:fC[s]||"#64748b"})));

      /* dept */
      const dC: Record<string,number> = {};
      (rData.data||[]).forEach((r:any)=>{ const d=r.department_name||"General"; dC[d]=(dC[d]||0)+1; });
      setDeptData(Object.entries(dC).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value])=>({label,value:value as number})));

      /* stacked */
      const oMap: Record<string,{low:number;normal:number;high:number}> = {};
      (pData.data||[]).forEach((p:any)=>{
        const o=(p.created_by_name||"Unknown").split(" ").slice(0,2).join(" ");
        if(!oMap[o]) oMap[o]={low:0,normal:0,high:0};
        const a=Number(p.total_amount||0);
        if(a<50000) oMap[o].low++; else if(a<200000) oMap[o].normal++; else oMap[o].high++;
      });
      setOwnerData(Object.entries(oMap).slice(0,5).map(([owner,v])=>({owner,...v})));

      /* activities */
      setActivities([
        ...(rr.data||[]).map((r:any)=>({_tab:"reqs",subject:r.requisition_number||"—",regarding:r.department_name||"Procurement",type:"Requisition",status:r.status||"draft",owner:r.requested_by_name||"—",amount:r.total_amount,date:r.created_at})),
        ...(rp.data||[]).map((r:any)=>({_tab:"pos", subject:r.po_number||"—",regarding:r.supplier_name||"Supplier",type:"Purchase Order",status:r.status||"draft",owner:r.created_by_name||"—",amount:r.total_amount,date:r.created_at})),
        ...(rg.data||[]).map((r:any)=>({_tab:"grns",subject:r.grn_number||"—",regarding:r.po_number||"PO",type:"GRN",status:r.status||"draft",owner:r.received_by_name||"—",amount:null,date:r.created_at})),
      ]);
    } catch(e){ console.error("Dashboard error:",e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  useEffect(()=>{
    const ch=(supabase as any).channel("dash-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"goods_received"},()=>load())
      .subscribe();
    return ()=>{ (supabase as any).removeChannel(ch); };
  },[load]);

  const visibleActs = activities.filter(r=>{
    const t = actTab==="reqs"?r._tab==="reqs":actTab==="pos"?r._tab==="pos":r._tab==="grns";
    const s = !search || Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()));
    return t && s;
  });

  const groupTiles = GROUP_TILES[activeGroup]||[];
  const tilesToShow = ALL_TILES.filter(t=>groupTiles.includes(t.label));

  /* ── RENDER ── */
  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f3f2f1",minHeight:"calc(100vh - 57px)"}}>

      {/* ══ GROUP NAV BAR — "My Work | Customers | Sales" ══ */}
      <div style={{background:"#fff",borderBottom:"1px solid #edebe9"}}>
        <div style={{display:"flex",alignItems:"center",paddingLeft:8}}>
          {TILE_GROUPS.map(g=>(
            <button key={g} onClick={()=>setActiveGroup(g)}
              style={{
                padding:"10px 16px",fontSize:12,fontWeight:600,
                color:activeGroup===g?"#0078d4":"#605e5c",
                background:"transparent",border:"none",
                borderBottom:activeGroup===g?"2px solid #0078d4":"2px solid transparent",
                cursor:"pointer",whiteSpace:"nowrap",
              }}>{g}</button>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,paddingRight:12}}>
            <span style={{fontSize:12,fontWeight:600,color:"#0078d4",cursor:"pointer"}}>Dashboards</span>
            <ChevronDown style={{width:12,height:12,color:"#0078d4"}}/>
          </div>
        </div>
      </div>

      {/* ══ CRM MODULE TILES ROW ══ */}
      <div style={{background:"#fff",borderBottom:"2px solid #d2d0ce",overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"stretch",minHeight:88}}>
          {tilesToShow.map(tile=>{
            const isH = hovTile===tile.label;
            return (
              <button key={tile.label} onClick={()=>navigate(tile.path)}
                onMouseEnter={()=>setHovTile(tile.label)}
                onMouseLeave={()=>setHovTile(null)}
                style={{
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  gap:6,padding:"10px 8px 8px",
                  minWidth:98,flexShrink:0,
                  background:isH?`rgba(0,0,0,0.15) linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.15)) , ${tile.bg}`:tile.bg,
                  border:"none",
                  borderRight:"2px solid rgba(255,255,255,0.18)",
                  cursor:"pointer",
                  position:"relative",
                  filter:isH?"brightness(0.85)":"none",
                  transition:"filter 0.12s",
                }}>
                <div style={{width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.12)",borderRadius:3}}>
                  <tile.icon style={{width:22,height:22,color:"rgba(255,255,255,0.95)"}}/>
                </div>
                <span style={{fontSize:9,fontWeight:800,color:"#fff",letterSpacing:"0.06em",textAlign:"center",lineHeight:1.2,textTransform:"uppercase" as const}}>
                  {tile.label}
                </span>
                {/* bottom-right chevron exactly like CRM image */}
                <div style={{position:"absolute",bottom:4,right:4,width:14,height:14,background:"rgba(255,255,255,0.2)",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <ChevronDown style={{width:9,height:9,color:"rgba(255,255,255,0.9)"}}/>
                </div>
              </button>
            );
          })}
          <div style={{display:"flex",alignItems:"center",padding:"0 10px",background:"#fff",borderLeft:"1px solid #edebe9",cursor:"pointer"}}>
            <span style={{fontSize:18,color:"#605e5c",lineHeight:1}}>›</span>
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:10}}>

        {/* ── THREE CHARTS ROW — exact CRM layout ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>

          {/* Chart 1 */}
          <div style={{background:"#fff",border:"1px solid #edebe9",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 14px 6px",borderBottom:"1px solid #edebe9"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#323130"}}>Pipeline by Procurement Stage</div>
              <div style={{fontSize:11,color:"#a19f9d",marginTop:1}}>Open Requisitions</div>
            </div>
            <div style={{padding:"4px 12px 12px",minHeight:220}}>
              {loading
                ? <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <RefreshCw style={{width:18,height:18,color:"#d2d0ce"}} className="animate-spin"/>
                  </div>
                : <FunnelChart data={funnelData}/>
              }
            </div>
          </div>

          {/* Chart 2 */}
          <div style={{background:"#fff",border:"1px solid #edebe9",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 14px 6px",borderBottom:"1px solid #edebe9"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#323130"}}>Requisitions by Department</div>
              <div style={{fontSize:11,color:"#a19f9d",marginTop:1}}>Open Requisitions</div>
            </div>
            <div style={{padding:"8px 14px 12px",minHeight:220}}>
              {loading
                ? <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <RefreshCw style={{width:18,height:18,color:"#d2d0ce"}} className="animate-spin"/>
                  </div>
                : <HBarChart data={deptData}/>
              }
            </div>
          </div>

          {/* Chart 3 */}
          <div style={{background:"#fff",border:"1px solid #edebe9",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 14px 6px",borderBottom:"1px solid #edebe9"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#323130"}}>PO Value Tier Per Creator</div>
              <div style={{fontSize:11,color:"#a19f9d",marginTop:1}}>Active Purchase Orders</div>
            </div>
            <div style={{padding:"8px 14px 12px",minHeight:220}}>
              {loading
                ? <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <RefreshCw style={{width:18,height:18,color:"#d2d0ce"}} className="animate-spin"/>
                  </div>
                : <StackedBarChart data={ownerData}/>
              }
            </div>
          </div>
        </div>

        {/* ── ALL ACTIVITIES TABLE — exact CRM "All Activities" style ── */}
        <div style={{background:"#fff",border:"1px solid #edebe9",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>

          {/* Header */}
          <div style={{padding:"8px 14px",borderBottom:"1px solid #edebe9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13,fontWeight:600,color:"#323130"}}>All Activities</span>
              <ChevronDown style={{width:13,height:13,color:"#605e5c"}}/>
              <div style={{display:"flex",alignItems:"center",gap:0,marginLeft:10}}>
                {([["reqs","Requisitions"],["pos","Purchase Orders"],["grns","GRN"]] as const).map(([tab,label])=>(
                  <button key={tab} onClick={()=>setActTab(tab)} style={{
                    padding:"3px 12px",fontSize:11,fontWeight:600,
                    color:actTab===tab?"#0078d4":"#605e5c",
                    background:"transparent",border:"none",
                    borderBottom:actTab===tab?"2px solid #0078d4":"2px solid transparent",
                    cursor:"pointer",
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={load} disabled={loading} style={{background:"none",border:"none",cursor:"pointer",color:"#0078d4",display:"flex",alignItems:"center"}}>
                <RefreshCw style={{width:13,height:13}} className={loading?"animate-spin":""}/>
              </button>
              <button onClick={()=>navigate(actTab==="reqs"?"/requisitions":actTab==="pos"?"/purchase-orders":"/goods-received")}
                style={{background:"none",border:"none",cursor:"pointer",color:"#605e5c"}}>
                <Plus style={{width:16,height:16}}/>
              </button>
              <Grid2x2 style={{width:15,height:15,color:"#605e5c",cursor:"pointer"}}/>
            </div>
          </div>

          {/* Search — exact CRM "Search for records" bar */}
          <div style={{padding:"6px 14px",borderBottom:"1px solid #edebe9",background:"#faf9f8"}}>
            <div style={{position:"relative",maxWidth:280}}>
              <Search style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#a19f9d"}}/>
              <input type="text" placeholder="Search for records" value={search} onChange={e=>setSearch(e.target.value)}
                style={{paddingLeft:28,paddingRight:8,paddingTop:5,paddingBottom:5,fontSize:12,color:"#323130",border:"1px solid #c8c6c4",background:"#fff",width:"100%",outline:"none"}}/>
            </div>
          </div>

          {/* Table */}
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#faf9f8",borderBottom:"1px solid #edebe9"}}>
                  {["Subject","Regarding","Activity Type","Activity Status","Owner","Amount","Start Date"].map(col=>(
                    <th key={col} style={{padding:"8px 14px",textAlign:"left",fontWeight:600,color:"#605e5c",fontSize:11,whiteSpace:"nowrap",borderRight:"1px solid #f3f2f1"}}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1,2,3,4,5].map(i=>(
                      <tr key={i} style={{borderBottom:"1px solid #f3f2f1"}}>
                        {[1,2,3,4,5,6,7].map(j=>(
                          <td key={j} style={{padding:"10px 14px"}}>
                            <div style={{height:10,borderRadius:2,background:"#f3f2f1",width:j===1?"70%":"50%"}}/>
                          </td>
                        ))}
                      </tr>
                    ))
                  : visibleActs.length===0
                  ? (
                    <tr>
                      <td colSpan={7} style={{padding:"32px 14px",textAlign:"center",color:"#a19f9d",fontSize:12}}>
                        No records found.{" "}
                        <button onClick={()=>navigate(actTab==="reqs"?"/requisitions":actTab==="pos"?"/purchase-orders":"/goods-received")}
                          style={{color:"#0078d4",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                          Create one →
                        </button>
                      </td>
                    </tr>
                  )
                  : visibleActs.map((row,i)=>{
                      const sc=STATUS[row.status]||{bg:"#f3f4f6",text:"#6b7280"};
                      return (
                        <tr key={i}
                          style={{borderBottom:"1px solid #f3f2f1",cursor:"pointer"}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f5f5f3"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}
                          onClick={()=>navigate(actTab==="reqs"?"/requisitions":actTab==="pos"?"/purchase-orders":"/goods-received")}>
                          <td style={{padding:"7px 14px",color:"#0078d4",fontWeight:600}}>{row.subject}</td>
                          <td style={{padding:"7px 14px",color:"#323130"}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{width:20,height:20,background:"#e1dfdd",display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:2,flexShrink:0}}>
                                <FileText style={{width:10,height:10,color:"#605e5c"}}/>
                              </div>
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{row.regarding}</span>
                            </div>
                          </td>
                          <td style={{padding:"7px 14px",color:"#323130"}}>{row.type}</td>
                          <td style={{padding:"7px 14px"}}>
                            <span style={{background:sc.bg,color:sc.text,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:600,textTransform:"capitalize" as const}}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{padding:"7px 14px",color:"#323130"}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{width:18,height:18,borderRadius:"50%",background:"#e1dfdd",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <span style={{fontSize:8,color:"#605e5c",fontWeight:700}}>{(row.owner||"?")[0].toUpperCase()}</span>
                              </div>
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{row.owner}</span>
                            </div>
                          </td>
                          <td style={{padding:"7px 14px",color:"#323130"}}>{row.amount?fmtKES(Number(row.amount)):"—"}</td>
                          <td style={{padding:"7px 14px",color:"#a19f9d",whiteSpace:"nowrap"}}>
                            {new Date(row.date).toLocaleDateString("en-KE",{month:"short",day:"2-digit",year:"numeric"})}
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
    </div>
  );
}
