/**
 * EL5 MediProcure — Finance Desktop v2.0
 * Full Windows XP Luna Blue multi-window desktop
 * Finance Officer / Finance Manager role — all modules, all buttons active
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useChartOfAccounts, useRequisitions, usePurchaseOrders } from "@/hooks/useDropdownData";
import { netEngine } from "@/lib/networkEngine";

const db = supabase as any;

// ══ XP PALETTE ═══════════════════════════════════════════════════
let _FDESKBG = "";
try { _FDESKBG = new URL("../assets/procurement-bg.jpg", import.meta.url).href; } catch (_e) { /* ignore */ }
const _FDESK  = _FDESKBG
  ? `url("${_FDESKBG}") center/cover no-repeat`
  : "linear-gradient(160deg,#245ebd 0%,#1a4595 40%,#0f317a 100%)";

const XP = {
  titleBar:    "linear-gradient(180deg,#4490d9 0%,#2461bf 8%,#245ebd 92%,#1a50aa 100%)",
  titleBarInactive: "linear-gradient(180deg,#9db8d2 0%,#6d93b5 8%,#6e90b0 92%,#5d80a0 100%)",
  windowBg:    "#ece9d8",
  desktop:     _FDESK,
  taskbar:     "linear-gradient(180deg,#3a77cc 0%,#2256b5 4%,#2357b8 96%,#1a4ea6 100%)",
  menuBg:      "#ece9d8",
  menuBlue:    "linear-gradient(90deg,#1a3fa0 0%,#2255c0 100%)",
  btnFace:     "linear-gradient(180deg,#f5f4ea 0%,#dbd9c9 100%)",
  btnHover:    "linear-gradient(180deg,#fdfcea 0%,#edead0 100%)",
  btnActive:   "linear-gradient(180deg,#c8c4b0 0%,#dbd9c9 100%)",
  btnPrimary:  "linear-gradient(180deg,#dce9fc 0%,#aac4ee 100%)",
  btnBorder:   "#a29d7f",
  gridHdr:     "linear-gradient(180deg,#dbd9c9,#cbc9b5)",
  gridBorder:  "#c0bca8",
  gridRow:     "#ffffff",
  gridAlt:     "#f5f4ea",
  gridSel:     "#316ac5",
  gridSelTxt:  "#ffffff",
  gridHov:     "#dce9ff",
  statusBg:    "#ece9d8",
  inset:       "inset 1px 1px 3px rgba(0,0,0,.15)",
  shadow:      "4px 4px 16px rgba(0,0,0,.55)",
  font:        "'Tahoma','Segoe UI','Arial',sans-serif",
  fs:          11,
};

