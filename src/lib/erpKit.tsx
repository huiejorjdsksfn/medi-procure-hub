/**
 * EL5 MediProcure — Shared 2026 ERP UI kit
 * Reusable visual primitives (page header, KPI band, cards, pills, table
 * chrome) built on top of the central theme (T). Introduced so the
 * procurement/document page redesign pass has one consistent visual
 * language instead of nine separately-invented ones.
 */
import { T } from "@/lib/theme";
import type { ReactNode, CSSProperties } from "react";
import { RefreshCw, Search as SearchIcon, X as XIcon } from "lucide-react";

export const font = "'Inter','Segoe UI',system-ui,-apple-system,sans-serif";

/* ── Page header ─────────────────────────────────────────────────── */
export function PageHeader({
  icon: Icon, title, subtitle, children,
}: { icon:any; title:string; subtitle?:ReactNode; children?:ReactNode }) {
  return (
    <div style={{ background:T.card, borderBottom:`1px solid ${T.border}`, padding:"16px 28px",
      display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", boxShadow:"0 1px 2px rgba(16,24,40,.04)" }}>
      <div style={{ width:44, height:44, borderRadius:T.rLg, background:T.primaryBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={21} color={T.primary}/>
      </div>
      <div style={{ minWidth:0 }}>
        <h1 style={{ margin:0, fontSize:19, fontWeight:700, color:T.fg, letterSpacing:"-.01em" }}>{title}</h1>
        {subtitle&&<div style={{ fontSize:12.5, color:T.fgMuted, marginTop:1 }}>{subtitle}</div>}
      </div>
      <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>{children}</div>
    </div>
  );
}

/* ── Search box ──────────────────────────────────────────────────── */
export function SearchBox({ value, onChange, placeholder="Search…", width=240 }:
  { value:string; onChange:(v:string)=>void; placeholder?:string; width?:number }) {
  return (
    <div style={{ position:"relative" }}>
      <SearchIcon size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.fgDim, pointerEvents:"none" }}/>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width, padding:"8px 12px 8px 32px", border:`1px solid ${T.border}`, borderRadius:T.r, fontSize:13, background:T.bg, color:T.fg, outline:"none", boxSizing:"border-box", fontFamily:font }}/>
      {value&&<button onClick={()=>onChange("")} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.fgDim,fontSize:16,lineHeight:1 }}>×</button>}
    </div>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────── */
export function BtnPrimary({ onClick, icon:Icon, children, disabled }: { onClick?:()=>void; icon?:any; children:ReactNode; disabled?:boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 15px", background:disabled?T.bg2:T.primary, border:"none",
        borderRadius:T.r, cursor:disabled?"default":"pointer", color:disabled?T.fgDim:"#fff", fontSize:12.5, fontWeight:600, fontFamily:font }}>
      {Icon&&<Icon size={13}/>}{children}
    </button>
  );
}
export function BtnGhost({ onClick, icon:Icon, children, loading }: { onClick?:()=>void; icon?:any; children:ReactNode; loading?:boolean }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:T.card, border:`1px solid ${T.border}`,
        borderRadius:T.r, cursor:"pointer", color:T.fgMuted, fontSize:12.5, fontWeight:600, fontFamily:font }}>
      {Icon&&<Icon size={13} style={loading?{ animation:"spin 1s linear infinite" }:{}}/>}{children}
    </button>
  );
}

