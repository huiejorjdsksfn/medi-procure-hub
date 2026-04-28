/**
 * ProcurBosse - GUI Editor v3.0 FULLY ACTIVATED
 * Changes apply LIVE to the entire running app via CSS custom properties.
 * Saves permanently to Supabase system_settings.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { PrintEngine } from "@/engines/print/PrintEngine";
import { useSystemSettings, saveSettings, applyThemeToDOM } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import {
  Save, RotateCcw, Palette, Type, Layout, Settings2,
  Move, Check, RefreshCw, Monitor, Smartphone, Tablet,
  ChevronUp, ChevronDown, X, Zap, Eye, Wifi, Globe, Shield, Server
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useRealIP } from "@/hooks/useRealIP";

const PRESETS = [
  { name:"Navy Blue",    primary:"#0a2558", accent:"#C45911", navBg:"#ffffff", navText:"#1e293b", pageBg:"#f8fafc" },
  { name:"Forest Green", primary:"#065f46", accent:"#d97706", navBg:"#ffffff", navText:"#1e293b", pageBg:"#f0fdf4" },
  { name:"Royal Purple", primary:"#4c1d95", accent:"#be185d", navBg:"#ffffff", navText:"#1e293b", pageBg:"#faf5ff" },
  { name:"Slate Dark",   primary:"#1e293b", accent:"#0ea5e9", navBg:"#1e293b", navText:"#f1f5f9", pageBg:"#f8fafc" },
  { name:"Crimson Red",  primary:"#7f1d1d", accent:"#d97706", navBg:"#ffffff", navText:"#1e293b", pageBg:"#fff1f2" },
  { name:"Ocean Teal",   primary:"#134e4a", accent:"#f59e0b", navBg:"#ffffff", navText:"#1e293b", pageBg:"#f0fdfa" },
];

const FONTS   = ["Segoe UI","Inter","Roboto","Open Sans","Lato","Poppins","Arial","Calibri","Georgia","Verdana"];
const SIZES   = ["10px","11px","12px","13px","14px","15px","16px"];
const RADII   = ["0px","2px","4px","6px","8px","10px","12px","16px","24px"];
const PADS    = ["8px","10px","12px","14px","16px","20px","24px","28px","32px"];
const HEIGHTS = ["32px","36px","40px","44px","48px","52px","56px"];

type Tab = "colors"|"fonts"|"layout"|"ui";
type Device = "desktop"|"tablet"|"mobile";

interface NavItem { id:string; label:string; color:string; visible:boolean; order:number; }

const DEFAULT_NAV: NavItem[] = [
  { id:"procurement",    label:"Procurement",    color:"#0078d4", visible:true,  order:1 },
  { id:"vouchers",       label:"Vouchers",       color:"#C45911", visible:true,  order:2 },
  { id:"financials",     label:"Financials",     color:"#107c10", visible:true,  order:3 },
  { id:"inventory",      label:"Inventory",      color:"#5c2d91", visible:true,  order:4 },
  { id:"quality",        label:"Quality",        color:"#498205", visible:true,  order:5 },
  { id:"reports",        label:"Reports & BI",   color:"#8764b8", visible:true,  order:6 },
  { id:"admin",          label:"Administration", color:"#ca5010", visible:true,  order:7 },
  { id:"database_admin", label:"DB Admin",       color:"#8b0000", visible:false, order:8 },
];

const DEFAULTS = {
  primary_color:"#0a2558",  accent_color:"#C45911",
  nav_bg_color:"#ffffff",   nav_text_color:"#1e293b",
  page_bg_color:"#f8fafc",  card_bg:"#ffffff",
  text_primary:"#1e293b",   text_secondary:"#64748b",
  border_color:"#e2e8f0",   success_color:"#166534",
  warning_color:"#92400e",  danger_color:"#dc2626",
  font_family:"Segoe UI",   font_size_base:"13px",
  font_size_sm:"11px",      font_size_lg:"15px",
  border_radius:"8px",      content_padding:"16px",
  topbar_height:"40px",     nav_height:"44px",
  show_logo_nav:"true",     show_kpi_tiles:"true",
  compact_tables:"false",   show_status_chips:"true",
  show_search_bar:"true",
  print_font:"Times New Roman",
  print_font_size:"11",
  paper_size:"A4",
};

export default function GuiEditorPage() {
  const { get } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState<Tab>("colors");
  const [device, setDevice] = useState<Device>("desktop");

  const [cfg, setCfg] = useState(() => ({
    primary_color:    get("primary_color",   DEFAULTS.primary_color),
    accent_color:     get("accent_color",    DEFAULTS.accent_color),
    nav_bg_color:     get("nav_bg_color",    DEFAULTS.nav_bg_color),
    nav_text_color:   get("nav_text_color",  DEFAULTS.nav_text_color),
    page_bg_color:    get("page_bg_color",   DEFAULTS.page_bg_color),
    card_bg:          get("card_bg",         DEFAULTS.card_bg),
    text_primary:     get("text_primary",    DEFAULTS.text_primary),
    text_secondary:   get("text_secondary",  DEFAULTS.text_secondary),
    border_color:     get("border_color",    DEFAULTS.border_color),
    success_color:    get("success_color",   DEFAULTS.success_color),
    warning_color:    get("warning_color",   DEFAULTS.warning_color),
    danger_color:     get("danger_color",    DEFAULTS.danger_color),
    font_family:      get("font_family",     DEFAULTS.font_family),
    font_size_base:   get("font_size_base",  DEFAULTS.font_size_base),
    font_size_sm:     get("font_size_sm",    DEFAULTS.font_size_sm),
    font_size_lg:     get("font_size_lg",    DEFAULTS.font_size_lg),
    border_radius:    get("border_radius",   DEFAULTS.border_radius),
    content_padding:  get("content_padding", DEFAULTS.content_padding),
    topbar_height:    get("topbar_height",   DEFAULTS.topbar_height),
    nav_height:       get("nav_height",      DEFAULTS.nav_height),
    show_logo_nav:    get("show_logo_nav",   DEFAULTS.show_logo_nav),
    show_kpi_tiles:   get("show_kpi_tiles",  DEFAULTS.show_kpi_tiles),
    compact_tables:   get("compact_tables",  DEFAULTS.compact_tables),
    show_status_chips:get("show_status_chips",DEFAULTS.show_status_chips),
    show_search_bar:  get("show_search_bar", DEFAULTS.show_search_bar),
    print_font:       get("print_font",       "Times New Roman"),
    print_font_size:  get("print_font_size",  "11"),
    paper_size:       get("paper_size",       "A4"),
  }));

  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV);
  const ipInfo = useRealIP();

  // - LIVE APPLICATION: apply to DOM immediately on every change -
  useEffect(() => {
    applyThemeToDOM(cfg as any);
  }, [cfg]);

  const setVal = useCallback((k: string, v: string) => setCfg(p => ({ ...p, [k]: v })), []);
  const toggle = useCallback((k: string) => setVal(k, cfg[k as keyof typeof cfg] === "true" ? "false" : "true"), [cfg, setVal]);
  const on = (k: string) => cfg[k as keyof typeof cfg] === "true";

  const applyPreset = (p: typeof PRESETS[0]) => {
    setCfg(prev => ({
      ...prev,
      primary_color:  p.primary,  accent_color: p.accent,
      nav_bg_color:   p.navBg,    nav_text_color: p.navText,
      page_bg_color:  p.pageBg,
    }));
    toast({ title: `"${p.name}" applied live -` });
  };

  // Drag-to-reorder nav
  const dragIdx  = useRef<number|null>(null);
  const dragOver = useRef<number|null>(null);
  const onDragStart = (i: number) => { dragIdx.current  = i; };
  const onDragEnter = (i: number) => { dragOver.current = i; };
  const onDrop = () => {
    if (dragIdx.current === null || dragOver.current === null) return;
    const arr = [...navItems];
    const [m] = arr.splice(dragIdx.current, 1);
    arr.splice(dragOver.current, 0, m);
    setNavItems(arr.map((it, i) => ({ ...it, order: i + 1 })));
    dragIdx.current = null; dragOver.current = null;
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= navItems.length) return;
    const arr = [...navItems];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setNavItems(arr.map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const handleSave = async () => {
    setSaving(true);
    const navKV: Record<string, string> = {};
    navItems.forEach((it, i) => {
      navKV[`nav_order_${it.id}`]   = String(i + 1);
      navKV[`nav_visible_${it.id}`] = String(it.visible);
    });
    const res = await saveSettings({ ...cfg, ...navKV }, "theme");
    setSaving(false);
    if (res.ok) toast({ title: "Theme saved & applied -", description: "All users will see changes on next page load" });
    else        toast({ title: "Save failed", description: res.error, variant: "destructive" });
  };

  const resetAll = () => {
    setCfg({ ...DEFAULTS } as any);
    setNavItems(DEFAULT_NAV);
    toast({ title: "Reset to defaults" });
  };

  // - Shared styles -
  const inp: React.CSSProperties = {
    width:"100%", padding:"7px 10px", border:"1.5px solid #e2e8f0",
    borderRadius:6, fontSize:12.5, outline:"none", background:"#fff",
    color:"#1e293b", boxSizing:"border-box",
  };
  const lbl: React.CSSProperties = {
    display:"block", fontSize:9.5, fontWeight:700,
    textTransform:"uppercase", letterSpacing:"0.06em",
    color:"#64748b", marginBottom:4,
  };

  // - Sub-components -
  const ColorRow = ({ k, label }: { k: string; label: string }) => (
    <div style={{ marginBottom:10 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <input type="color"
          value={cfg[k as keyof typeof cfg] || "#000000"}
          onChange={e => setVal(k, e.target.value)}
          style={{ width:36, height:32, borderRadius:6, border:"1.5px solid #e2e8f0", cursor:"pointer", padding:2, flexShrink:0 }}/>
        <input value={cfg[k as keyof typeof cfg] || ""}
          onChange={e => setVal(k, e.target.value)}
          style={{ ...inp, fontFamily:"monospace", fontSize:12, flex:1 }}
          placeholder="#000000"/>
      </div>
    </div>
  );

  const SelectRow = ({ k, label, opts }: { k: string; label: string; opts: string[] }) => (
    <div style={{ marginBottom:10 }}>
      <label style={lbl}>{label}</label>
      <select value={cfg[k as keyof typeof cfg]} onChange={e => setVal(k, e.target.value)} style={inp}>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const ToggleRow = ({ k, label }: { k: string; label: string }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"9px 12px", borderRadius:8, border:"1px solid #e2e8f0",
      background:"#fff", marginBottom:6 }}>
      <span style={{ fontSize:12.5, color:"#1e293b", fontWeight:500 }}>{label}</span>
      <button onClick={() => toggle(k)} style={{
        width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
        position:"relative", transition:"background 0.2s",
        background: on(k) ? cfg.primary_color : "#e2e8f0",
      }}>
        <div style={{
          position:"absolute", width:20, height:20, borderRadius:"50%",
          background:"#fff", top:2, transition:"left 0.15s",
          left: on(k) ? "calc(100% - 22px)" : "2px",
          boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
        }}/>
      </button>
    </div>
  );

  const pw = device === "desktop" ? "100%" : device === "tablet" ? 680 : 360;
  const compact = on("compact_tables");
  const visNav = navItems.filter(m => m.visible).sort((a, b) => a.order - b.order);

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f1f5f9", overflow:"hidden" }}>

      {/* - LEFT PANEL - Controls - */}
      <div style={{ width:296, flexShrink:0, background:"#fff", borderRight:"1px solid #e2e8f0",
        display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:"2px 0 12px rgba(0,0,0,0.06)" }}>

        {/* Header */}
        <div style={{ padding:"12px 14px", background:`linear-gradient(135deg,${cfg.primary_color},${cfg.accent_color}80)`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <img src={logoImg} alt="" style={{ width:28, height:28, borderRadius:6, objectFit:"contain", background:"rgba(255,255,255,0.2)", padding:2 }}/>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>GUI Editor</div>
              <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                <Zap style={{ width:9, height:9, color:"#fbbf24" }}/>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.7)" }}>Changes apply LIVE to the app</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #e2e8f0", flexShrink:0, background:"#f8fafc" }}>
          {([
            { id:"colors", label:"Colors", icon:Palette },
            { id:"fonts",  label:"Fonts",  icon:Type    },
            { id:"layout", label:"Layout", icon:Layout  },
            { id:"ui",     label:"UI",     icon:Settings2 },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:"9px 0", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                background: tab === t.id ? "#fff" : "transparent",
                borderBottom: tab === t.id ? `2px solid ${cfg.primary_color}` : "2px solid transparent",
                color: tab === t.id ? cfg.primary_color : "#94a3b8",
                fontWeight: tab === t.id ? 700 : 400, transition:"all 0.12s" }}>
              <t.icon style={{ width:14, height:14 }}/>
              <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.04em" }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable panel content */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 0" }}>

          {tab === "colors" && <>
            <label style={{ ...lbl, marginBottom:8 }}>One-Click Presets</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  style={{ padding:"7px 8px", borderRadius:8,
                    border:`1.5px solid ${p.primary}30`,
                    background:`linear-gradient(135deg,${p.primary}15,${p.accent}15)`,
                    cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}>
                  <div style={{ height:4, borderRadius:3, background:`linear-gradient(90deg,${p.primary},${p.accent})`, marginBottom:5 }}/>
                  <span style={{ fontSize:10, fontWeight:600, color:"#374151" }}>{p.name}</span>
                </button>
              ))}
            </div>
            <div style={{ height:1, background:"#e2e8f0", margin:"0 0 12px" }}/>
            {[
              { k:"primary_color",  l:"Primary  (headers, active tab, buttons)" },
              { k:"accent_color",   l:"Accent  (secondary buttons, highlights)" },
              { k:"nav_bg_color",   l:"Nav Bar Background" },
              { k:"nav_text_color", l:"Nav Bar Text" },
              { k:"page_bg_color",  l:"Page Background" },
              { k:"card_bg",        l:"Card / Table Background" },
              { k:"text_primary",   l:"Primary Text" },
              { k:"text_secondary", l:"Secondary / Muted Text" },
              { k:"border_color",   l:"Border Color" },
              { k:"success_color",  l:"Success  (Approved)" },
              { k:"warning_color",  l:"Warning  (Pending)" },
              { k:"danger_color",   l:"Danger  (Rejected / Error)" },
            ].map(r => <ColorRow key={r.k} k={r.k} label={r.l}/>)}
          </>}

          {tab === "fonts" && <>
            <SelectRow k="font_family"   label="Font Family"      opts={FONTS}/>
            <SelectRow k="font_size_base" label="Base Font Size"  opts={SIZES}/>
            <SelectRow k="font_size_sm"  label="Small Font Size"  opts={SIZES}/>
            <SelectRow k="font_size_lg"  label="Large Font Size"  opts={SIZES}/>
            <div style={{ marginTop:12, padding:14, border:"1px solid #e2e8f0", borderRadius:8, background:"#f8fafc" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Live Font Preview</div>
              <div style={{ fontFamily:cfg.font_family, fontSize:cfg.font_size_lg, fontWeight:700, color:"#1e293b", marginBottom:4 }}>Sample Heading Text</div>
              <div style={{ fontFamily:cfg.font_family, fontSize:cfg.font_size_base, color:"#374151", marginBottom:4 }}>Body text - EL5 MediProcure Procurement System, Embu County</div>
              <div style={{ fontFamily:cfg.font_family, fontSize:cfg.font_size_sm, color:"#64748b" }}>Caption text - Sub-heading - Secondary information</div>
            </div>
          </>}

          {tab === "layout" && <>
            <SelectRow k="border_radius"   label="Border Radius"       opts={RADII}/>
            <SelectRow k="content_padding" label="Page Content Padding" opts={PADS}/>
            <SelectRow k="topbar_height"   label="Top Bar Height"       opts={HEIGHTS}/>
            <SelectRow k="nav_height"      label="Module Nav Height"    opts={HEIGHTS}/>
            {/* Preview of border radius on buttons */}
            <div style={{ display:"flex", gap:8, marginBottom:14, marginTop:4 }}>
              <div style={{ flex:1, height:32, background:cfg.primary_color, borderRadius:cfg.border_radius, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>Button</span>
              </div>
              <div style={{ flex:1, height:32, border:`1.5px solid ${cfg.border_color}`, borderRadius:cfg.border_radius, display:"flex", alignItems:"center", justifyContent:"center", background:"#fff" }}>
                <span style={{ color:"#374151", fontSize:11 }}>Input</span>
              </div>
              <div style={{ flex:1, height:32, background:cfg.accent_color, borderRadius:cfg.border_radius, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>Accent</span>
              </div>
            </div>
            <div style={{ height:1, background:"#e2e8f0", margin:"0 0 12px" }}/>
            {/* Nav reorder */}
            <label style={{ ...lbl, marginBottom:8 }}>Navigation Order - Drag to Reorder</label>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {[...navItems].sort((a, b) => a.order - b.order).map((item, i) => (
                <div key={item.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDrop}
                  onDragOver={e => e.preventDefault()}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px",
                    borderRadius:7, border:`1px solid ${item.visible ? "#e2e8f0" : "#f1f5f9"}`,
                    background: item.visible ? "#fff" : "#f8fafc",
                    cursor:"grab", userSelect:"none",
                    borderLeft:`3px solid ${item.color}`,
                    opacity: item.visible ? 1 : 0.5 }}>
                  <Move style={{ width:11, height:11, color:"#94a3b8", flexShrink:0 }}/>
                  <span style={{ flex:1, fontSize:12, color:"#1e293b", fontWeight:500 }}>{item.label}</span>
                  <button onClick={() => moveItem(i, -1)} style={{ padding:2, border:"none", background:"none", cursor:"pointer", color:"#94a3b8" }}>
                    <ChevronUp style={{ width:11, height:11 }}/>
                  </button>
                  <button onClick={() => moveItem(i, 1)} style={{ padding:2, border:"none", background:"none", cursor:"pointer", color:"#94a3b8" }}>
                    <ChevronDown style={{ width:11, height:11 }}/>
                  </button>
                  <button onClick={() => setNavItems(p => p.map(it => it.id === item.id ? { ...it, visible:!it.visible } : it))}
                    style={{ width:22, height:22, borderRadius:4, flexShrink:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                      border:`1px solid ${item.visible ? item.color : "#e2e8f0"}`,
                      background: item.visible ? item.color : "#f1f5f9" }}>
                    {item.visible
                      ? <Check style={{ width:10, height:10, color:"#fff" }}/>
                      : <X style={{ width:10, height:10, color:"#94a3b8" }}/>}
                  </button>
                </div>
              ))}
            </div>
          </>}

          {tab === "ui" && <>
            <ToggleRow k="show_logo_nav"     label="Show Logo in Top Bar"/>
            <ToggleRow k="show_kpi_tiles"    label="Show KPI Tiles on Pages"/>
            <ToggleRow k="compact_tables"    label="Compact Table Rows"/>
            <ToggleRow k="show_status_chips" label="Coloured Status Badges"/>
            <ToggleRow k="show_search_bar"   label="Show Search Bar in Top Bar"/>

            {/* Print Settings */}
            <div style={{marginTop:12,marginBottom:6,fontSize:9.5,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Print Settings</div>
            <SelectRow k="print_font" label="Print Font" opts={["Times New Roman","Arial","Calibri","Georgia","Segoe UI","Helvetica"]}/>
            <SelectRow k="print_font_size" label="Print Font Size" opts={["9","10","11","12","13","14"]}/>
            <SelectRow k="paper_size" label="Paper Size" opts={["A4","A3","Letter","Legal"]}/>

            {/* Real IP Info Panel */}
            <div style={{marginTop:14,padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <Wifi style={{width:12,height:12,color:"#0078d4"}}/>
                <span style={{fontSize:11,fontWeight:700,color:"#1e293b"}}>Your Connection</span>
                {ipInfo.fetching && <span style={{fontSize:9,color:"#94a3b8",marginLeft:"auto"}}>detecting...</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10.5}}>
                <div style={{padding:"4px 8px",borderRadius:5,background:"#fff",border:"1px solid #e2e8f0"}}>
                  <div style={{color:"#94a3b8",fontSize:9,marginBottom:1}}>PUBLIC IP</div>
                  <div style={{color:"#1e293b",fontWeight:700,fontFamily:"monospace"}}>{ipInfo.publicIP||"—"}</div>
                </div>
                <div style={{padding:"4px 8px",borderRadius:5,background:"#fff",border:"1px solid #e2e8f0"}}>
                  <div style={{color:"#94a3b8",fontSize:9,marginBottom:1}}>PRIVATE IP</div>
                  <div style={{color:"#1e293b",fontWeight:700,fontFamily:"monospace"}}>{ipInfo.privateIPs[1]||ipInfo.privateIPs[0]||"127.0.0.1"}</div>
                </div>
                <div style={{padding:"4px 8px",borderRadius:5,background:"#fff",border:"1px solid #e2e8f0"}}>
                  <div style={{color:"#94a3b8",fontSize:9,marginBottom:1}}>LOCATION</div>
                  <div style={{color:"#374151",fontWeight:500}}>{ipInfo.city&&ipInfo.country?`${ipInfo.city}, ${ipInfo.country}`:ipInfo.country||"—"}</div>
                </div>
                <div style={{padding:"4px 8px",borderRadius:5,background:"#fff",border:"1px solid #e2e8f0"}}>
                  <div style={{color:"#94a3b8",fontSize:9,marginBottom:1}}>ISP / ORG</div>
                  <div style={{color:"#374151",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ipInfo.isp||"—"}</div>
                </div>
              </div>
              {ipInfo.timezone && (
                <div style={{marginTop:4,fontSize:9.5,color:"#64748b",textAlign:"center"}}>
                  Timezone: {ipInfo.timezone} • All IPs: {ipInfo.privateIPs.join(", ")}
                </div>
              )}
            </div>
          </>}

          <div style={{ height:16 }}/>
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 12px", borderTop:"1px solid #e2e8f0", display:"flex", gap:8, flexShrink:0, background:"#f8fafc" }}>
          <button onClick={resetAll}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px",
              borderRadius:7, border:"1px solid #e2e8f0", background:"#fff",
              color:"#64748b", cursor:"pointer", fontSize:12, fontWeight:600 }}>
            <RotateCcw style={{ width:12, height:12 }}/>Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              padding:"8px 0", borderRadius:7, border:"none",
              background:`linear-gradient(135deg,${cfg.primary_color},${cfg.accent_color}aa)`,
              color:"#fff", cursor: saving ? "not-allowed" : "pointer",
              fontSize:12, fontWeight:700, opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <RefreshCw style={{ width:13, height:13, animation:"spin 1s linear infinite" }}/>
              : <Save style={{ width:13, height:13 }}/>}
            {saving ? "Saving..." : "Save & Apply"}
          </button>
        </div>
      </div>

      {/* - RIGHT - LIVE PREVIEW - */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Preview bar */}
        <div style={{ padding:"8px 16px", background:"#fff", borderBottom:"1px solid #e2e8f0",
          display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <Eye style={{ width:14, height:14, color:"#64748b" }}/>
          <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Live Preview</span>
          <span style={{ fontSize:11, color:"#94a3b8" }}>Reflects the real app - changes apply instantly</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            {(["desktop","tablet","mobile"] as Device[]).map(d => {
              const icons = { desktop:Monitor, tablet:Tablet, mobile:Smartphone };
              const Icon  = icons[d];
              return (
                <button key={d} onClick={() => setDevice(d)}
                  style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", cursor:"pointer",
                    background: device === d ? cfg.primary_color : "#fff",
                    color:      device === d ? "#fff" : "#64748b" }}>
                  <Icon style={{ width:13, height:13 }}/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview frame */}
        <div style={{ flex:1, overflow:"auto", padding:20, background:"#cbd5e1",
          display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
          <div style={{ width:pw, maxWidth:"100%", borderRadius:10,
            boxShadow:"0 8px 32px rgba(0,0,0,0.2)", overflow:"hidden",
            minHeight:560, background:cfg.page_bg_color, fontFamily:cfg.font_family }}>

            {/* Top bar */}
            <div style={{ height:cfg.topbar_height, background:"#1f1f1f", display:"flex", alignItems:"center", padding:"0 12px", gap:8 }}>
              {on("show_logo_nav") && (
                <img src={logoImg} alt="" style={{ height:22, width:22, borderRadius:4, objectFit:"contain", background:"rgba(255,255,255,0.12)", padding:2 }}/>
              )}
              <span style={{ fontSize:11, fontWeight:700, color:"#fff", fontFamily:cfg.font_family }}>EL5 MediProcure</span>
              {on("show_search_bar") && device !== "mobile" && (
                <div style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:3, background:"rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>Search...</span>
                </div>
              )}
              <div style={{ marginLeft: on("show_search_bar") && device !== "mobile" ? 8 : "auto",
                width:22, height:22, borderRadius:"50%", background:"#0078d4",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", fontWeight:800 }}>A</div>
            </div>

            {/* Module nav */}
            <div style={{ height:cfg.nav_height, background:cfg.nav_bg_color, display:"flex", alignItems:"center",
              borderBottom:`1px solid ${cfg.border_color}`, overflowX:"auto", flexShrink:0 }}>
              {visNav.map((m, i) => (
                <div key={m.id} style={{ padding:`0 ${device === "mobile" ? "10px" : "16px"}`, height:"100%",
                  display:"flex", alignItems:"center", whiteSpace:"nowrap", flexShrink:0,
                  borderBottom: i === 0 ? `3px solid ${m.color}` : "3px solid transparent",
                  background:   i === 0 ? m.color : cfg.nav_bg_color,
                  color:        i === 0 ? "#fff"  : cfg.nav_text_color,
                  fontSize: device === "mobile" ? 10 : 11.5,
                  fontWeight: i === 0 ? 700 : 500, cursor:"pointer",
                  fontFamily: cfg.font_family }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding:cfg.content_padding, fontFamily:cfg.font_family }}>
              {/* KPI */}
              {on("show_kpi_tiles") && (
                <div style={{ display:"grid", gridTemplateColumns: device === "mobile" ? "1fr 1fr" : "repeat(4,1fr)", gap:8, marginBottom:12 }}>
                  {[
                    { l:"Total Value",  v:"KES 4.2M", bg:cfg.primary_color },
                    { l:"Approved",     v:"18",        bg:cfg.success_color },
                    { l:"Pending",      v:"6",         bg:cfg.warning_color },
                    { l:"Total Records",v:"142",       bg:"#4c1d95" },
                  ].map(k => (
                    <div key={k.l} style={{ padding: compact ? "8px 10px" : "11px 14px",
                      borderRadius:cfg.border_radius, background:k.bg, color:"#fff",
                      boxShadow:"0 2px 6px rgba(0,0,0,0.12)" }}>
                      <div style={{ fontSize:cfg.font_size_lg, fontWeight:700 }}>{k.v}</div>
                      <div style={{ fontSize:cfg.font_size_sm, opacity:0.75, marginTop:2 }}>{k.l}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Table */}
              <div style={{ background:cfg.card_bg, borderRadius:cfg.border_radius,
                border:`1px solid ${cfg.border_color}`, overflow:"hidden",
                boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: compact ? "7px 12px" : "9px 14px", background:cfg.primary_color,
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#fff", fontFamily:cfg.font_family }}>Requisitions</span>
                  <div style={{ display:"flex", gap:6 }}>
                    <span style={{ padding:"3px 10px", borderRadius:cfg.border_radius, background:"rgba(255,255,255,0.2)", fontSize:10, color:"#fff" }}>Export</span>
                    <span style={{ padding:"3px 10px", borderRadius:cfg.border_radius, background:"rgba(255,255,255,0.9)", fontSize:10, color:cfg.primary_color, fontWeight:700 }}>+ New</span>
                  </div>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:cfg.font_family }}>
                  <thead>
                    <tr style={{ background:cfg.primary_color }}>
                      {["Req No.","Title","Status","Amount"].map(h => (
                        <th key={h} style={{ padding: compact ? "5px 10px" : "8px 12px",
                          textAlign:"left", color:"rgba(255,255,255,0.8)",
                          fontSize:9.5, fontWeight:700, textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n:"RQQ/001", t:"Medical Supplies Q1",   s:"Approved", bg:"#dcfce7", sc:cfg.success_color, a:"KES 42,500" },
                      { n:"RQQ/002", t:"ICU Equipment",          s:"Pending",  bg:"#fef3c7", sc:cfg.warning_color, a:"KES 120,000" },
                      { n:"RQQ/003", t:"Lab Reagents - Monthly", s:"Draft",    bg:"#f1f5f9", sc:"#64748b",         a:"KES 18,200" },
                    ].map((r, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${cfg.border_color}`, background:cfg.card_bg }}>
                        <td style={{ padding: compact ? "4px 10px" : "8px 12px", fontSize:cfg.font_size_sm, fontFamily:"monospace", color:cfg.primary_color, fontWeight:700 }}>{r.n}</td>
                        <td style={{ padding: compact ? "4px 10px" : "8px 12px", fontSize:cfg.font_size_base, color:cfg.text_primary }}>{r.t}</td>
                        <td style={{ padding: compact ? "4px 10px" : "8px 12px" }}>
                          {on("show_status_chips")
                            ? <span style={{ padding:"2px 8px", borderRadius:20, fontSize:9, fontWeight:700, background:r.bg, color:r.sc }}>{r.s}</span>
                            : <span style={{ fontSize:cfg.font_size_sm, color:cfg.text_secondary }}>{r.s}</span>}
                        </td>
                        <td style={{ padding: compact ? "4px 10px" : "8px 12px", fontSize:cfg.font_size_base, color:cfg.text_primary, fontWeight:600 }}>{r.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding:"7px 12px", background:cfg.page_bg_color,
                  borderTop:`1px solid ${cfg.border_color}`, fontSize:cfg.font_size_sm, color:cfg.text_secondary }}>
                  3 records - Total: KES 180,700
                </div>
              </div>
              {/* Buttons */}
              <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" as const }}>
                <div style={{ padding:`7px 16px`, borderRadius:cfg.border_radius, background:cfg.primary_color, color:"#fff", fontSize:cfg.font_size_base, fontWeight:700, cursor:"pointer" }}>
                  + New Requisition
                </div>
                <div style={{ padding:`7px 16px`, borderRadius:cfg.border_radius, background:cfg.accent_color, color:"#fff", fontSize:cfg.font_size_base, fontWeight:700, cursor:"pointer" }}>
                  Export Excel
                </div>
                <div style={{ padding:`7px 16px`, borderRadius:cfg.border_radius, background:cfg.card_bg, color:cfg.text_secondary, fontSize:cfg.font_size_base, cursor:"pointer", border:`1px solid ${cfg.border_color}` }}>
                  Cancel
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}