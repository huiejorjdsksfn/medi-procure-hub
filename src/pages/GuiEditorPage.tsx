/**
 * ProcurBosse — GUI Editor
 * Drag-and-drop visual editor for system appearance
 * Change colors, fonts, layout globally
 */
import { useState, useRef, useCallback } from "react";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { Save, RotateCcw, Eye, Palette, Type, Layout, Settings2,
  Move, ChevronDown, Check, RefreshCw, Monitor, Smartphone, Tablet } from "lucide-react";
import logoImg from "@/assets/logo.png";

const PRESETS = [
  { name:"Navy Blue (Default)", primary:"#0a2558", accent:"#C45911", nav:"#ffffff", navText:"#1e293b", bg:"#f8fafc" },
  { name:"Forest Green", primary:"#065f46", accent:"#d97706", nav:"#ffffff", navText:"#1e293b", bg:"#f0fdf4" },
  { name:"Royal Purple", primary:"#4c1d95", accent:"#be185d", nav:"#ffffff", navText:"#1e293b", bg:"#faf5ff" },
  { name:"Slate Dark", primary:"#1e293b", accent:"#0ea5e9", nav:"#1e293b", navText:"#f1f5f9", bg:"#f8fafc" },
  { name:"Crimson Red", primary:"#7f1d1d", accent:"#d97706", nav:"#ffffff", navText:"#1e293b", bg:"#fff1f2" },
  { name:"Ocean Teal", primary:"#134e4a", accent:"#f59e0b", nav:"#ffffff", navText:"#1e293b", bg:"#f0fdfa" },
];

const FONT_OPTIONS = ["Segoe UI", "Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Arial", "Times New Roman", "Georgia"];
const FONT_SIZES   = ["11px","12px","13px","14px","15px","16px"];
const RADIUS_OPTIONS = ["0px","4px","6px","8px","10px","12px","16px","24px"];

type DeviceView = "desktop" | "tablet" | "mobile";

interface LayoutItem {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export default function GuiEditorPage() {
  const { get } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"colors"|"typography"|"layout"|"components">("colors");
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");
  const [previewOpen, setPreviewOpen] = useState(true);

  const [cfg, setCfg] = useState({
    // Colors
    primary_color:    get("primary_color",    "#0a2558"),
    accent_color:     get("accent_color",     "#C45911"),
    nav_bg_color:     get("nav_bg_color",     "#ffffff"),
    nav_text_color:   get("nav_text_color",   "#1e293b"),
    page_bg_color:    get("page_bg_color",    "#f8fafc"),
    sidebar_bg:       get("sidebar_bg",       "#0a2558"),
    card_bg:          get("card_bg",          "#ffffff"),
    text_primary:     get("text_primary",     "#1e293b"),
    text_secondary:   get("text_secondary",   "#64748b"),
    border_color:     get("border_color",     "#e2e8f0"),
    success_color:    get("success_color",    "#166534"),
    warning_color:    get("warning_color",    "#92400e"),
    danger_color:     get("danger_color",     "#dc2626"),
    // Typography
    font_family:      get("font_family",      "Segoe UI"),
    font_size_base:   get("font_size_base",   "13px"),
    font_size_small:  get("font_size_small",  "11px"),
    font_size_large:  get("font_size_large",  "15px"),
    font_weight_normal: get("font_weight_normal", "400"),
    font_weight_bold:   get("font_weight_bold",   "700"),
    // Layout
    border_radius:    get("border_radius",    "8px"),
    card_shadow:      get("card_shadow",      "0 1px 4px rgba(0,0,0,0.08)"),
    topbar_height:    get("topbar_height",    "40px"),
    nav_height:       get("nav_height",       "44px"),
    content_padding:  get("content_padding",  "16px"),
    // Components
    show_logo_nav:    get("show_logo_nav",    "true"),
    show_breadcrumb:  get("show_breadcrumb",  "true"),
    show_kpi_tiles:   get("show_kpi_tiles",   "true"),
    compact_tables:   get("compact_tables",   "false"),
    show_status_chips:get("show_status_chips","true"),
  });