/* ── KPI band ────────────────────────────────────────────────────── */
export type KpiDef = { label:string; val:string|number; color:string; icon:any; hot?:boolean };
export function KpiBand({ items, loading }: { items:KpiDef[]; loading?:boolean }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(170px,1fr))", gap:12, marginBottom:20 }}>
      {items.map(b=>(
        <div key={b.label} style={{ background:T.card, border:`1px solid ${b.hot?"#dc262655":T.border}`, borderRadius:T.rLg, padding:"14px 16px", boxShadow:T.shadow, position:"relative", display:"flex", alignItems:"center", gap:12 }}>
          {b.hot&&<span style={{ position:"absolute",top:-8,right:12,background:"#dc2626",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:99,letterSpacing:".02em" }}>ATTENTION</span>}
          <div style={{ width:38, height:38, borderRadius:T.rMd, background:`${b.color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <b.icon size={18} color={b.color}/>
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.fg, lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{loading?"—":b.val}</div>
            <div style={{ fontSize:11, color:T.fgMuted, fontWeight:600, marginTop:1 }}>{b.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Card / section wrapper ──────────────────────────────────────── */
export function Card({ children, style }: { children:ReactNode; style?:CSSProperties }) {
  return <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl, boxShadow:T.shadow, ...style }}>{children}</div>;
}

/* ── Pills / badges ──────────────────────────────────────────────── */
export function StatusPill({ status, styleMap }: { status:string; styleMap?:Record<string,{bg:string;color:string}> }) {
  const defaultMap: Record<string,{bg:string;color:string}> = {
    approved:{bg:T.successBg,color:T.success}, active:{bg:T.successBg,color:T.success}, completed:{bg:T.successBg,color:T.success}, paid:{bg:T.successBg,color:T.success}, received:{bg:T.successBg,color:T.success}, published:{bg:T.successBg,color:T.success}, issued:{bg:T.successBg,color:T.success},
    pending:{bg:T.warningBg,color:T.warning}, submitted:{bg:T.warningBg,color:T.warning}, draft:{bg:T.bg2,color:T.fgMuted}, open:{bg:T.warningBg,color:T.warning},
    rejected:{bg:T.errorBg,color:T.error}, cancelled:{bg:T.errorBg,color:T.error}, expired:{bg:T.errorBg,color:T.error}, closed:{bg:T.bg2,color:T.fgDim},
  };
  const m = styleMap || defaultMap;
  const s = m[status?.toLowerCase()] || { bg:T.bg2, color:T.fgMuted };
  return (
    <span style={{ fontSize:9.5, fontWeight:800, padding:"2px 8px", borderRadius:99, background:s.bg, color:s.color, textTransform:"uppercase", letterSpacing:".02em", whiteSpace:"nowrap" }}>
      {status||"—"}
    </span>
  );
}

/* ── Pill tabs ───────────────────────────────────────────────────── */
export function PillTabs<T extends string>({ tabs, active, onChange }:
  { tabs:{ id:T; label:string; icon?:any; count?:number }[]; active:T; onChange:(id:T)=>void }) {
  return (
    <div style={{ display:"flex", gap:4, background:T.bg2, padding:4, borderRadius:T.rLg, flexWrap:"wrap" }}>
      {tabs.map(tab=>(
        <button key={tab.id} onClick={()=>onChange(tab.id)}
          style={{ padding:"7px 14px", background:active===tab.id?T.card:"transparent", border:"none", borderRadius:T.rMd, cursor:"pointer",
            fontSize:12.5, fontWeight:active===tab.id?700:600, color:active===tab.id?T.fg:T.fgMuted, display:"flex",alignItems:"center",gap:7,
            transition:"all .12s", boxShadow:active===tab.id?T.shadow:"none", fontFamily:font }}>
          {tab.icon&&<tab.icon size={13}/>}{tab.label}
          {typeof tab.count==="number"&&tab.count>0&&
            <span style={{ fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:99,background:active===tab.id?T.primary:T.bg2,color:active===tab.id?"#fff":T.fgMuted }}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────── */
export function EmptyState({ icon:Icon, title, sub }: { icon:any; title:string; sub?:string }) {
  return (
    <div style={{ textAlign:"center", padding:"56px 0", color:T.fgDim, background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rXl }}>
      <Icon size={36} style={{ opacity:.3 }}/>
      <div style={{ marginTop:12, fontSize:14, fontWeight:700, color:T.fgMuted }}>{title}</div>
      {sub&&<div style={{ fontSize:12, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export function LoadingState({ label="Loading…" }: { label?:string }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:T.fgDim }}>
      <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }}/>
      <div style={{ marginTop:10, fontSize:13 }}>{label}</div>
    </div>
  );
}

/* ── Table chrome ────────────────────────────────────────────────── */
export const thStyle: CSSProperties = { padding:"10px 14px", textAlign:"left", fontWeight:700, color:"var(--th-color)", fontSize:10.5, textTransform:"uppercase", letterSpacing:".03em", whiteSpace:"nowrap" };
export function TableWrap({ children }: { children:ReactNode }) {
  return <div style={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:T.rLg, boxShadow:T.shadow, background:T.card }}>{children}</div>;
}

export const spinKeyframes = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