// ══ HELPERS ═══════════════════════════════════════════════════════
const fmtK = (n?: number | null) => {
  const v = n || 0;
  if (v >= 1e6) return `KES ${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3) return `KES ${(v/1e3).toFixed(1)}K`;
  return `KES ${v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
};
const fmtFull = (n?: number | null) =>
  `KES ${(n||0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const genId = () => Math.random().toString(36).slice(2,10);

const PAY_METHODS = ["cheque","bank_transfer","cash","mpesa","rtgs","swift"];
const ASSET_CATS  = ["Medical Equipment","Furniture & Fittings","IT Equipment",
  "Motor Vehicles","Land & Buildings","Office Equipment","Laboratory Equipment"];

// ══ PRIMITIVE COMPONENTS ══════════════════════════════════════════
function Btn({ children, onClick, primary, danger, warning, small, disabled, title }: any) {
  const [hov,setHov] = useState(false);
  const [act,setAct] = useState(false);
  const bg = danger  ? (act?"#ffb0b0":hov?"#ffe0e0":"#fff8f8")
           : warning ? (act?"#ffe0b0":hov?"#fff3cd":"#fff8e1")
           : primary ? (act?"linear-gradient(180deg,#b0c8e8,#88aad8)":hov?"linear-gradient(180deg,#d8eeff,#b0ccf0)":XP.btnPrimary)
           : (act?XP.btnActive:hov?XP.btnHover:XP.btnFace);
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setAct(false);}}
      onMouseDown={()=>setAct(true)} onMouseUp={()=>setAct(false)}
      style={{background:disabled?"#e0e0d0":bg,
        border:`1px solid ${danger?"#cc0000":warning?"#cc8800":XP.btnBorder}`,
        borderRadius:3,padding:small?"2px 8px":"3px 14px",
        fontSize:small?10:XP.fs,fontFamily:XP.font,
        color:disabled?"#888":danger?"#880000":warning?"#7a4f00":"#1a1a1a",
        cursor:disabled?"not-allowed":"pointer",
        boxShadow:act?XP.inset:"1px 1px 2px rgba(255,255,255,.8) inset,-1px -1px 2px rgba(0,0,0,.1) inset",
        display:"inline-flex",alignItems:"center",gap:4,
        whiteSpace:"nowrap" as const, userSelect:"none" as const,opacity:disabled?.6:1}}>
      {children}
    </button>
  );
}

function StatusPill({ s }: { s: string }) {
  const m: any = {
    paid:{bg:"#d4edda",c:"#155724",b:"#c3e6cb"}, approved:{bg:"#d4edda",c:"#155724",b:"#c3e6cb"},
    posted:{bg:"#d4edda",c:"#155724",b:"#c3e6cb"}, active:{bg:"#d4edda",c:"#155724",b:"#c3e6cb"},
    received:{bg:"#d4edda",c:"#155724",b:"#c3e6cb"}, matched:{bg:"#d4edda",c:"#155724",b:"#c3e6cb"},
    pending:{bg:"#fff3cd",c:"#856404",b:"#ffc107"}, draft:{bg:"#e9ecef",c:"#495057",b:"#ced4da"},
    rejected:{bg:"#f8d7da",c:"#721c24",b:"#f5c6cb"}, inactive:{bg:"#e9ecef",c:"#495057",b:"#ced4da"},
    disposed:{bg:"#f8d7da",c:"#721c24",b:"#f5c6cb"},
  };
  const x = m[s?.toLowerCase()] ?? {bg:"#e9ecef",c:"#495057",b:"#ced4da"};
  return <span style={{display:"inline-block",padding:"1px 6px",borderRadius:2,fontSize:10,
    fontWeight:700,background:x.bg,color:x.c,border:`1px solid ${x.b}`,
    textTransform:"uppercase" as const,fontFamily:XP.font}}>{s}</span>;
}

function Grid({ cols, rows, selId, onSel, empty }: {
  cols:{key:string;lbl:string;w?:string|number;render?:(v:any,r:any)=>any}[];
  rows:any[]; selId?:string; onSel?:(r:any)=>void; empty?:string;
}) {
  return (
    <div style={{overflow:"auto",flex:1,minHeight:0}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:XP.font,fontSize:10}}>
        <thead>
          <tr>{cols.map(c=><th key={c.key} style={{background:XP.gridHdr,padding:"3px 6px",
            borderBottom:`2px solid ${XP.gridBorder}`,borderRight:`1px solid ${XP.gridBorder}`,
            textAlign:"left",fontSize:10,fontWeight:700,color:"#1a1a1a",
            whiteSpace:"nowrap" as const,position:"sticky" as const,top:0,zIndex:5,width:c.w}}>{c.lbl}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={row.id||i} onClick={()=>onSel?.(row)}
              style={{background:selId===row.id?XP.gridSel:i%2===0?XP.gridRow:XP.gridAlt,
                color:selId===row.id?XP.gridSelTxt:"#1a1a1a",cursor:onSel?"pointer":"default"}}
              onMouseEnter={e=>{if(selId!==row.id)(e.currentTarget as any).style.background=XP.gridHov;}}
              onMouseLeave={e=>{if(selId!==row.id)(e.currentTarget as any).style.background=i%2===0?XP.gridRow:XP.gridAlt;}}>
              {cols.map(c=>(
                <td key={c.key} style={{padding:"3px 6px",borderBottom:`1px solid ${XP.gridBorder}`,
                  borderRight:`1px solid ${XP.gridBorder}`,verticalAlign:"middle" as const,
                  maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                  {c.render ? c.render(row[c.key],row) : row[c.key]??"—"}
                </td>
              ))}
            </tr>
          ))}
          {rows.length===0&&<tr><td colSpan={cols.length} style={{padding:24,textAlign:"center",color:"#888"}}>
            {empty??"No records"}
          </td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: any }) {
  return (
    <div style={{display:"flex",flexDirection:"column" as const,gap:2}}>
      <label style={{fontSize:9,fontWeight:700,color:"#555",textTransform:"uppercase" as const,letterSpacing:".04em"}}>{label}</label>
      {children}
    </div>
  );
}
const inp: React.CSSProperties = {padding:"2px 5px",border:`1px solid ${XP.btnBorder}`,
  borderRadius:2,fontSize:XP.fs,fontFamily:XP.font,background:"#fff",outline:"none",
  width:"100%",boxSizing:"border-box" as const,boxShadow:XP.inset};
const sel: React.CSSProperties = {...inp};

// ══ WINDOW MANAGER ═══════════════════════════════════════════════
type WinId = "overview"|"payments"|"receipts"|"journals"|"purchases"|"sales"|"budgets"|"gl"|"assets"|"bank"|"reports"|"profile";
interface WinState { id:WinId; min:boolean; max:boolean; z:number; x:number; y:number; w:number; h:number; }

const WIN_DEFS: { id:WinId; title:string; icon:string; w:number; h:number }[] = [
  {id:"overview",  title:"Finance Overview",      icon:"🏠", w:820, h:520},
  {id:"payments",  title:"Payment Vouchers",      icon:"💳", w:900, h:560},
  {id:"receipts",  title:"Receipt Vouchers",      icon:"🧾", w:860, h:520},
  {id:"journals",  title:"Journal Vouchers",      icon:"📓", w:840, h:500},
  {id:"purchases", title:"Purchase Vouchers",     icon:"📦", w:880, h:540},
  {id:"sales",     title:"Sales Vouchers",        icon:"🛒", w:880, h:540},
  {id:"budgets",   title:"Budget Control",        icon:"📊", w:800, h:500},
  {id:"gl",        title:"GL / Trial Balance",    icon:"📋", w:760, h:480},
  {id:"assets",    title:"Fixed Assets Register", icon:"🏗", w:880, h:520},
  {id:"bank",      title:"Bank Reconciliation",   icon:"🏦", w:820, h:500},
  {id:"reports",   title:"Financial Reports",     icon:"📈", w:860, h:540},
  {id:"profile",   title:"My Profile",            icon:"👤", w:460, h:380},
];

const DESKTOP_ICONS = [
  {id:"overview" as WinId,  icon:"🏠", label:"Finance Overview"},
  {id:"payments" as WinId,  icon:"💳", label:"Payment Vouchers"},
  {id:"receipts" as WinId,  icon:"🧾", label:"Receipt Vouchers"},
  {id:"journals" as WinId,  icon:"📓", label:"Journal Vouchers"},
  {id:"purchases" as WinId, icon:"📦", label:"Purchase Vouchers"},
  {id:"sales"    as WinId,  icon:"🛒", label:"Sales Vouchers"},
  {id:"budgets"  as WinId,  icon:"📊", label:"Budget Control"},
  {id:"gl"       as WinId,  icon:"📋", label:"GL Accounts"},
  {id:"assets"   as WinId,  icon:"🏗", label:"Fixed Assets"},
  {id:"bank"     as WinId,  icon:"🏦", label:"Bank Reconcile"},
  {id:"reports"  as WinId,  icon:"📈", label:"Reports"},
  {id:"profile"  as WinId,  icon:"👤", label:"My Profile"},
];

// ══ DRAGGABLE XP WINDOW ═══════════════════════════════════════════
function XPWindow({ ws, onFocus, onClose, onMin, onMax, children, title, icon, active }: {
  ws:WinState; onFocus:()=>void; onClose:()=>void; onMin:()=>void; onMax:()=>void;
  children:any; title:string; icon:string; active:boolean;
}) {
  const dragRef = useRef<{sx:number;sy:number;ox:number;oy:number}|null>(null);
  const [pos, setPos] = useState({x:ws.x, y:ws.y});

  if (ws.min) return null;

  const style: React.CSSProperties = ws.max
    ? {position:"fixed",inset:0,top:0,left:0,right:0,bottom:36,width:"100%",height:"calc(100vh - 36px)",
       zIndex:ws.z,display:"flex",flexDirection:"column"}
    : {position:"fixed",top:pos.y,left:pos.x,width:ws.w,height:ws.h,
       zIndex:ws.z,display:"flex",flexDirection:"column"};

  const onDragStart = (e: React.MouseEvent) => {
    if (ws.max) return;
    e.preventDefault();
    dragRef.current = {sx:e.clientX,sy:e.clientY,ox:pos.x,oy:pos.y};
    const move = (ev:MouseEvent) => {
      if (!dragRef.current) return;
      setPos({x:dragRef.current.ox+(ev.clientX-dragRef.current.sx),
               y:Math.max(0,dragRef.current.oy+(ev.clientY-dragRef.current.sy))});
    };
    const up = () => { dragRef.current=null; window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",move);
    window.addEventListener("mouseup",up);
  };

  return (
    <div onMouseDown={onFocus} style={{...style,background:XP.windowBg,
      border:"2px solid #0054e3",borderRadius:6,boxShadow:active?XP.shadow:"3px 3px 10px rgba(0,0,0,.35)",
      overflow:"hidden"}}>
      {/* Title bar */}
      <div onMouseDown={onDragStart} style={{background:active?XP.titleBar:XP.titleBarInactive,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"3px 4px 3px 7px",userSelect:"none" as const,cursor:ws.max?"default":"move",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:13}}>{icon}</span>
          <span style={{color:"#fff",fontSize:10,fontWeight:700,fontFamily:XP.font,
            textShadow:"1px 1px 2px rgba(0,0,0,.6)",overflow:"hidden",textOverflow:"ellipsis",
            whiteSpace:"nowrap" as const,maxWidth:"60vw"}}>{title}</span>
        </div>
        <div style={{display:"flex",gap:2}}>
          <button onMouseDown={e=>e.stopPropagation()} onClick={onMin}
            style={{width:21,height:21,background:"linear-gradient(180deg,#f0a830,#c87000)",
              border:"1px solid #7a4400",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:12,fontWeight:900,
              display:"flex",alignItems:"center",justifyContent:"center"}}>–</button>
          <button onMouseDown={e=>e.stopPropagation()} onClick={onMax}
            style={{width:21,height:21,background:"linear-gradient(180deg,#60d060,#289028)",
              border:"1px solid #1a7018",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:10,
              display:"flex",alignItems:"center",justifyContent:"center"}}>□</button>
          <button onMouseDown={e=>e.stopPropagation()} onClick={onClose}
            style={{width:21,height:21,background:"linear-gradient(180deg,#e85040,#b01818)",
              border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,
              display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      </div>
      {/* Content */}
      <div style={{flex:1,display:"flex",flexDirection:"column" as const,overflow:"hidden",minHeight:0}}>
        {children}
      </div>
      {/* Status bar */}
      <div style={{background:XP.statusBg,borderTop:`1px solid ${XP.btnBorder}`,
        padding:"2px 8px",fontSize:9,fontFamily:XP.font,color:"#555",flexShrink:0}}>
        EL5 MediProcure · Finance Workspace · {new Date().toLocaleDateString("en-KE")}
      </div>
    </div>
  );
}

// ══ WINDOW CONTENT COMPONENTS ═════════════════════════════════════

function OverviewContent({ payments,receipts,glEntries,budgets }: any) {
  const paid   = payments.filter((v:any)=>["paid","approved"].includes(v.status)).reduce((s:number,v:any)=>s+(v.total_amount||0),0);
  const rcpd   = receipts.filter((v:any)=>v.status!=="rejected").reduce((s:number,v:any)=>s+(v.amount||0),0);
  const pend   = payments.filter((v:any)=>v.status==="pending").reduce((s:number,v:any)=>s+(v.total_amount||0),0);
  const totBud = budgets.reduce((s:number,b:any)=>s+(b.total_budget||0),0);
  const totSpt = budgets.reduce((s:number,b:any)=>s+(b.spent||0),0);
  const drTot  = glEntries.reduce((s:number,g:any)=>s+(g.debit||0),0);
  const crTot  = glEntries.reduce((s:number,g:any)=>s+(g.credit||0),0);
  const KPIs = [
    {icon:"💳",label:"TOTAL PAYMENTS",val:fmtK(paid),col:"#721c24"},
    {icon:"🧾",label:"TOTAL RECEIPTS",val:fmtK(rcpd),col:"#155724"},
    {icon:"⚖️",label:"NET BALANCE",val:fmtK(rcpd-paid),col:rcpd>=paid?"#155724":"#721c24"},
    {icon:"⏳",label:"PENDING",val:fmtK(pend),col:"#856404"},
    {icon:"📊",label:"BUDGET ALLOCATED",val:fmtK(totBud),col:"#004085"},
    {icon:"📋",label:"GL BALANCED",val:Math.abs(drTot-crTot)<1?"✓ YES":"⚠ NO",col:Math.abs(drTot-crTot)<1?"#155724":"#721c24"},
  ];
  return (
    <div style={{padding:10,overflowY:"auto" as const,flex:1}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:12}}>
        {KPIs.map(k=>(
          <div key={k.label} style={{flex:"1 1 140px",background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",
            border:`1px solid ${XP.btnBorder}`,borderRadius:4,padding:"8px 12px",
            boxShadow:"1px 1px 4px rgba(0,0,0,.1)"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              <span style={{fontSize:16}}>{k.icon}</span>
              <span style={{fontSize:9,color:"#666",fontFamily:XP.font,fontWeight:700,textTransform:"uppercase" as const}}>{k.label}</span>
            </div>
            <div style={{fontSize:15,fontWeight:900,fontFamily:XP.font,color:k.col}}>{k.val}</div>
          </div>
        ))}
      </div>
      {/* Budget bars */}
      <div style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:3,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:XP.fs,fontFamily:XP.font,marginBottom:6}}>📊 Budget Utilisation</div>
        {budgets.length===0 ? <div style={{color:"#888",fontSize:XP.fs,fontFamily:XP.font}}>No budgets configured</div>
        : budgets.slice(0,6).map((b:any)=>{
          const pct = b.total_budget ? Math.min(((b.spent||0)/b.total_budget)*100,100):0;
          const col = pct>=90?"#dc3545":pct>=70?"#fd7e14":"#28a745";
          return (<div key={b.id} style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2,fontFamily:XP.font}}>
              <span style={{fontWeight:700}}>{b.budget_name||"Budget"} {b.department?`· ${b.department}`:""}</span>
              <span style={{color:col}}>{pct.toFixed(1)}% · {fmtK(b.spent)} / {fmtK(b.total_budget)}</span>
            </div>
            <div style={{height:9,background:"#ccc",borderRadius:2,overflow:"hidden",border:"1px solid #aaa"}}>
              <div style={{width:`${pct}%`,height:"100%",background:col,transition:"width .4s"}}/>
            </div>
          </div>);
        })}
      </div>
      {/* Recent payments */}
      <div style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:3,padding:"8px 12px"}}>
        <div style={{fontWeight:700,fontSize:XP.fs,fontFamily:XP.font,marginBottom:6}}>💳 Recent Payments</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:XP.font,fontSize:10}}>
          <thead><tr style={{background:XP.gridHdr}}>{["Voucher No.","Payee","Amount","Status"].map(h=><th key={h} style={{padding:"3px 6px",textAlign:"left",borderBottom:`1px solid ${XP.gridBorder}`}}>{h}</th>)}</tr></thead>
          <tbody>{payments.slice(0,6).map((p:any,i:number)=>(
            <tr key={p.id} style={{background:i%2===0?"#fff":"#f5f4ea"}}>
              <td style={{padding:"2px 6px",color:"#00008b",fontWeight:700,borderRight:`1px solid ${XP.gridBorder}`}}>{p.voucher_number||`PV/${new Date(p.created_at||Date.now()).getFullYear()}-AUTO`}</td>
              <td style={{padding:"2px 6px",borderRight:`1px solid ${XP.gridBorder}`}}>{p.payee||"—"}</td>
              <td style={{padding:"2px 6px",fontWeight:700,borderRight:`1px solid ${XP.gridBorder}`}}>{fmtK(p.total_amount)}</td>
              <td style={{padding:"2px 6px"}}><StatusPill s={p.status}/></td>
            </tr>
          ))}{payments.length===0&&<tr><td colSpan={4} style={{padding:12,textAlign:"center",color:"#888"}}>No payments yet</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsContent({ data, refresh, isManager, user, profile, coa }: any) {
  const [selRow, setSelRow] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("ALL");
  const [checked, setChecked]   = useState<string[]>([]);

  const rows = useMemo(()=>data.filter((v:any)=>{
    const q=search.toLowerCase();
    return (!search||[v.voucher_number,v.payee,v.description].some((f:any)=>f?.toLowerCase().includes(q)))
      &&(filter==="ALL"||v.status===filter.toLowerCase());
  }),[data,search,filter]);

  const [f,setF] = useState({payee:"",total_amount:"",payment_method:"cheque",
    gl_account:"",vote_head:"",description:"",
    po_reference:"",invoice_reference:"",bank_name:"",payee_account:"",due_date:"",currency:"KES"});
  const { purchaseOrders: pvPOs } = usePurchaseOrders();

  const openNew = () => { setEditRow(null); setF({payee:"",total_amount:"",payment_method:"cheque",gl_account:"",vote_head:"",description:"",po_reference:"",invoice_reference:"",bank_name:"",payee_account:"",due_date:"",currency:"KES"}); setShowForm(true); };
  const openEdit = (r:any) => { setEditRow(r); setF({payee:r.payee||"",total_amount:r.total_amount?.toString()||"",payment_method:r.payment_method||"cheque",gl_account:r.gl_account||"",vote_head:r.vote_head||"",description:r.description||"",po_reference:r.po_reference||"",invoice_reference:r.invoice_reference||"",bank_name:r.bank_name||"",payee_account:r.payee_account||"",due_date:r.due_date||"",currency:r.currency||"KES"}); setShowForm(true); };

  const save = async () => {
    if (!f.payee||!f.total_amount){toast({title:"Payee and amount required",variant:"destructive"});return;}
    setSaving(true);
    const amt=parseFloat(f.total_amount);
    if (editRow) {
      await db.from("payment_vouchers").update({...f,payee_name:f.payee,total_amount:amt,amount:amt,updated_at:new Date().toISOString()}).eq("id",editRow.id);
      toast({title:"✓ Voucher updated"});
    } else {
      const vn=`PV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
      await db.from("payment_vouchers").insert({...f,payee_name:f.payee,voucher_number:vn,total_amount:amt,amount:amt,status:"draft"});
      toast({title:`✓ ${vn} created`});
    }
    setSaving(false); setShowForm(false); setEditRow(null); refresh();
  };

  const upStatus = async (id:string,status:string) => {
    await db.from("payment_vouchers").update({status,approved_by:profile?.full_name||user?.email}).eq("id",id);
    toast({title:`✓ → ${status}`}); refresh(); setSelRow(null);
  };
  const del = async (id:string) => {
    if (!window.confirm("Delete this voucher?")) return;
    await db.from("payment_vouchers").delete().eq("id",id);
    toast({title:"✓ Deleted"}); refresh(); setSelRow(null);
  };
  const bulkApprove = async () => {
    for (const id of checked) await db.from("payment_vouchers").update({status:"approved",approved_by:profile?.full_name||user?.email}).eq("id",id);
    toast({title:`✓ ${checked.length} approved`}); setChecked([]); refresh();
  };
  const exportCSV = () => {
    const h=["Voucher No","Payee","Amount","Method","Status","Date","Approved By"];
    const r=rows.map((v:any)=>`${v.voucher_number||""},${v.payee||""},${v.total_amount||0},${v.payment_method||""},${v.status},${fmtDate(v.created_at)},${v.approved_by||""}`);
    const b=new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="payment_vouchers.csv";a.click();
    toast({title:"✓ Exported"});
  };
  const printAll = () => {
    const w=window.open("","_blank","width=900,height=600");
    if(!w)return;
    const html=`<!DOCTYPE html><html><head><title>Payment Vouchers</title><style>body{font:11px Tahoma}table{width:100%;border-collapse:collapse}th,td{padding:4px 7px;border:1px solid #ccc}th{background:#dbd9c9}</style></head><body><h3>Payment Vouchers — EL5 MediProcure</h3><table><tr>${["Voucher No","Payee","Amount","Method","Status","Date"].map(h=>`<th>${h}</th>`).join("")}</tr>${rows.map((v:any)=>`<tr><td>${v.voucher_number||""}</td><td>${v.payee||""}</td><td>${fmtFull(v.total_amount)}</td><td>${v.payment_method||""}</td><td>${v.status}</td><td>${fmtDate(v.created_at)}</td></tr>`).join("")}</table></body></html>`;
    w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      {/* Toolbar */}
      <div style={{background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,padding:"4px 8px",display:"flex",gap:4,flexWrap:"wrap" as const,flexShrink:0}}>
        <Btn onClick={openNew} primary>+ New Voucher</Btn>
        {checked.length>0&&<><Btn onClick={bulkApprove} primary>✓ Approve ({checked.length})</Btn><Btn onClick={()=>setChecked([])} small>Clear</Btn></>}
        <Btn onClick={exportCSV}>⬇ CSV</Btn>
        <Btn onClick={printAll}>🖨 Print</Btn>
        <div style={{flex:1}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filter..." style={{...inp,width:140}}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...sel,width:90}}>
          {["ALL","DRAFT","PENDING","APPROVED","PAID","REJECTED"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative" as const}}>
        <Grid
          cols={[
            {key:"_chk",lbl:"",w:24,render:(_:any,r:any)=><input type="checkbox" checked={checked.includes(r.id)} onClick={e=>e.stopPropagation()} onChange={e=>setChecked(s=>e.target.checked?[...s,r.id]:s.filter(x=>x!==r.id))}/>},
            {key:"voucher_number",lbl:"Voucher No.",w:140,render:(_:any,r:any)=><span style={{color:"#00008b",fontWeight:700,cursor:"pointer",textDecoration:"underline"}} onClick={e=>{e.stopPropagation();setSelRow(r);}}>{r.voucher_number||`PV/${new Date(r.created_at||Date.now()).getFullYear()}-AUTO`}</span>},
            {key:"payee",lbl:"Payee",w:130},
            {key:"payment_method",lbl:"Method",w:75,render:(v:string)=>v?v.replace("_"," "):"—"},
            {key:"gl_account",lbl:"GL Account",w:160,render:(v:string)=><span style={{fontSize:9,color:"#555"}}>{v||"—"}</span>},
            {key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v}/>},
            {key:"total_amount",lbl:"Amount",w:95,render:(v:number)=><span style={{fontWeight:700}}>{fmtK(v)}</span>},
            {key:"created_at",lbl:"Date",w:75,render:(v:string)=>fmtDate(v)},
            {key:"approved_by",lbl:"Approved By",w:100,render:(v:string)=><span style={{fontSize:9,color:"#555"}}>{v||"—"}</span>},
            {key:"_act",lbl:"",w:125,render:(_:any,r:any)=>(
              <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                {r.status==="draft"&&<Btn onClick={()=>upStatus(r.id,"pending")} small primary>Submit</Btn>}
                {r.status==="pending"&&isManager&&<><Btn onClick={()=>upStatus(r.id,"approved")} small primary>✓</Btn><Btn onClick={()=>upStatus(r.id,"rejected")} small danger>✗</Btn></>}
                {r.status==="approved"&&<Btn onClick={()=>upStatus(r.id,"paid")} small primary>💳 Paid</Btn>}
                <Btn onClick={()=>openEdit(r)} small>✏️</Btn>
                <Btn onClick={()=>del(r.id)} small danger>🗑</Btn>
              </div>
            )},
          ]}
          rows={rows} selId={selRow?.id} onSel={setSelRow} empty="No payment vouchers found"
        />
        {/* Detail panel */}
        {selRow&&(
          <div style={{width:230,background:XP.windowBg,borderLeft:`1px solid ${XP.gridBorder}`,display:"flex",flexDirection:"column" as const,flexShrink:0,overflowY:"auto" as const}}>
            <div style={{background:"linear-gradient(180deg,#6f9fcf,#4a7fc4)",padding:"4px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>Voucher Detail</span>
              <button onClick={()=>setSelRow(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:13}}>✕</button>
            </div>
            <div style={{flex:1,padding:8,fontFamily:XP.font,fontSize:10}}>
              {([["Voucher",selRow.voucher_number||"—"],["Payee",selRow.payee||"—"],["Amount",<span style={{fontWeight:800,color:"#155724",fontSize:13}}>{fmtFull(selRow.total_amount)}</span>],["Method",selRow.payment_method||"—"],["GL",selRow.gl_account||"—"],["Status",<StatusPill s={selRow.status}/>],["Approved By",selRow.approved_by||"—"],["Date",fmtDate(selRow.created_at)]] as [string,any][]).map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:5,padding:"3px 0",borderBottom:`1px solid ${XP.gridBorder}`,alignItems:"center"}}>
                  <span style={{color:"#555",width:65,flexShrink:0,fontSize:9}}>{k}</span>
                  <span style={{flex:1}}>{v}</span>
                </div>
              ))}
              {selRow.description&&<div style={{marginTop:6,padding:5,background:"#fff",border:`1px solid ${XP.gridBorder}`,fontSize:9}}>{selRow.description}</div>}
            </div>
            <div style={{padding:6,borderTop:`1px solid ${XP.gridBorder}`,display:"flex",flexWrap:"wrap" as const,gap:3}}>
              {selRow.status==="pending"&&isManager&&<><Btn onClick={()=>upStatus(selRow.id,"approved")} small primary>✓ Approve</Btn><Btn onClick={()=>upStatus(selRow.id,"rejected")} small danger>✗ Reject</Btn></>}
              {selRow.status==="approved"&&<Btn onClick={()=>upStatus(selRow.id,"paid")} small primary>💳 Paid</Btn>}
              <Btn onClick={()=>openEdit(selRow)} small>✏️ Edit</Btn>
              <Btn onClick={()=>setSelRow(null)} small>Close</Btn>
            </div>
          </div>
        )}
      </div>
      {/* New/Edit Form Modal */}
      {showForm&&(
        <div style={{position:"absolute" as const,inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:XP.windowBg,border:"2px solid #0054e3",borderRadius:4,boxShadow:XP.shadow,width:"min(600px,95%)",maxHeight:"85%",display:"flex",flexDirection:"column" as const}}>
            <div style={{background:XP.titleBar,padding:"3px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>💳 {editRow?"Edit":"New"} Payment Voucher</span>
              <button onClick={()=>{setShowForm(false);setEditRow(null);}} style={{background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,width:21,height:21}}>✕</button>
            </div>
            <div style={{overflow:"auto",padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Payee *"><input value={f.payee} onChange={e=>setF(p=>({...p,payee:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Amount (KES) *"><input type="number" value={f.total_amount} onChange={e=>setF(p=>({...p,total_amount:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Method"><select value={f.payment_method} onChange={e=>setF(p=>({...p,payment_method:e.target.value}))} style={sel}>{PAY_METHODS.map(m=><option key={m}>{m}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Currency"><select value={f.currency} onChange={e=>setF(p=>({...p,currency:e.target.value}))} style={sel}>{["KES","USD","EUR","GBP"].map(c=><option key={c}>{c}</option>)}</select></FieldRow></div>
                <div><FieldRow label="GL Account"><select value={f.gl_account} onChange={e=>setF(p=>({...p,gl_account:e.target.value}))} style={sel}><option value="">— Select —</option>{coa.map(a=><option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Bank Name"><input value={f.bank_name} onChange={e=>setF(p=>({...p,bank_name:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Account No."><input value={f.payee_account} onChange={e=>setF(p=>({...p,payee_account:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Due Date"><input type="date" value={f.due_date} onChange={e=>setF(p=>({...p,due_date:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="PO Reference"><select value={f.po_reference} onChange={e=>{
                  const poNum = e.target.value;
                  const matched = pvPOs.find((po:any)=>po.po_number===poNum);
                  setF(p=>({
                    ...p,
                    po_reference: poNum,
                    payee: matched && !p.payee ? (matched.supplier_name||p.payee) : p.payee,
                    total_amount: matched && !p.total_amount ? String(matched.total_amount||p.total_amount) : p.total_amount,
                  }));
                }} style={sel}>
                  <option value="">— None —</option>
                  {pvPOs.map((po:any)=><option key={po.id} value={po.po_number}>{po.po_number} — {po.supplier_name||"Supplier"}</option>)}
                </select></FieldRow></div>
                <div><FieldRow label="Invoice Reference"><input value={f.invoice_reference} onChange={e=>setF(p=>({...p,invoice_reference:e.target.value}))} style={inp}/></FieldRow></div>
                <div style={{gridColumn:"span 3"}}><FieldRow label="Description"><input value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} style={inp}/></FieldRow></div>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}>
                <Btn onClick={save} disabled={saving} primary>{saving?"⏳ Saving…":"💾 Save Voucher"}</Btn>
                <Btn onClick={()=>{setShowForm(false);setEditRow(null);}}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptsContent({ data, refresh, isManager, user, profile, coa }: any) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({payer:"",amount:"",payment_method:"cash",gl_account:"",description:"",reference_number:""});
  const { requisitions } = useRequisitions();
  const { purchaseOrders } = usePurchaseOrders();

  const rows = useMemo(()=>data.filter((v:any)=>!search||[v.receipt_number,v.payer,v.description].some((x:any)=>x?.toLowerCase().includes(search.toLowerCase()))),[data,search]);

  const openNew = ()=>{setEditRow(null);setF({payer:"",amount:"",payment_method:"cash",gl_account:"",description:"",reference_number:""});setShowForm(true);};
  const openEdit = (r:any)=>{setEditRow(r);setF({payer:r.payer||"",amount:r.amount?.toString()||"",payment_method:r.payment_method||"cash",gl_account:r.gl_account||"",description:r.description||"",reference_number:r.reference_number||""});setShowForm(true);};

  const save = async () => {
    if (!f.payer||!f.amount){toast({title:"Payer and amount required",variant:"destructive"});return;}
    setSaving(true);
    const amt2=parseFloat(f.amount);
    if (editRow) {
      await db.from("receipt_vouchers").update({...f,amount:amt2,total_amount:amt2,updated_at:new Date().toISOString()}).eq("id",editRow.id);
      toast({title:"✓ Updated"});
    } else {
      const rn=`RV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
      await db.from("receipt_vouchers").insert({...f,receipt_number:rn,received_from:f.payer,amount:amt2,total_amount:amt2,status:"draft"});
      toast({title:`✓ ${rn} created`});
    }
    setSaving(false);setShowForm(false);setEditRow(null);refresh();
  };
  const upStatus = async (id:string,status:string) => {
    await db.from("receipt_vouchers").update({status,approved_by:profile?.full_name||user?.email}).eq("id",id);
    toast({title:`✓ → ${status}`});refresh();
  };
  const exportCSV = ()=>{const h=["Receipt No","Payer","Amount","Method","Status","Date"];const r=rows.map((v:any)=>`${v.receipt_number||""},${v.payer||""},${v.amount||0},${v.payment_method||""},${v.status},${fmtDate(v.created_at)}`);const b=new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="receipts.csv";a.click();toast({title:"✓ Exported"});};

  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,padding:"4px 8px",display:"flex",gap:4,flexWrap:"wrap" as const,flexShrink:0}}>
        <Btn onClick={openNew} primary>+ New Receipt</Btn>
        <Btn onClick={exportCSV}>⬇ CSV</Btn>
        <div style={{flex:1}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filter..." style={{...inp,width:140}}/>
      </div>
      <Grid
        cols={[
          {key:"receipt_number",lbl:"Receipt No.",w:140,render:(_:any,r:any)=><span style={{color:"#00008b",fontWeight:700}}>{r.receipt_number||`RV/${new Date(r.created_at||Date.now()).getFullYear()}-AUTO`}</span>},
          {key:"payer",lbl:"Payer / Source",w:130},{key:"payment_method",lbl:"Method",w:75},{key:"gl_account",lbl:"GL Account",w:160,render:(v:string)=><span style={{fontSize:9,color:"#555"}}>{v||"—"}</span>},
          {key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v}/>},
          {key:"amount",lbl:"Amount",w:95,render:(v:number)=><span style={{fontWeight:700,color:"#155724"}}>{fmtK(v)}</span>},
          {key:"created_at",lbl:"Date",w:75,render:(v:string)=>fmtDate(v)},
          {key:"_act",lbl:"",w:120,render:(_:any,r:any)=>(
            <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
              {r.status==="draft"&&<Btn onClick={()=>upStatus(r.id,"pending")} small primary>Submit</Btn>}
              {r.status==="pending"&&isManager&&<><Btn onClick={()=>upStatus(r.id,"received")} small primary>✓</Btn><Btn onClick={()=>upStatus(r.id,"rejected")} small danger>✗</Btn></>}
              <Btn onClick={()=>openEdit(r)} small>✏️</Btn>
            </div>
          )},
        ]}
        rows={rows} empty="No receipt vouchers found"
      />
      {showForm&&(
        <div style={{position:"absolute" as const,inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:XP.windowBg,border:"2px solid #0054e3",borderRadius:4,boxShadow:XP.shadow,width:"min(500px,95%)",maxHeight:"80%",display:"flex",flexDirection:"column" as const}}>
            <div style={{background:XP.titleBar,padding:"3px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>🧾 {editRow?"Edit":"New"} Receipt Voucher</span>
              <button onClick={()=>{setShowForm(false);setEditRow(null);}} style={{background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,width:21,height:21}}>✕</button>
            </div>
            <div style={{overflow:"auto",padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Payer *"><input value={f.payer} onChange={e=>setF(p=>({...p,payer:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Amount (KES) *"><input type="number" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Method"><select value={f.payment_method} onChange={e=>setF(p=>({...p,payment_method:e.target.value}))} style={sel}>{PAY_METHODS.map(m=><option key={m}>{m}</option>)}</select></FieldRow></div>
                <div style={{gridColumn:"span 2"}}><FieldRow label="GL Account"><select value={f.gl_account} onChange={e=>setF(p=>({...p,gl_account:e.target.value}))} style={sel}><option value="">— Select —</option>{coa.filter(a=>a.type==="inc"||a.type==="ass").map(a=><option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Reference No."><select value={f.reference_number} onChange={e=>{
                  const val = e.target.value;
                  const req = requisitions.find((r:any)=>r.requisition_number===val);
                  const po  = purchaseOrders.find((p:any)=>p.po_number===val);
                  setF(p=>({
                    ...p,
                    reference_number: val,
                    payer: !p.payer ? (req?.requester_name || po?.supplier_name || p.payer) : p.payer,
                    amount: !p.amount ? String(req?.total_amount || po?.total_amount || p.amount) : p.amount,
                  }));
                }} style={inp}>
                  <option value="">— None —</option>
                  <optgroup label="Requisitions">
                    {requisitions.map((r:any)=><option key={r.id} value={r.requisition_number}>{r.requisition_number} — {r.title||r.department||""}</option>)}
                  </optgroup>
                  <optgroup label="Purchase Orders">
                    {purchaseOrders.map((po:any)=><option key={po.id} value={po.po_number}>{po.po_number} — {po.supplier_name||""}</option>)}
                  </optgroup>
                </select></FieldRow></div>
                <div style={{gridColumn:"span 3"}}><FieldRow label="Description"><input value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} style={inp}/></FieldRow></div>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}>
                <Btn onClick={save} disabled={saving} primary>{saving?"⏳ Saving…":"💾 Save"}</Btn>
                <Btn onClick={()=>{setShowForm(false);setEditRow(null);}}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseVouchersContent({ data, refresh, isManager, user, profile, coa }: any) {
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [selRow, setSelRow] = useState<any>(null);
  const { purchaseOrders } = usePurchaseOrders();

  const rows = useMemo(()=>data.filter((v:any)=>!search||[v.voucher_number,v.supplier_name,v.invoice_number,v.description].some((x:any)=>x?.toLowerCase?.().includes(search.toLowerCase()))),[data,search]);

  const blankForm = {supplier_name:"",invoice_number:"",amount:"",po_reference:"",expense_account:"",description:"",due_date:"",currency:"KES"};
  const [f, setF] = useState(blankForm);
  const openNew  = () => { setEditRow(null); setF(blankForm); setShowForm(true); };
  const openEdit = (r:any) => { setEditRow(r); setF({supplier_name:r.supplier_name||"",invoice_number:r.invoice_number||"",amount:r.amount?.toString()||"",po_reference:r.po_reference||"",expense_account:r.expense_account||"",description:r.description||"",due_date:r.due_date||"",currency:r.currency||"KES"}); setShowForm(true); };

  const save = async () => {
    if (!f.supplier_name||!f.amount) { toast({title:"Supplier and amount required",variant:"destructive"}); return; }
    setSaving(true);
    const amt = parseFloat(f.amount);
    if (editRow) {
      await db.from("purchase_vouchers").update({...f,amount:amt,updated_at:new Date().toISOString()}).eq("id",editRow.id);
      toast({title:"✓ Purchase voucher updated"});
    } else {
      const vn = `PUR/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
      await db.from("purchase_vouchers").insert({...f,voucher_number:vn,amount:amt,line_items:[],status:"pending",created_by:user?.id,created_by_name:profile?.full_name||user?.email});
      toast({title:`✓ ${vn} created`});
    }
    setSaving(false); setShowForm(false); setEditRow(null); refresh();
  };
  const upStatus = async (id:string, status:string) => {
    await db.from("purchase_vouchers").update({status,approved_by:user?.id,approved_by_name:profile?.full_name||user?.email}).eq("id",id);
    toast({title:`✓ → ${status}`}); refresh(); setSelRow(null);
  };
  const del = async (id:string) => {
    if (!window.confirm("Delete this purchase voucher?")) return;
    await db.from("purchase_vouchers").delete().eq("id",id);
    toast({title:"✓ Deleted"}); refresh(); setSelRow(null);
  };
  const exportCSV = () => {
    const h=["Voucher No","Supplier","Invoice No","Amount","Status","Date"];
    const r=rows.map((v:any)=>`${v.voucher_number||""},${v.supplier_name||""},${v.invoice_number||""},${v.amount||0},${v.status},${fmtDate(v.created_at)}`);
    const b=new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="purchase_vouchers.csv"; a.click();
    toast({title:"✓ Exported"});
  };

  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,padding:"4px 8px",display:"flex",gap:4,flexWrap:"wrap" as const,flexShrink:0}}>
        <Btn onClick={openNew} primary>+ New Purchase Voucher</Btn>
        <Btn onClick={exportCSV}>⬇ CSV</Btn>
        <div style={{flex:1}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filter..." style={{...inp,width:140}}/>
      </div>
      <Grid
        cols={[
          {key:"voucher_number",lbl:"Voucher No.",w:140,render:(_:any,r:any)=><span style={{color:"#00008b",fontWeight:700,cursor:"pointer",textDecoration:"underline"}} onClick={e=>{e.stopPropagation();setSelRow(r);}}>{r.voucher_number}</span>},
          {key:"supplier_name",lbl:"Supplier",w:140},
          {key:"invoice_number",lbl:"Invoice No.",w:100,render:(v:string)=>v||"—"},
          {key:"expense_account",lbl:"Expense A/C",w:150,render:(v:string)=><span style={{fontSize:9,color:"#555"}}>{v||"—"}</span>},
          {key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v}/>},
          {key:"amount",lbl:"Amount",w:95,render:(v:number)=><span style={{fontWeight:700}}>{fmtK(v)}</span>},
          {key:"created_at",lbl:"Date",w:75,render:(v:string)=>fmtDate(v)},
          {key:"_act",lbl:"",w:120,render:(_:any,r:any)=>(
            <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
              {r.status==="pending"&&isManager&&<><Btn onClick={()=>upStatus(r.id,"approved")} small primary>✓</Btn><Btn onClick={()=>upStatus(r.id,"rejected")} small danger>✗</Btn></>}
              {r.status==="approved"&&<Btn onClick={()=>upStatus(r.id,"paid")} small primary>💳 Paid</Btn>}
              <Btn onClick={()=>openEdit(r)} small>✏️</Btn>
              <Btn onClick={()=>del(r.id)} small danger>🗑</Btn>
            </div>
          )},
        ]}
        rows={rows} selId={selRow?.id} onSel={setSelRow} empty="No purchase vouchers found"
      />
      {showForm&&(
        <div style={{position:"absolute" as const,inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:XP.windowBg,border:"2px solid #0054e3",borderRadius:4,boxShadow:XP.shadow,width:"min(560px,95%)",maxHeight:"85%",display:"flex",flexDirection:"column" as const}}>
            <div style={{background:XP.titleBar,padding:"3px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>📦 {editRow?"Edit":"New"} Purchase Voucher</span>
              <button onClick={()=>{setShowForm(false);setEditRow(null);}} style={{background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,width:21,height:21}}>✕</button>
            </div>
            <div style={{overflow:"auto",padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Supplier *"><input value={f.supplier_name} onChange={e=>setF(p=>({...p,supplier_name:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Amount (KES) *"><input type="number" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Invoice No."><input value={f.invoice_number} onChange={e=>setF(p=>({...p,invoice_number:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Currency"><select value={f.currency} onChange={e=>setF(p=>({...p,currency:e.target.value}))} style={sel}>{["KES","USD","EUR","GBP"].map(c=><option key={c}>{c}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Due Date"><input type="date" value={f.due_date} onChange={e=>setF(p=>({...p,due_date:e.target.value}))} style={inp}/></FieldRow></div>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Expense Account"><select value={f.expense_account} onChange={e=>setF(p=>({...p,expense_account:e.target.value}))} style={sel}><option value="">— Select —</option>{coa.filter((a:any)=>a.type==="exp").map((a:any)=><option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></FieldRow></div>
                <div><FieldRow label="PO Reference"><select value={f.po_reference} onChange={e=>{
                  const poNum = e.target.value;
                  const matched = purchaseOrders.find((po:any)=>po.po_number===poNum);
                  setF(p=>({...p,po_reference:poNum,
                    supplier_name: matched && !p.supplier_name ? (matched.supplier_name||p.supplier_name) : p.supplier_name,
                    amount: matched && !p.amount ? String(matched.total_amount||p.amount) : p.amount}));
                }} style={sel}>
                  <option value="">— None —</option>
                  {purchaseOrders.map((po:any)=><option key={po.id} value={po.po_number}>{po.po_number} — {po.supplier_name||"Supplier"}</option>)}
                </select></FieldRow></div>
                <div style={{gridColumn:"span 3"}}><FieldRow label="Description"><input value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} style={inp}/></FieldRow></div>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}>
                <Btn onClick={save} disabled={saving} primary>{saving?"⏳ Saving…":"💾 Save Voucher"}</Btn>
                <Btn onClick={()=>{setShowForm(false);setEditRow(null);}}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesVouchersContent({ data, refresh, user, profile, coa }: any) {
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [selRow, setSelRow] = useState<any>(null);

  const rows = useMemo(()=>data.filter((v:any)=>!search||[v.voucher_number,v.customer_name,v.patient_number,v.description].some((x:any)=>x?.toLowerCase?.().includes(search.toLowerCase()))),[data,search]);

  const blankForm = {customer_name:"",customer_type:"walk_in",patient_number:"",payment_method:"Cash",amount:"",income_account:"",description:"",due_date:"",currency:"KES"};
  const [f, setF] = useState(blankForm);
  const openNew  = () => { setEditRow(null); setF(blankForm); setShowForm(true); };
  const openEdit = (r:any) => { setEditRow(r); setF({customer_name:r.customer_name||"",customer_type:r.customer_type||"walk_in",patient_number:r.patient_number||"",payment_method:r.payment_method||"Cash",amount:r.amount?.toString()||"",income_account:r.income_account||"",description:r.description||"",due_date:r.due_date||"",currency:r.currency||"KES"}); setShowForm(true); };

  const save = async () => {
    if (!f.customer_name||!f.amount) { toast({title:"Customer and amount required",variant:"destructive"}); return; }
    setSaving(true);
    const amt = parseFloat(f.amount);
    if (editRow) {
      await db.from("sales_vouchers").update({...f,amount:amt,updated_at:new Date().toISOString()}).eq("id",editRow.id);
      toast({title:"✓ Sales voucher updated"});
    } else {
      const vn = `SV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
      await db.from("sales_vouchers").insert({...f,voucher_number:vn,amount:amt,line_items:[],status:"confirmed",created_by:user?.id,created_by_name:profile?.full_name||user?.email});
      toast({title:`✓ ${vn} created`});
    }
    setSaving(false); setShowForm(false); setEditRow(null); refresh();
  };
  const upStatus = async (id:string, status:string) => {
    await db.from("sales_vouchers").update({status,approved_by:user?.id,approved_by_name:profile?.full_name||user?.email}).eq("id",id);
    toast({title:`✓ → ${status}`}); refresh(); setSelRow(null);
  };
  const del = async (id:string) => {
    if (!window.confirm("Delete this sales voucher?")) return;
    await db.from("sales_vouchers").delete().eq("id",id);
    toast({title:"✓ Deleted"}); refresh(); setSelRow(null);
  };
  const exportCSV = () => {
    const h=["Voucher No","Customer","Type","Amount","Status","Date"];
    const r=rows.map((v:any)=>`${v.voucher_number||""},${v.customer_name||""},${v.customer_type||""},${v.amount||0},${v.status},${fmtDate(v.created_at)}`);
    const b=new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="sales_vouchers.csv"; a.click();
    toast({title:"✓ Exported"});
  };

  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,padding:"4px 8px",display:"flex",gap:4,flexWrap:"wrap" as const,flexShrink:0}}>
        <Btn onClick={openNew} primary>+ New Sales Voucher</Btn>
        <Btn onClick={exportCSV}>⬇ CSV</Btn>
        <div style={{flex:1}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filter..." style={{...inp,width:140}}/>
      </div>
      <Grid
        cols={[
          {key:"voucher_number",lbl:"Voucher No.",w:140,render:(_:any,r:any)=><span style={{color:"#00008b",fontWeight:700,cursor:"pointer",textDecoration:"underline"}} onClick={e=>{e.stopPropagation();setSelRow(r);}}>{r.voucher_number}</span>},
          {key:"customer_name",lbl:"Customer",w:140},
          {key:"customer_type",lbl:"Type",w:80,render:(v:string)=>v?v.replace("_"," "):"—"},
          {key:"payment_method",lbl:"Method",w:75},
          {key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v}/>},
          {key:"amount",lbl:"Amount",w:95,render:(v:number)=><span style={{fontWeight:700,color:"#155724"}}>{fmtK(v)}</span>},
          {key:"created_at",lbl:"Date",w:75,render:(v:string)=>fmtDate(v)},
          {key:"_act",lbl:"",w:110,render:(_:any,r:any)=>(
            <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
              {r.status==="confirmed"&&<Btn onClick={()=>upStatus(r.id,"paid")} small primary>💳 Paid</Btn>}
              {r.status!=="cancelled"&&r.status!=="paid"&&<Btn onClick={()=>upStatus(r.id,"cancelled")} small danger>✗</Btn>}
              <Btn onClick={()=>openEdit(r)} small>✏️</Btn>
              <Btn onClick={()=>del(r.id)} small danger>🗑</Btn>
            </div>
          )},
        ]}
        rows={rows} selId={selRow?.id} onSel={setSelRow} empty="No sales vouchers found"
      />
      {showForm&&(
        <div style={{position:"absolute" as const,inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:XP.windowBg,border:"2px solid #0054e3",borderRadius:4,boxShadow:XP.shadow,width:"min(560px,95%)",maxHeight:"85%",display:"flex",flexDirection:"column" as const}}>
            <div style={{background:XP.titleBar,padding:"3px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>🛒 {editRow?"Edit":"New"} Sales Voucher</span>
              <button onClick={()=>{setShowForm(false);setEditRow(null);}} style={{background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,width:21,height:21}}>✕</button>
            </div>
            <div style={{overflow:"auto",padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Customer *"><input value={f.customer_name} onChange={e=>setF(p=>({...p,customer_name:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Amount (KES) *"><input type="number" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Customer Type"><select value={f.customer_type} onChange={e=>setF(p=>({...p,customer_type:e.target.value}))} style={sel}>{["walk_in","patient","department","external"].map(t=><option key={t} value={t}>{t.replace("_"," ")}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Patient No."><input value={f.patient_number} onChange={e=>setF(p=>({...p,patient_number:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Payment Method"><select value={f.payment_method} onChange={e=>setF(p=>({...p,payment_method:e.target.value}))} style={sel}>{PAY_METHODS.map(m=><option key={m}>{m}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Due Date"><input type="date" value={f.due_date} onChange={e=>setF(p=>({...p,due_date:e.target.value}))} style={inp}/></FieldRow></div>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Income Account"><select value={f.income_account} onChange={e=>setF(p=>({...p,income_account:e.target.value}))} style={sel}><option value="">— Select —</option>{coa.filter((a:any)=>a.type==="inc").map((a:any)=><option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></FieldRow></div>
                <div style={{gridColumn:"span 3"}}><FieldRow label="Description"><input value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} style={inp}/></FieldRow></div>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}>
                <Btn onClick={save} disabled={saving} primary>{saving?"⏳ Saving…":"💾 Save Voucher"}</Btn>
                <Btn onClick={()=>{setShowForm(false);setEditRow(null);}}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JournalsContent({ data, refresh, coa }: any) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [f, setF] = useState({reference:"",description:"",gl_debit:"",gl_credit:"",debit:"",credit:""});
  const bal = (parseFloat(f.debit)||0)-(parseFloat(f.credit)||0);
  const balanced = Math.abs(bal)<0.01;
  const drTot = data.reduce((s:number,g:any)=>s+(g.debit||0),0);
  const crTot = data.reduce((s:number,g:any)=>s+(g.credit||0),0);

  const save = async () => {
    if (!f.description){toast({title:"Description required",variant:"destructive"});return;}
    if (!balanced){toast({title:"Entry must be balanced",variant:"destructive"});return;}
    setSaving(true);
    const ref=f.reference||`JV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    if (f.debit) await db.from("gl_entries").insert({reference:ref,description:f.description,gl_account:f.gl_debit,debit:parseFloat(f.debit),status:"posted"});
    if (f.credit) await db.from("gl_entries").insert({reference:ref,description:f.description,gl_account:f.gl_credit,credit:parseFloat(f.credit),status:"posted"});
    setSaving(false);setShowForm(false);toast({title:`✓ ${ref} posted`});refresh();
  };

  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{padding:"4px 8px",background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,display:"flex",gap:4,flexWrap:"wrap" as const,flexShrink:0}}>
        <Btn onClick={()=>setShowForm(true)} primary>+ New Journal Entry</Btn>
        <div style={{padding:"3px 10px",background:Math.abs(drTot-crTot)<1?"#d4edda":"#fff3cd",border:`1px solid ${Math.abs(drTot-crTot)<1?"#c3e6cb":"#ffc107"}`,borderRadius:2,fontSize:10,fontFamily:XP.font}}>
          {Math.abs(drTot-crTot)<1?"✓ GL BALANCED":"⚠ UNBALANCED"} · Dr {fmtK(drTot)} · Cr {fmtK(crTot)}
        </div>
      </div>
      <Grid
        cols={[
          {key:"reference",lbl:"Reference",w:120,render:(v:string,r:any)=><span style={{fontFamily:"monospace",fontSize:9,fontWeight:700,color:"#00008b"}}>{v||`JV/${new Date(r.created_at||Date.now()).getFullYear()}-AUTO`}</span>},
          {key:"description",lbl:"Description"},{key:"gl_account",lbl:"GL Account",w:155,render:(v:string)=><span style={{fontSize:9}}>{v||"—"}</span>},
          {key:"debit",lbl:"Debit",w:105,render:(v:number)=><span style={{fontWeight:700,color:v?"#155724":"#888"}}>{v?fmtK(v):"—"}</span>},
          {key:"credit",lbl:"Credit",w:105,render:(v:number)=><span style={{fontWeight:700,color:v?"#004085":"#888"}}>{v?fmtK(v):"—"}</span>},
          {key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v||"posted"}/>},
          {key:"created_at",lbl:"Date",w:75,render:(v:string)=>fmtDate(v)},
        ]}
        rows={data} empty="No journal entries — post entries to see the GL"
      />
      {showForm&&(
        <div style={{position:"absolute" as const,inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:XP.windowBg,border:"2px solid #0054e3",borderRadius:4,boxShadow:XP.shadow,width:"min(520px,95%)",maxHeight:"80%",display:"flex",flexDirection:"column" as const}}>
            <div style={{background:XP.titleBar,padding:"3px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>📓 New Journal Entry</span>
              <button onClick={()=>setShowForm(false)} style={{background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,width:21,height:21}}>✕</button>
            </div>
            <div style={{overflow:"auto",padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div><FieldRow label="Reference"><input value={f.reference} onChange={e=>setF(p=>({...p,reference:e.target.value}))} placeholder="JV-00001" style={inp}/></FieldRow></div>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Description *"><input value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} style={inp}/></FieldRow></div>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Debit Account"><select value={f.gl_debit} onChange={e=>setF(p=>({...p,gl_debit:e.target.value}))} style={sel}><option value="">— Select —</option>{coa.map(a=><option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Debit Amount"><input type="number" value={f.debit} onChange={e=>setF(p=>({...p,debit:e.target.value}))} style={inp}/></FieldRow></div>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Credit Account"><select value={f.gl_credit} onChange={e=>setF(p=>({...p,gl_credit:e.target.value}))} style={sel}><option value="">— Select —</option>{coa.map(a=><option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Credit Amount"><input type="number" value={f.credit} onChange={e=>setF(p=>({...p,credit:e.target.value}))} style={inp}/></FieldRow></div>
              </div>
              <div style={{marginTop:8,padding:"5px 10px",background:balanced?"#d4edda":"#fff3cd",border:`1px solid ${balanced?"#c3e6cb":"#ffc107"}`,borderRadius:3,fontSize:10,fontFamily:XP.font}}>
                {balanced?"✓ Entry is balanced (Dr = Cr)":`⚠ Imbalance: ${fmtFull(Math.abs(bal))} ${bal>0?"excess debit":"excess credit"}`}
              </div>
              <div style={{marginTop:8,display:"flex",gap:6}}>
                <Btn onClick={save} disabled={saving||!balanced} primary>{saving?"⏳ Posting…":"📓 Post Entry"}</Btn>
                <Btn onClick={()=>setShowForm(false)}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetsContent({ data }: any) {
  const tot = data.reduce((s:number,b:any)=>s+(b.total_budget||0),0);
  const spt = data.reduce((s:number,b:any)=>s+(b.spent||0),0);
  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{padding:"4px 8px",background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,display:"flex",gap:12,fontFamily:XP.font,fontSize:10,flexShrink:0}}>
        <span>Allocated: <strong style={{color:"#00008b"}}>{fmtFull(tot)}</strong></span>
        <span>Spent: <strong style={{color:spt/tot>.9?"#dc3545":"#155724"}}>{fmtFull(spt)}</strong></span>
        <span>Remaining: <strong>{fmtFull(tot-spt)}</strong></span>
        <span style={{marginLeft:"auto",color:"#666"}}>{data.length} lines</span>
      </div>
      <Grid
        cols={[
          {key:"budget_name",lbl:"Budget Name"},{key:"fiscal_year",lbl:"FY",w:50},{key:"department",lbl:"Department",w:120},
          {key:"total_budget",lbl:"Allocated",w:110,render:(v:number)=><span style={{fontWeight:700}}>{fmtK(v)}</span>},
          {key:"spent",lbl:"Spent",w:100,render:(v:number)=><span style={{fontWeight:700,color:"#721c24"}}>{fmtK(v)}</span>},
          {key:"remaining",lbl:"Remaining",w:100,render:(v:number)=><span style={{fontWeight:700,color:"#155724"}}>{fmtK(v)}</span>},
          {key:"_util",lbl:"Utilisation",w:120,render:(_:any,r:any)=>{
            const pct=r.total_budget?Math.min(((r.spent||0)/r.total_budget)*100,100):0;
            const col=pct>=90?"#dc3545":pct>=70?"#fd7e14":"#28a745";
            return <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{flex:1,height:8,background:"#ccc",borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:col}}/></div><span style={{fontSize:9,color:col,fontWeight:700,minWidth:28}}>{pct.toFixed(0)}%</span></div>;
          }},
          {key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v||"active"}/>},
        ]}
        rows={data} empty="No budget lines found"
      />
    </div>
  );
}

function GLContent({ data, coa }: any) {
  const balMap: Record<string,{dr:number;cr:number}> = {};
  data.forEach((g:any)=>{const k=g.gl_account||"Unknown";if(!balMap[k])balMap[k]={dr:0,cr:0};balMap[k].dr+=g.debit||0;balMap[k].cr+=g.credit||0;});
  const rows=Object.entries(balMap).map(([acct,b])=>({id:acct,account:acct,dr:b.dr,cr:b.cr,balance:b.dr-b.cr}));
  const trDr=rows.reduce((s,r)=>s+r.dr,0),trCr=rows.reduce((s,r)=>s+r.cr,0);
  const bal=Math.abs(trDr-trCr)<1;
  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{padding:"4px 8px",background:bal?"#d4edda":"#fff3cd",borderBottom:`1px solid ${XP.gridBorder}`,display:"flex",gap:12,fontFamily:XP.font,fontSize:10,flexShrink:0}}>
        <span style={{fontWeight:700}}>Trial Balance</span>
        <span>Total Dr: <strong>{fmtFull(trDr)}</strong></span>
        <span>Total Cr: <strong>{fmtFull(trCr)}</strong></span>
        <span style={{fontWeight:700,color:bal?"#155724":"#721c24"}}>{bal?"✓ BALANCED":`⚠ Diff: ${fmtFull(Math.abs(trDr-trCr))}`}</span>
      </div>
      <Grid
        cols={[
          {key:"account",lbl:"GL Account"},
          {key:"dr",lbl:"Total Debit",w:120,render:(v:number)=><span style={{fontWeight:700,color:"#155724"}}>{fmtK(v)}</span>},
          {key:"cr",lbl:"Total Credit",w:120,render:(v:number)=><span style={{fontWeight:700,color:"#004085"}}>{fmtK(v)}</span>},
          {key:"balance",lbl:"Net Balance",w:120,render:(v:number)=><span style={{fontWeight:700,color:v>=0?"#155724":"#721c24"}}>{v<0?"-":""}{fmtK(Math.abs(v))}</span>},
          {key:"_type",lbl:"Type",w:55,render:(_:any,r:any)=>{const a=coa.find(c=>r.account?.includes(c.code));return <span style={{fontSize:9,color:"#555",textTransform:"uppercase" as const}}>{a?.type||"—"}</span>;}},
        ]}
        rows={rows} empty="No GL entries — post journal entries to see the trial balance"
      />
    </div>
  );
}

function AssetsContent({ data, refresh }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [f, setF] = useState({asset_name:"",asset_code:"",category:ASSET_CATS[0],purchase_cost:"",depreciation_rate:"10",acquisition_date:"",location:"",status:"active"});

  const openNew = ()=>{setEditRow(null);setF({asset_name:"",asset_code:"",category:ASSET_CATS[0],purchase_cost:"",depreciation_rate:"10",acquisition_date:"",location:"",status:"active"});setShowForm(true);};
  const openEdit = (r:any)=>{setEditRow(r);setF({asset_name:r.asset_name||"",asset_code:r.asset_code||"",category:r.category||ASSET_CATS[0],purchase_cost:r.purchase_cost?.toString()||"",depreciation_rate:r.depreciation_rate?.toString()||"10",acquisition_date:r.acquisition_date||"",location:r.location||"",status:r.status||"active"});setShowForm(true);};

  const cost=parseFloat(f.purchase_cost)||0,rate=parseFloat(f.depreciation_rate)||0;
  const acq=f.acquisition_date?new Date(f.acquisition_date):null;
  const years=acq?(Date.now()-acq.getTime())/(1000*60*60*24*365.25):0;
  const nbv=Math.max(0,cost-(cost*(rate/100)*years));

  const save = async () => {
    if(!f.asset_name){toast({title:"Asset name required",variant:"destructive"});return;}
    setSaving(true);
    const payload={asset_name:f.asset_name,asset_code:f.asset_code,category:f.category,purchase_cost:cost,current_value:parseFloat(nbv.toFixed(2)),depreciation_rate:rate,acquisition_date:f.acquisition_date||null,location:f.location,status:f.status};
    if(editRow){await db.from("fixed_assets").update(payload).eq("id",editRow.id);toast({title:"✓ Updated"});}
    else{await db.from("fixed_assets").insert(payload);toast({title:"✓ Registered"});}
    setSaving(false);setShowForm(false);setEditRow(null);refresh();
  };

  const totCost=data.reduce((s:number,a:any)=>s+(a.purchase_cost||0),0);
  const totNBV =data.reduce((s:number,a:any)=>s+(a.current_value||0),0);

  return (
    <div style={{display:"flex",flexDirection:"column" as const,flex:1,overflow:"hidden"}}>
      <div style={{padding:"4px 8px",background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,display:"flex",gap:4,flexWrap:"wrap" as const,flexShrink:0}}>
        <Btn onClick={openNew} primary>+ Register Asset</Btn>
        <div style={{flex:1}}/>
        <span style={{fontFamily:XP.font,fontSize:10,alignSelf:"center"}}>Cost: <strong>{fmtK(totCost)}</strong> · NBV: <strong style={{color:"#00008b"}}>{fmtK(totNBV)}</strong> · Dep: <strong style={{color:"#721c24"}}>{fmtK(totCost-totNBV)}</strong></span>
      </div>
      <Grid
        cols={[
          {key:"asset_name",lbl:"Asset Name"},{key:"asset_code",lbl:"Code",w:90},{key:"category",lbl:"Category",w:130},
          {key:"purchase_cost",lbl:"Cost",w:100,render:(v:number)=><span style={{fontWeight:700}}>{fmtK(v)}</span>},
          {key:"current_value",lbl:"NBV",w:100,render:(v:number)=><span style={{fontWeight:700,color:"#00008b"}}>{fmtK(v)}</span>},
          {key:"depreciation_rate",lbl:"Dep%",w:55,render:(v:number)=><span style={{fontSize:9}}>{v||0}%/yr</span>},
          {key:"location",lbl:"Location",w:100},{key:"status",lbl:"Status",w:65,render:(v:string)=><StatusPill s={v||"active"}/>},
          {key:"_act",lbl:"",w:50,render:(_:any,r:any)=><Btn onClick={()=>openEdit(r)} small>✏️</Btn>},
        ]}
        rows={data} empty="No fixed assets registered"
      />
      {showForm&&(
        <div style={{position:"absolute" as const,inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:XP.windowBg,border:"2px solid #0054e3",borderRadius:4,boxShadow:XP.shadow,width:"min(560px,95%)",maxHeight:"85%",display:"flex",flexDirection:"column" as const}}>
            <div style={{background:XP.titleBar,padding:"3px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10,fontFamily:XP.font}}>🏗 {editRow?"Edit":"Register"} Fixed Asset</span>
              <button onClick={()=>{setShowForm(false);setEditRow(null);}} style={{background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900,width:21,height:21}}>✕</button>
            </div>
            <div style={{overflow:"auto",padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{gridColumn:"span 2"}}><FieldRow label="Asset Name *"><input value={f.asset_name} onChange={e=>setF(p=>({...p,asset_name:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Asset Code"><input value={f.asset_code} onChange={e=>setF(p=>({...p,asset_code:e.target.value}))} placeholder="EL5-XXX-001" style={inp}/></FieldRow></div>
                <div><FieldRow label="Category"><select value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))} style={sel}>{ASSET_CATS.map(c=><option key={c}>{c}</option>)}</select></FieldRow></div>
                <div><FieldRow label="Cost (KES)"><input type="number" value={f.purchase_cost} onChange={e=>setF(p=>({...p,purchase_cost:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Dep Rate (%/yr)"><input type="number" value={f.depreciation_rate} onChange={e=>setF(p=>({...p,depreciation_rate:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Acquisition Date"><input type="date" value={f.acquisition_date} onChange={e=>setF(p=>({...p,acquisition_date:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Location"><input value={f.location} onChange={e=>setF(p=>({...p,location:e.target.value}))} style={inp}/></FieldRow></div>
                <div><FieldRow label="Status"><select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))} style={sel}><option value="active">Active</option><option value="inactive">Inactive</option><option value="disposed">Disposed</option></select></FieldRow></div>
              </div>
              {cost>0&&f.acquisition_date&&(
                <div style={{marginTop:8,padding:"5px 10px",background:"#e9f4ff",border:"1px solid #b8daff",borderRadius:3,fontSize:10,fontFamily:XP.font}}>
                  📊 NBV: <strong>{fmtFull(nbv)}</strong> · Accum dep: {fmtFull(cost-nbv)} · Yrs held: {years.toFixed(1)}
                </div>
              )}
              <div style={{marginTop:8,display:"flex",gap:6}}>
                <Btn onClick={save} disabled={saving} primary>{saving?"⏳ Saving…":"💾 Save Asset"}</Btn>
                <Btn onClick={()=>{setShowForm(false);setEditRow(null);}}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankContent({ payments, receipts, glEntries }: any) {
  const bankE=glEntries.filter((g:any)=>g.gl_account?.match(/1001|1010|1011/));
  const bankDr=bankE.reduce((s:number,g:any)=>s+(g.debit||0),0);
  const bankCr=bankE.reduce((s:number,g:any)=>s+(g.credit||0),0);
  const paidOut=payments.filter((v:any)=>v.status==="paid").reduce((s:number,v:any)=>s+(v.total_amount||0),0);
  const rcpIn=receipts.filter((v:any)=>v.status==="received").reduce((s:number,v:any)=>s+(v.amount||0),0);
  const net=bankDr+rcpIn-bankCr-paidOut;
  const kpis=[{icon:"⬇️",lbl:"Total In",val:fmtK(bankDr+rcpIn),col:"#155724"},{icon:"⬆️",lbl:"Total Out",val:fmtK(bankCr+paidOut),col:"#721c24"},{icon:"⚖️",lbl:"Net Balance",val:fmtK(net),col:net>=0?"#155724":"#721c24"},{icon:"📄",lbl:"Unreconciled",val:`${glEntries.filter((g:any)=>!g.status?.includes("reconciled")).length}`,col:"#856404"}];
  return (
    <div style={{padding:10,overflowY:"auto" as const,flex:1}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:10}}>
        {kpis.map(k=>(
          <div key={k.lbl} style={{flex:"1 1 140px",background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:4,padding:"8px 12px"}}>
            <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}><span style={{fontSize:16}}>{k.icon}</span><span style={{fontSize:9,color:"#666",fontWeight:700,textTransform:"uppercase" as const,fontFamily:XP.font}}>{k.lbl}</span></div>
            <div style={{fontSize:15,fontWeight:900,fontFamily:XP.font,color:k.col}}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:3,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:XP.fs,fontFamily:XP.font,marginBottom:6}}>🏦 Bank Account Transactions (GL)</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:XP.font,fontSize:10}}>
          <thead><tr style={{background:XP.gridHdr}}>{["Date","Reference","Description","GL Account","Dr (In)","Cr (Out)"].map(h=><th key={h} style={{padding:"3px 6px",borderBottom:`2px solid ${XP.gridBorder}`,textAlign:"left"}}>{h}</th>)}</tr></thead>
          <tbody>{bankE.slice(0,12).map((g:any,i:number)=>(
            <tr key={g.id} style={{background:i%2===0?"#fff":"#f5f4ea"}}>
              <td style={{padding:"2px 6px",borderRight:`1px solid ${XP.gridBorder}`}}>{fmtDate(g.created_at)}</td>
              <td style={{padding:"2px 6px",fontFamily:"monospace",fontWeight:700,color:"#00008b",borderRight:`1px solid ${XP.gridBorder}`}}>{g.reference||"—"}</td>
              <td style={{padding:"2px 6px",borderRight:`1px solid ${XP.gridBorder}`}}>{g.description||"—"}</td>
              <td style={{padding:"2px 6px",fontSize:9,color:"#555",borderRight:`1px solid ${XP.gridBorder}`}}>{g.gl_account||"—"}</td>
              <td style={{padding:"2px 6px",fontWeight:700,color:"#155724",borderRight:`1px solid ${XP.gridBorder}`}}>{g.debit?fmtK(g.debit):"—"}</td>
              <td style={{padding:"2px 6px",fontWeight:700,color:"#721c24"}}>{g.credit?fmtK(g.credit):"—"}</td>
            </tr>
          ))}{bankE.length===0&&<tr><td colSpan={6} style={{padding:16,textAlign:"center",color:"#888"}}>No bank GL entries — post journal entries for accounts 1001/1010/1011</td></tr>}</tbody>
        </table>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[{title:"💳 Payment Vouchers",rows:[["Total",payments.length],["Paid",payments.filter((v:any)=>v.status==="paid").length],["Pending",payments.filter((v:any)=>v.status==="pending").length],["Draft",payments.filter((v:any)=>v.status==="draft").length]]},{title:"🧾 Receipt Vouchers",rows:[["Total",receipts.length],["Received",receipts.filter((v:any)=>v.status==="received").length],["Pending",receipts.filter((v:any)=>v.status==="pending").length],["Value",fmtK(rcpIn)]]}].map(sec=>(
          <div key={sec.title} style={{background:"#f8f7ee",border:`1px solid ${XP.btnBorder}`,borderRadius:3,padding:10,fontFamily:XP.font,fontSize:10}}>
            <div style={{fontWeight:700,marginBottom:6}}>{sec.title}</div>
            {sec.rows.map(([k,v])=>(
              <div key={k as string} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${XP.gridBorder}`}}>
                <span style={{color:"#555"}}>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsContent({ payments, receipts, glEntries, budgets }: any) {
  const incomeAccts=glEntries.filter((g:any)=>g.gl_account?.match(/^3[0-9]{3}/)).reduce((acc:any,g:any)=>{const k=g.gl_account;acc[k]=(acc[k]||0)+(g.credit||0)-(g.debit||0);return acc;},{});
  const expenseAccts=glEntries.filter((g:any)=>g.gl_account?.match(/^4[0-9]{3}/)).reduce((acc:any,g:any)=>{const k=g.gl_account;acc[k]=(acc[k]||0)+(g.debit||0)-(g.credit||0);return acc;},{});
  const totalInc=Object.values(incomeAccts).reduce((s:any,v:any)=>s+v,0) as number;
  const totalExp=Object.values(expenseAccts).reduce((s:any,v:any)=>s+v,0) as number;
  const netInc=totalInc-totalExp;
  const statusMatrix=["draft","pending","approved","paid","rejected"].map(st=>({status:st,count:payments.filter((v:any)=>v.status===st).length,amount:payments.filter((v:any)=>v.status===st).reduce((s:number,v:any)=>s+(v.total_amount||0),0)}));
  const printIS=()=>{const w=window.open("","_blank","width=800,height=600");if(!w)return;const rows=[...Object.entries(incomeAccts).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right">${fmtFull(v as number)}</td></tr>`),`<tr style="font-weight:700;background:#d4edda"><td>TOTAL INCOME</td><td style="text-align:right">${fmtFull(totalInc)}</td></tr>`,`<tr><td>&nbsp;</td><td></td></tr>`,...Object.entries(expenseAccts).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right">${fmtFull(v as number)}</td></tr>`),`<tr style="font-weight:700;background:#f8d7da"><td>TOTAL EXPENSES</td><td style="text-align:right">${fmtFull(totalExp)}</td></tr>`,`<tr style="font-weight:900;font-size:13px;background:${netInc>=0?"#d4edda":"#f8d7da"}"><td>NET ${netInc>=0?"SURPLUS":"DEFICIT"}</td><td style="text-align:right">${fmtFull(Math.abs(netInc))}</td></tr>`].join("");w.document.write(`<!DOCTYPE html><html><head><title>Income Statement</title><style>body{font:11px Tahoma;padding:20px}table{width:100%;border-collapse:collapse}td{padding:4px 8px;border:1px solid #ccc}</style></head><body><h2>Income Statement — Embu Level 5 Hospital</h2><p>${new Date().toLocaleDateString("en-KE")}</p><table>${rows}</table></body></html>`);w.document.close();setTimeout(()=>w.print(),500);toast({title:"✓ Printing income statement"});};
  const printBudget=()=>{const w=window.open("","_blank","width=900,height=600");if(!w)return;const rows=budgets.map((b:any)=>`<tr><td>${b.budget_name||""}</td><td>${b.fiscal_year||""}</td><td>${b.department||""}</td><td style="text-align:right">${fmtFull(b.total_budget)}</td><td style="text-align:right">${fmtFull(b.spent)}</td><td style="text-align:right">${fmtFull(b.remaining)}</td><td style="text-align:right">${b.total_budget?((b.spent||0)/b.total_budget*100).toFixed(1):0}%</td></tr>`).join("");w.document.write(`<!DOCTYPE html><html><head><title>Budget Performance</title><style>body{font:11px Tahoma;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:4px 8px;border:1px solid #ccc}th{background:#dbd9c9}</style></head><body><h2>Budget Performance — Embu Level 5 Hospital</h2><table><tr>${["Budget","FY","Dept","Allocated","Spent","Remaining","Util%"].map(h=>`<th>${h}</th>`).join("")}</tr>${rows}</table></body></html>`);w.document.close();setTimeout(()=>w.print(),500);toast({title:"✓ Printing budget report"});};

  return (
    <div style={{padding:10,overflowY:"auto" as const,flex:1}}>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        <Btn primary onClick={printIS}>🖨 Print Income Statement</Btn>
        <Btn warning onClick={printBudget}>🖨 Print Budget Report</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {/* Income Statement */}
        <div style={{background:"#f8f7ee",border:`1px solid ${XP.btnBorder}`,borderRadius:3,padding:10,fontFamily:XP.font,fontSize:10}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:8,borderBottom:`1px solid ${XP.btnBorder}`,paddingBottom:4}}>📈 Income Statement</div>
          <div style={{fontWeight:700,color:"#155724",marginBottom:4}}>INCOME</div>
          {Object.entries(incomeAccts).length===0?<div style={{color:"#888"}}>No income posted</div>:Object.entries(incomeAccts).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:`1px dotted ${XP.gridBorder}`}}><span style={{color:"#555"}}>{k}</span><strong>{fmtFull(v as number)}</strong></div>)}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4,borderTop:`2px solid ${XP.btnBorder}`,paddingTop:4,fontWeight:900}}><span>Total Income</span><span style={{color:"#155724"}}>{fmtFull(totalInc)}</span></div>
          <div style={{fontWeight:700,color:"#721c24",margin:"8px 0 4px"}}>EXPENSES</div>
          {Object.entries(expenseAccts).length===0?<div style={{color:"#888"}}>No expenses posted</div>:Object.entries(expenseAccts).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:`1px dotted ${XP.gridBorder}`}}><span style={{color:"#555"}}>{k}</span><strong>{fmtFull(v as number)}</strong></div>)}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4,borderTop:`2px solid ${XP.btnBorder}`,paddingTop:4,fontWeight:900}}><span>Total Expenses</span><span style={{color:"#721c24"}}>{fmtFull(totalExp)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,padding:"5px 8px",background:netInc>=0?"#d4edda":"#f8d7da",border:`1px solid ${netInc>=0?"#c3e6cb":"#f5c6cb"}`,borderRadius:3,fontWeight:900,fontSize:12}}>
            <span>NET {netInc>=0?"SURPLUS":"DEFICIT"}</span><span style={{color:netInc>=0?"#155724":"#721c24"}}>{fmtFull(Math.abs(netInc))}</span>
          </div>
        </div>
        {/* Voucher Status Matrix */}
        <div style={{background:"#f8f7ee",border:`1px solid ${XP.btnBorder}`,borderRadius:3,padding:10,fontFamily:XP.font,fontSize:10}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:8,borderBottom:`1px solid ${XP.btnBorder}`,paddingBottom:4}}>📋 Voucher Status Matrix</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:XP.gridHdr}}>{["Status","Count","Total Amount","Share"].map(h=><th key={h} style={{padding:"3px 6px",borderBottom:`2px solid ${XP.gridBorder}`,textAlign:"left"}}>{h}</th>)}</tr></thead>
            <tbody>{statusMatrix.map((row,i)=>{const pct=payments.length>0?(row.count/payments.length*100):0;return(
              <tr key={row.status} style={{background:i%2===0?"#fff":"#f5f4ea"}}>
                <td style={{padding:"3px 6px",borderRight:`1px solid ${XP.gridBorder}`}}><StatusPill s={row.status}/></td>
                <td style={{padding:"3px 6px",fontWeight:700,borderRight:`1px solid ${XP.gridBorder}`}}>{row.count}</td>
                <td style={{padding:"3px 6px",fontWeight:700,borderRight:`1px solid ${XP.gridBorder}`}}>{fmtK(row.amount)}</td>
                <td style={{padding:"3px 6px"}}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:50,height:7,background:"#ccc",borderRadius:2}}><div style={{width:`${pct}%`,height:"100%",background:"#316ac5"}}/></div><span style={{fontSize:9}}>{pct.toFixed(0)}%</span></div></td>
              </tr>
            );})}</tbody>
          </table>
          <div style={{marginTop:10,fontWeight:700,borderTop:`1px solid ${XP.btnBorder}`,paddingTop:8,marginBottom:6}}>📊 Budget Performance</div>
          {budgets.slice(0,4).map((b:any)=>{const pct=b.total_budget?Math.min(((b.spent||0)/b.total_budget)*100,100):0;const col=pct>=90?"#dc3545":pct>=70?"#fd7e14":"#28a745";return(<div key={b.id} style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:2}}><span style={{fontWeight:700}}>{b.budget_name||"Budget"}</span><span style={{color:col}}>{pct.toFixed(0)}%</span></div><div style={{height:7,background:"#ccc",borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:col}}/></div></div>);})}
        </div>
      </div>
    </div>
  );
}

function ProfileContent({ user, profile }: any) {
  return (
    <div style={{padding:16,fontFamily:XP.font}}>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16,padding:12,background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:3}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#2461bf,#4490d9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>👤</div>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>{profile?.full_name||"Finance User"}</div>
          <div style={{fontSize:10,color:"#555",marginTop:2}}>{user?.email}</div>
          <div style={{fontSize:9,color:"#316ac5",marginTop:4,textTransform:"uppercase" as const,letterSpacing:".06em",fontWeight:700}}>{profile?.role?.replace(/_/g," ")||"Finance"}</div>
        </div>
      </div>
      {[["Email",user?.email],["Full Name",profile?.full_name||"—"],["Role",profile?.role?.replace(/_/g," ")||"—"],["Department",profile?.department||"Finance"],["Status",profile?.is_active?"Active":"Inactive"],["Last Sign In",user?.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleString("en-KE"):"—"],].map(([k,v])=>(
        <div key={k as string} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${XP.gridBorder}`,fontSize:11}}>
          <span style={{color:"#555",width:100,flexShrink:0,fontWeight:700,fontSize:10}}>{k}</span>
          <span style={{flex:1,color:"#1a1a1a"}}>{v as string}</span>
        </div>
      ))}
    </div>
  );
}

// ══ MAIN COMPONENT ═══════════════════════════════════════════════
export default function FinanceDashboardPage() {
  const { user, profile, roles, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isManager = roles.some(r=>["finance_manager","admin","procurement_manager"].includes(r));
  const { accounts: liveAccounts } = useChartOfAccounts();
  const COA_TYPE_MAP: Record<string,string> = { asset:"ass", liability:"lib", equity:"eq", revenue:"inc", expense:"exp" };
  const coa = liveAccounts.map((a:any)=>({ code:a.account_code, name:a.account_name, type:COA_TYPE_MAP[a.account_type]||a.account_type||"" }));

  // Data
  const [payments,  setPayments]  = useState<any[]>([]);
  const [receipts,  setReceipts]  = useState<any[]>([]);
  const [glEntries, setGlEntries] = useState<any[]>([]);
  const [budgets,   setBudgets]   = useState<any[]>([]);
  const [assets,    setAssets]    = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales,     setSales]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Each ledger gets its own circuit breaker so a stuck fixed_assets query
    // (say) can't stall payments/receipts/GL too, and "critical" priority
    // keeps this dashboard load ahead of any background prefetching.
    const [pR,rcR,glR,bR,aR,puR,svR] = await Promise.all([
      netEngine.request("finance:payment_vouchers",
        () => db.from("payment_vouchers").select("*").order("created_at",{ascending:false}).limit(400),
        { priority: "critical", label: "payment vouchers" }),
      netEngine.request("finance:receipt_vouchers",
        () => db.from("receipt_vouchers").select("*").order("created_at",{ascending:false}).limit(400),
        { priority: "critical", label: "receipt vouchers" }),
      netEngine.request("finance:gl_entries",
        () => db.from("gl_entries").select("*").order("created_at",{ascending:false}).limit(400),
        { priority: "critical", label: "GL entries" }),
      netEngine.request("finance:budgets",
        () => db.from("budgets").select("*").order("created_at",{ascending:false}).limit(100),
        { priority: "critical", label: "budgets" }),
      netEngine.request("finance:fixed_assets",
        () => db.from("fixed_assets").select("*").order("created_at",{ascending:false}).limit(200),
        { priority: "critical", label: "fixed assets" }),
      netEngine.request("finance:purchase_vouchers",
        () => db.from("purchase_vouchers").select("*").order("created_at",{ascending:false}).limit(400),
        { priority: "critical", label: "purchase vouchers" }),
      netEngine.request("finance:sales_vouchers",
        () => db.from("sales_vouchers").select("*").order("created_at",{ascending:false}).limit(400),
        { priority: "critical", label: "sales vouchers" }),
    ]);
    setPayments(pR.data??[]); setReceipts(rcR.data??[]); setGlEntries(glR.data??[]); setBudgets(bR.data??[]); setAssets(aR.data??[]);
    setPurchases(puR.data??[]); setSales(svR.data??[]); setLoading(false);
  }, []);

  useEffect(()=>{fetchAll();},[fetchAll]);

  useEffect(()=>{
    const ch=db.channel("fin_desk_v2").on("postgres_changes",{event:"*",schema:"public",table:"payment_vouchers"},fetchAll).on("postgres_changes",{event:"*",schema:"public",table:"receipt_vouchers"},fetchAll).on("postgres_changes",{event:"*",schema:"public",table:"gl_entries"},fetchAll).on("postgres_changes",{event:"*",schema:"public",table:"purchase_vouchers"},fetchAll).on("postgres_changes",{event:"*",schema:"public",table:"sales_vouchers"},fetchAll).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[fetchAll]);

  // Window manager
  const zTop = useRef(100);
  const [wins, setWins] = useState<WinState[]>([]);
  const [activeWin, setActiveWin] = useState<WinId|null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(new Date());

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    if(!startOpen)return;
    const h=(e:MouseEvent)=>{if(startRef.current&&!startRef.current.contains(e.target as Node))setStartOpen(false);};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[startOpen]);

  // Open first window on load
  useEffect(()=>{openWin("overview");},[]);

  function openWin(id:WinId){
    setWins(prev=>{
      const existing=prev.find(w=>w.id===id);
      if(existing){
        const z=++zTop.current;
        setActiveWin(id);
        return prev.map(w=>w.id===id?{...w,min:false,z}:w);
      }
      const def=WIN_DEFS.find(d=>d.id===id)!;
      const off=(prev.length%5)*22;
      const z=++zTop.current;
      setActiveWin(id);
      return [...prev,{id,min:false,max:false,z,x:60+off,y:40+off,w:def.w,h:def.h}];
    });
    setStartOpen(false);
  }
  function closeWin(id:WinId){setWins(p=>p.filter(w=>w.id!==id));if(activeWin===id)setActiveWin(null);}
  function minWin(id:WinId){setWins(p=>p.map(w=>w.id===id?{...w,min:true}:w));if(activeWin===id)setActiveWin(null);}
  function maxWin(id:WinId){setWins(p=>p.map(w=>w.id===id?{...w,max:!w.max}:w));}
  function focusWin(id:WinId){const z=++zTop.current;setActiveWin(id);setWins(p=>p.map(w=>w.id===id?{...w,z,min:false}:w));}

  function renderContent(id:WinId){
    const props={payments,receipts,glEntries,budgets,assets,purchases,sales,refresh:fetchAll,isManager,user,profile,coa};
    switch(id){
      case "overview":  return <OverviewContent {...props}/>;
      case "payments":  return <PaymentsContent {...props}/>;
      case "receipts":  return <ReceiptsContent {...props}/>;
      case "journals":  return <JournalsContent data={glEntries} refresh={fetchAll} coa={coa}/>;
      case "purchases": return <PurchaseVouchersContent data={purchases} refresh={fetchAll} isManager={isManager} user={user} profile={profile} coa={coa}/>;
      case "sales":     return <SalesVouchersContent data={sales} refresh={fetchAll} user={user} profile={profile} coa={coa}/>;
      case "budgets":   return <BudgetsContent data={budgets}/>;
      case "gl":        return <GLContent data={glEntries} coa={coa}/>;
      case "assets":    return <AssetsContent data={assets} refresh={fetchAll}/>;
      case "bank":      return <BankContent {...props}/>;
      case "reports":   return <ReportsContent payments={payments} receipts={receipts} glEntries={glEntries} budgets={budgets}/>;
      case "profile":   return <ProfileContent user={user} profile={profile}/>;
    }
  }

  const visibleWins = wins.filter(w=>!w.min);
  const taskbarWins = wins;

  return (
    <div style={{width:"100vw",height:"calc(100vh - 0px)",background:XP.desktop,
      position:"fixed" as const,inset:0,overflow:"hidden",fontFamily:XP.font}}>

      {/* Dark overlay for photo readability */}
      {_FDESKBG && (
        <div style={{position:"absolute" as const,inset:0,
          background:"linear-gradient(160deg,rgba(5,18,60,.55) 0%,rgba(8,28,80,.38) 50%,rgba(4,14,48,.62) 100%)",
          zIndex:0,pointerEvents:"none"}} />
      )}

      {/* Desktop icons */}
      <div style={{position:"absolute" as const,top:16,left:12,display:"flex",flexDirection:"column" as const,gap:6,zIndex:10}}>
        {DESKTOP_ICONS.map(ic=>(
          <button key={ic.id} onDoubleClick={()=>openWin(ic.id)}
            style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column" as const,
              alignItems:"center",gap:4,padding:"6px 8px",borderRadius:4,width:78,
              color:"#fff",fontFamily:XP.font,fontSize:10,textShadow:"1px 1px 3px rgba(0,0,0,.8)",transition:"background .15s"}}
            onMouseEnter={e=>(e.currentTarget as any).style.background="rgba(255,255,255,.15)"}
            onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>
            <span style={{fontSize:28,lineHeight:1,filter:"drop-shadow(1px 1px 3px rgba(0,0,0,.5))"}}>{ic.icon}</span>
            <span style={{textAlign:"center",lineHeight:1.2,wordBreak:"break-word" as const,width:"100%"}}>{ic.label}</span>
          </button>
        ))}
      </div>

      {/* Windows */}
      {visibleWins.map(ws=>{
        const def=WIN_DEFS.find(d=>d.id===ws.id)!;
        return (
          <XPWindow key={ws.id} ws={ws} active={activeWin===ws.id}
            title={def.title} icon={def.icon}
            onFocus={()=>focusWin(ws.id)}
            onClose={()=>closeWin(ws.id)}
            onMin={()=>minWin(ws.id)}
            onMax={()=>maxWin(ws.id)}>
            {renderContent(ws.id)}
          </XPWindow>
        );
      })}

      {/* Taskbar */}
      <div ref={startRef} style={{position:"fixed" as const,bottom:0,left:0,right:0,height:36,
        background:XP.taskbar,display:"flex",alignItems:"center",padding:"0 4px",
        gap:3,zIndex:9999,boxShadow:"0 -1px 4px rgba(0,0,0,.4)"}}>

        {/* Start button */}
        <button onClick={()=>setStartOpen(o=>!o)}
          style={{background:startOpen?"linear-gradient(180deg,#3ea03d,#237022)":"linear-gradient(180deg,#5cb85c,#3d9b3d)",
            border:"1px solid #1a7a1a",borderRadius:3,color:"#fff",
            padding:"3px 12px 3px 8px",fontSize:13,fontWeight:900,fontFamily:XP.font,
            cursor:"pointer",display:"flex",alignItems:"center",gap:5,height:28,flexShrink:0}}>
          <span>⊞</span>start
        </button>

        {/* Start menu */}
        {startOpen&&(
          <div style={{position:"absolute" as const,bottom:36,left:0,width:220,
            background:"linear-gradient(180deg,#1a55c0,#1a3580)",
            borderRadius:"4px 4px 0 0",boxShadow:"3px 0 12px rgba(0,0,0,.6)",zIndex:10000,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,#1a55c0,#3d7bdb)",padding:"10px 10px 8px",
              borderBottom:"1px solid rgba(255,255,255,.2)",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.15)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💰</div>
              <div>
                <div style={{color:"#fff",fontWeight:700,fontSize:12,fontFamily:XP.font}}>{profile?.full_name||"Finance"}</div>
                <div style={{color:"#aad0ff",fontSize:9}}>{primaryRole?.replace(/_/g," ")}</div>
              </div>
            </div>
            {DESKTOP_ICONS.map(ic=>(
              <button key={ic.id} onClick={()=>openWin(ic.id)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
                  color:"#fff",fontSize:11,fontFamily:XP.font,background:"transparent",border:"none",
                  cursor:"pointer",width:"100%",textAlign:"left" as const}}
                onMouseEnter={e=>(e.currentTarget as any).style.background="#316ac5"}
                onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>
                <span style={{fontSize:16}}>{ic.icon}</span>{ic.label}
              </button>
            ))}
            <div style={{borderTop:"1px solid rgba(255,255,255,.2)",padding:"4px 0"}}>
              <button onClick={()=>navigate("/profile")} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",color:"#fff",fontSize:11,fontFamily:XP.font,background:"transparent",border:"none",cursor:"pointer",width:"100%",textAlign:"left" as const}} onMouseEnter={e=>(e.currentTarget as any).style.background="#316ac5"} onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>⚙️ Settings</button>
              <button onClick={signOut} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",color:"#fff",fontSize:11,fontFamily:XP.font,background:"transparent",border:"none",cursor:"pointer",width:"100%",textAlign:"left" as const}} onMouseEnter={e=>(e.currentTarget as any).style.background="#c02020"} onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>🔴 Sign Out</button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{width:1,height:24,background:"rgba(255,255,255,.2)",margin:"0 2px",flexShrink:0}}/>

        {/* Open window buttons */}
        {taskbarWins.map(ws=>{
          const def=WIN_DEFS.find(d=>d.id===ws.id)!;
          const isActive=activeWin===ws.id&&!ws.min;
          return (
            <button key={ws.id}
              onClick={()=>ws.min?openWin(ws.id):activeWin===ws.id?minWin(ws.id):focusWin(ws.id)}
              style={{background:isActive?"rgba(0,0,0,.35)":"rgba(0,0,0,.2)",
                border:`1px solid ${isActive?"rgba(255,255,255,.45)":"rgba(255,255,255,.2)"}`,
                borderRadius:2,color:"#fff",padding:"2px 10px",fontSize:10,fontFamily:XP.font,
                cursor:"pointer",height:24,display:"flex",alignItems:"center",gap:5,
                maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,
                boxShadow:isActive?"inset 1px 1px 3px rgba(0,0,0,.3)":"none"}}>
              <span style={{fontSize:12}}>{def.icon}</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{def.title}</span>
            </button>
          );
        })}

        <div style={{flex:1}}/>

        {/* Loading indicator */}
        {loading&&<span style={{color:"rgba(255,255,255,.7)",fontSize:9,marginRight:4}}>⏳</span>}

        {/* Refresh */}
        <button onClick={fetchAll} title="Refresh all data"
          style={{background:"rgba(0,0,0,.2)",border:"1px solid rgba(255,255,255,.2)",borderRadius:2,
            color:"#fff",padding:"2px 8px",fontSize:9,cursor:"pointer",height:24,fontFamily:XP.font}}>
          ↻
        </button>

        {/* Clock */}
        <div style={{background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",borderRadius:2,
          padding:"2px 8px",color:"#fff",fontSize:10,fontFamily:XP.font,height:24,
          display:"flex",alignItems:"center",flexShrink:0}}>
          {time.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
    </div>
  );
}