  const [navItems, setNavItems] = useState<LayoutItem[]>([
    { id:"procurement",    label:"Procurement",    visible:true, order:1 },
    { id:"vouchers",       label:"Vouchers",       visible:true, order:2 },
    { id:"financials",     label:"Financials",     visible:true, order:3 },
    { id:"inventory",      label:"Inventory",      visible:true, order:4 },
    { id:"quality",        label:"Quality",        visible:true, order:5 },
    { id:"reports",        label:"Reports & BI",   visible:true, order:6 },
    { id:"admin",          label:"Administration", visible:true, order:7 },
    { id:"database_admin", label:"DB Admin",       visible:true, order:8 },
  ]);

  const dragItem = useRef<number|null>(null);
  const dragOver = useRef<number|null>(null);

  const handleDragStart = (i: number) => { dragItem.current = i; };
  const handleDragEnter = (i: number) => { dragOver.current = i; };
  const handleDrop = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const arr = [...navItems];
    const dragged = arr.splice(dragItem.current, 1)[0];
    arr.splice(dragOver.current, 0, dragged);
    setNavItems(arr.map((it, i) => ({ ...it, order: i + 1 })));
    dragItem.current = null; dragOver.current = null;
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setCfg(prev => ({
      ...prev,
      primary_color: p.primary, accent_color: p.accent,
      nav_bg_color: p.nav, nav_text_color: p.navText,
      page_bg_color: p.bg, sidebar_bg: p.primary,
    }));
    toast({ title: `Preset "${p.name}" applied` });
  };

  const handleSave = async () => {
    setSaving(true);
    // Save all settings + nav order
    const navOrder: Record<string,string> = {};
    navItems.forEach((it, i) => {
      navOrder[`nav_order_${it.id}`] = String(i + 1);
      navOrder[`nav_visible_${it.id}`] = String(it.visible);
    });
    const res = await saveSettings({ ...cfg, ...navOrder }, "theme");
    if (res.ok) {
      toast({ title: "Theme saved ✓", description: "Refresh app to see all changes" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const reset = () => {
    setCfg({
      primary_color: "#0a2558", accent_color: "#C45911",
      nav_bg_color: "#ffffff", nav_text_color: "#1e293b",
      page_bg_color: "#f8fafc", sidebar_bg: "#0a2558",
      card_bg: "#ffffff", text_primary: "#1e293b",
      text_secondary: "#64748b", border_color: "#e2e8f0",
      success_color: "#166534", warning_color: "#92400e",
      danger_color: "#dc2626", font_family: "Segoe UI",
      font_size_base: "13px", font_size_small: "11px",
      font_size_large: "15px", font_weight_normal: "400",
      font_weight_bold: "700", border_radius: "8px",
      card_shadow: "0 1px 4px rgba(0,0,0,0.08)", topbar_height: "40px",
      nav_height: "44px", content_padding: "16px",
      show_logo_nav: "true", show_breadcrumb: "true",
      show_kpi_tiles: "true", compact_tables: "false",
      show_status_chips: "true",
    });
    toast({ title: "Reset to defaults" });
  };

  const set = (k: string, v: string) => setCfg(p => ({ ...p, [k]: v }));
  const tog = (k: string) => set(k, cfg[k as keyof typeof cfg] === "true" ? "false" : "true");

  const inp: React.CSSProperties = { width:"100%", padding:"7px 10px", border:"1.5px solid #e2e8f0", borderRadius:6, fontSize:12.5, outline:"none", background:"#fff", color:"#1e293b", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#64748b", marginBottom:4 };

  const previewW = deviceView === "desktop" ? "100%" : deviceView === "tablet" ? 768 : 375;

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f8fafc" }}>

      {/* LEFT PANEL — Controls */}
      <div style={{ width:320, flexShrink:0, background:"#fff", borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Panel header */}
        <div style={{ padding:"14px 16px", background:"linear-gradient(90deg,#0a2558,#1a3a6b)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <img src={logoImg} alt="" style={{ width:28, height:28, borderRadius:6, objectFit:"contain", background:"rgba(255,255,255,0.15)", padding:2 }}/>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>GUI Editor</div>
              <div style={{ fontSize:9.5, color:"rgba(255,255,255,0.55)" }}>Drag · Click · Change · Save</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
          {([
            { id:"colors", icon:Palette, label:"Colors" },
            { id:"typography", icon:Type, label:"Fonts" },
            { id:"layout", icon:Layout, label:"Layout" },
            { id:"components", icon:Settings2, label:"UI" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex:1, padding:"8px 4px", border:"none", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                borderBottom: activeTab === t.id ? `2px solid #0a2558` : "2px solid transparent",
                color: activeTab === t.id ? "#0a2558" : "#64748b" }}>
              <t.icon style={{ width:14, height:14 }}/>
              <span style={{ fontSize:9, fontWeight:600 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:14 }}>

          {activeTab === "colors" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Presets */}
              <div>
                <label style={lbl}>Quick Presets</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {PRESETS.map(p => (
                    <button key={p.name} onClick={() => applyPreset(p)}
                      style={{ padding:"7px 8px", borderRadius:7, border:`2px solid ${p.primary}`, background:"#fff", cursor:"pointer", textAlign:"left" }}>
                      <div style={{ width:"100%", height:8, borderRadius:3, background:`linear-gradient(90deg,${p.primary},${p.accent})`, marginBottom:4 }}/>
                      <span style={{ fontSize:9.5, fontWeight:600, color:"#374151" }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color pickers */}
              {[
                { k:"primary_color",   l:"Primary (Nav/Headers)" },
                { k:"accent_color",    l:"Accent (Buttons/Badges)" },
                { k:"nav_bg_color",    l:"Nav Bar Background" },
                { k:"nav_text_color",  l:"Nav Bar Text" },
                { k:"page_bg_color",   l:"Page Background" },
                { k:"card_bg",         l:"Card Background" },
                { k:"text_primary",    l:"Primary Text" },
                { k:"text_secondary",  l:"Secondary Text" },
                { k:"border_color",    l:"Borders" },
                { k:"success_color",   l:"Success Color" },
                { k:"warning_color",   l:"Warning Color" },
                { k:"danger_color",    l:"Danger/Error Color" },
              ].map(({ k, l }) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input type="color" value={cfg[k as keyof typeof cfg] || "#000000"}
                      onChange={e => set(k, e.target.value)}
                      style={{ width:36, height:32, borderRadius:6, border:"1.5px solid #e2e8f0", cursor:"pointer", padding:2 }}/>
                    <input value={cfg[k as keyof typeof cfg] || ""} onChange={e => set(k, e.target.value)}
                      style={{ ...inp, fontFamily:"monospace", fontSize:12 }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "typography" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={lbl}>Font Family</label>
                <select value={cfg.font_family} onChange={e => set("font_family", e.target.value)} style={inp}>
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {[
                { k:"font_size_base",  l:"Base Font Size",  opts:FONT_SIZES },
                { k:"font_size_small", l:"Small Font Size", opts:FONT_SIZES },
                { k:"font_size_large", l:"Large Font Size", opts:FONT_SIZES },
              ].map(({ k, l, opts }) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <select value={cfg[k as keyof typeof cfg]} onChange={e => set(k, e.target.value)} style={inp}>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {/* Font weight toggles */}
              <div>
                <label style={lbl}>Font Weight — Normal</label>
                <select value={cfg.font_weight_normal} onChange={e => set("font_weight_normal", e.target.value)} style={inp}>
                  {["300","400","500","600"].map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Font Weight — Bold</label>
                <select value={cfg.font_weight_bold} onChange={e => set("font_weight_bold", e.target.value)} style={inp}>
                  {["600","700","800","900"].map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              {/* Live preview */}
              <div style={{ padding:14, border:"1px solid #e2e8f0", borderRadius:8, background:"#f8fafc" }}>
                <div style={{ fontFamily:cfg.font_family, fontSize:cfg.font_size_large, fontWeight:Number(cfg.font_weight_bold), color:"#1e293b", marginBottom:4 }}>Sample Heading</div>
                <div style={{ fontFamily:cfg.font_family, fontSize:cfg.font_size_base, fontWeight:Number(cfg.font_weight_normal), color:"#374151" }}>Sample body text — Embu Level 5 Hospital ERP</div>
                <div style={{ fontFamily:cfg.font_family, fontSize:cfg.font_size_small, color:"#64748b", marginTop:4 }}>Caption / secondary text</div>
              </div>
            </div>
          )}

          {activeTab === "layout" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={lbl}>Border Radius</label>
                <select value={cfg.border_radius} onChange={e => set("border_radius", e.target.value)} style={inp}>
                  {RADIUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{ marginTop:6, height:28, background:cfg.primary_color, borderRadius:cfg.border_radius, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>Button Preview</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Content Padding</label>
                <select value={cfg.content_padding} onChange={e => set("content_padding", e.target.value)} style={inp}>
                  {["8px","12px","16px","20px","24px","32px"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Top Bar Height</label>
                <select value={cfg.topbar_height} onChange={e => set("topbar_height", e.target.value)} style={inp}>
                  {["32px","36px","40px","44px","48px","56px"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Module Nav Height</label>
                <select value={cfg.nav_height} onChange={e => set("nav_height", e.target.value)} style={inp}>
                  {["36px","40px","44px","48px","52px"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Nav items drag-to-reorder */}
              <div>
                <label style={{ ...lbl, marginBottom:8 }}>Navigation Order (Drag to Reorder)</label>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {navItems.sort((a,b) => a.order-b.order).map((item, i) => (
                    <div key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragEnter={() => handleDragEnter(i)}
                      onDragEnd={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", cursor:"grab", userSelect:"none" }}>
                      <Move style={{ width:12, height:12, color:"#94a3b8", flexShrink:0 }}/>
                      <span style={{ flex:1, fontSize:12, color:"#1e293b", fontWeight:500 }}>{item.label}</span>
                      <button onClick={() => setNavItems(p => p.map(it => it.id===item.id ? {...it, visible:!it.visible} : it))}
                        style={{ width:22, height:22, borderRadius:4, border:"1px solid #e2e8f0", background:item.visible ? "#0a2558" : "#f1f5f9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Check style={{ width:10, height:10, color:item.visible ? "#fff" : "#94a3b8" }}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "components" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { k:"show_logo_nav",    l:"Show Logo in Top Bar" },
                { k:"show_breadcrumb",  l:"Show Breadcrumb" },
                { k:"show_kpi_tiles",   l:"Show KPI Tiles on Pages" },
                { k:"compact_tables",   l:"Compact Table Rows" },
                { k:"show_status_chips",l:"Show Status Badges" },
              ].map(({ k, l }) => (
                <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff" }}>
                  <span style={{ fontSize:12.5, color:"#1e293b", fontWeight:500 }}>{l}</span>
                  <button onClick={() => tog(k)}
                    style={{ width:42, height:22, borderRadius:11, border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s",
                      background: cfg[k as keyof typeof cfg] === "true" ? cfg.primary_color : "#e2e8f0" }}>
                    <div style={{ position:"absolute", width:18, height:18, borderRadius:"50%", background:"#fff", top:2, transition:"left 0.2s",
                      left: cfg[k as keyof typeof cfg] === "true" ? "calc(100% - 20px)" : "2px", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding:"12px 14px", borderTop:"1px solid #e2e8f0", display:"flex", gap:8, flexShrink:0 }}>
          <button onClick={reset} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", fontSize:12 }}>
            <RotateCcw style={{ width:13, height:13 }}/>Reset
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px 14px", borderRadius:7, border:"none", background:`linear-gradient(90deg,#0a2558,#1a3a6b)`, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700, opacity:saving?0.7:1 }}>
            {saving ? <RefreshCw style={{ width:13, height:13, animation:"spin 1s linear infinite" }}/> : <Save style={{ width:13, height:13 }}/>}
            {saving ? "Saving..." : "Save & Apply"}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL — Live Preview */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Preview toolbar */}
        <div style={{ padding:"8px 16px", background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <Eye style={{ width:14, height:14, color:"#64748b" }}/>
          <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Live Preview</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            {([
              { id:"desktop", icon:Monitor },
              { id:"tablet", icon:Tablet },
              { id:"mobile", icon:Smartphone },
            ] as const).map(d => (
              <button key={d.id} onClick={() => setDeviceView(d.id)}
                style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", cursor:"pointer",
                  background: deviceView === d.id ? "#0a2558" : "#fff",
                  color: deviceView === d.id ? "#fff" : "#64748b" }}>
                <d.icon style={{ width:14, height:14 }}/>
              </button>
            ))}
          </div>
        </div>

        {/* Preview frame */}
        <div style={{ flex:1, overflow:"auto", padding:20, background:"#e2e8f0", display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
          <div style={{ width:previewW, maxWidth:"100%", background:cfg.page_bg_color, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", overflow:"hidden", minHeight:500 }}>

            {/* Preview Top Bar */}
            <div style={{ height:cfg.topbar_height, background:"#1f1f1f", display:"flex", alignItems:"center", padding:"0 12px", gap:8 }}>
              {cfg.show_logo_nav === "true" && (
                <img src={logoImg} alt="" style={{ height:22, width:22, borderRadius:4, objectFit:"contain", background:"rgba(255,255,255,0.1)", padding:2 }}/>
              )}
              <span style={{ fontSize:11, fontWeight:700, color:"#fff", fontFamily:cfg.font_family }}>EL5 MediProcure</span>
              <div style={{ flex:1 }}/>
              <div style={{ width:22, height:22, borderRadius:"50%", background:"#0078d4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", fontWeight:800 }}>A</div>
            </div>

            {/* Preview Nav Bar */}
            <div style={{ height:cfg.nav_height, background:cfg.nav_bg_color, display:"flex", alignItems:"center", borderBottom:`1px solid ${cfg.border_color}`, overflowX:"auto" }}>
              {navItems.filter(m => m.visible).sort((a,b) => a.order-b.order).map((m, i) => (
                <div key={m.id} style={{ padding:`0 ${deviceView==="mobile"?"10px":"16px"}`, height:"100%", display:"flex", alignItems:"center", whiteSpace:"nowrap",
                  borderBottom: i===0 ? `3px solid ${cfg.primary_color}` : "3px solid transparent",
                  background: i===0 ? cfg.primary_color : cfg.nav_bg_color,
                  color: i===0 ? "#fff" : cfg.nav_text_color,
                  fontSize: deviceView==="mobile" ? 10 : 11.5,
                  fontWeight: i===0 ? 700 : 500,
                  fontFamily: cfg.font_family,
                  cursor:"pointer", flexShrink:0 }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Preview Content */}
            <div style={{ padding:cfg.content_padding, fontFamily:cfg.font_family }}>
              {/* KPI tiles */}
              {cfg.show_kpi_tiles === "true" && (
                <div style={{ display:"grid", gridTemplateColumns: deviceView==="mobile" ? "1fr 1fr" : "repeat(4,1fr)", gap:8, marginBottom:12 }}>
                  {[
                    { l:"Total Value", v:"KES 4.2M", bg:cfg.primary_color },
                    { l:"Approved",    v:"18",       bg:"#065f46" },
                    { l:"Pending",     v:"6",        bg:"#92400e" },
                    { l:"This Month",  v:"24",       bg:"#4c1d95" },
                  ].map(k => (
                    <div key={k.l} style={{ padding:"10px 12px", borderRadius:cfg.border_radius, background:k.bg, color:"#fff", boxShadow:cfg.card_shadow }}>
                      <div style={{ fontSize:cfg.font_size_large, fontWeight:Number(cfg.font_weight_bold) }}>{k.v}</div>
                      <div style={{ fontSize:cfg.font_size_small, opacity:0.8, marginTop:3 }}>{k.l}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table preview */}
              <div style={{ background:cfg.card_bg, borderRadius:cfg.border_radius, border:`1px solid ${cfg.border_color}`, boxShadow:cfg.card_shadow, overflow:"hidden" }}>
                <div style={{ padding:"8px 12px", background:cfg.primary_color }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#fff", fontFamily:cfg.font_family }}>Requisitions</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:cfg.font_family }}>
                  <thead>
                    <tr style={{ background:cfg.primary_color }}>
                      {["Req No.","Title","Status","Amount"].map(h => (
                        <th key={h} style={{ padding: cfg.compact_tables==="true" ? "5px 10px" : "8px 12px", textAlign:"left", color:"rgba(255,255,255,0.8)", fontSize:9, textTransform:"uppercase", fontWeight:700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n:"RQQ/EL5H/2026/0001", t:"Medical Supplies Q1", s:"Approved", a:"KES 42,500" },
                      { n:"RQQ/EL5H/2026/0002", t:"ICU Equipment",       s:"Pending",  a:"KES 120,000" },
                      { n:"RQQ/EL5H/2026/0003", t:"Lab Reagents",        s:"Draft",    a:"KES 18,200" },
                    ].map((r, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${cfg.border_color}` }}>
                        <td style={{ padding: cfg.compact_tables==="true" ? "4px 10px" : "8px 12px", fontSize:cfg.font_size_small, fontFamily:"monospace", color:cfg.primary_color, fontWeight:700 }}>{r.n}</td>
                        <td style={{ padding: cfg.compact_tables==="true" ? "4px 10px" : "8px 12px", fontSize:cfg.font_size_base, color:cfg.text_primary }}>{r.t}</td>
                        <td style={{ padding: cfg.compact_tables==="true" ? "4px 10px" : "8px 12px" }}>
                          {cfg.show_status_chips === "true" ? (
                            <span style={{ padding:"2px 7px", borderRadius:20, fontSize:9, fontWeight:700,
                              background: r.s==="Approved" ? "#dcfce7" : r.s==="Pending" ? "#fef3c7" : "#f1f5f9",
                              color: r.s==="Approved" ? cfg.success_color : r.s==="Pending" ? cfg.warning_color : "#64748b" }}>
                              {r.s}
                            </span>
                          ) : <span style={{ fontSize:cfg.font_size_small, color:cfg.text_secondary }}>{r.s}</span>}
                        </td>
                        <td style={{ padding: cfg.compact_tables==="true" ? "4px 10px" : "8px 12px", fontSize:cfg.font_size_base, color:cfg.text_primary, fontWeight:600 }}>{r.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Button preview */}
              <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                {[
                  { l:"New Requisition", bg:cfg.primary_color },
                  { l:"Export", bg:cfg.accent_color },
                  { l:"Cancel", bg:"#f1f5f9", color:cfg.text_secondary },
                ].map(b => (
                  <div key={b.l} style={{ padding:"7px 14px", borderRadius:cfg.border_radius, background:b.bg, color:b.color||"#fff", fontSize:cfg.font_size_base, fontWeight:Number(cfg.font_weight_bold), cursor:"pointer", fontFamily:cfg.font_family }}>
                    {b.l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
