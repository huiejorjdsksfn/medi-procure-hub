/**
 * EL5 MediProcure — Stamp Design Studio
 * Styled after Microsoft Office 365 portal:
 *   • Teal hero header with greeting + search
 *   • O365 app-tile grid (one tile per stamp status)
 *   • Right-panel editor with live preview
 *   • Persists custom configs to system_settings table
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DocumentStamp } from "@/components/DocumentStamp";
import { broadcastToAll } from "@/lib/broadcast";
import {
  Search, RefreshCw, Download, Upload, RotateCcw,
  Save, Eye, Palette, Settings, Home, ChevronRight, X,
  Printer, Star, Type, CircleOff, CheckCircle2, Image as ImageIcon, Trash2,
} from "lucide-react";

const db = supabase as any;

/* ── Default stamp configs (mirrors DocumentStamp CFG) ─────────────── */
const DEFAULT_CFG: Record<string, StampDef> = {
  approved:     { ink:"#0d4f1c", label:"APPROVED",     topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"PROCUREMENT AUTHORITY", star:true  },
  rejected:     { ink:"#8b0000", label:"REJECTED",     topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"NOT APPROVED",          star:false },
  pending:      { ink:"#7a3e00", label:"PENDING",      topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"AWAITING APPROVAL",     star:false },
  submitted:    { ink:"#7a3e00", label:"SUBMITTED",    topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"FOR REVIEW",            star:false },
  received:     { ink:"#003366", label:"RECEIVED",     topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"GOODS & SERVICES",      star:true  },
  issued:       { ink:"#2e006b", label:"ISSUED",       topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"FINANCE DEPARTMENT",    star:true  },
  draft:        { ink:"#3d3d3d", label:"DRAFT",        topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"NOT FINAL",             star:false },
  ordered:      { ink:"#004a5c", label:"ORDERED",      topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"PROCUREMENT DEPT",      star:true  },
  partial:      { ink:"#4a006b", label:"PARTIAL",      topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"PARTIALLY RECEIVED",    star:false },
  sent:         { ink:"#003366", label:"SENT",         topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"TO SUPPLIER",           star:false },
  cancelled:    { ink:"#6b0000", label:"CANCELLED",    topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"VOID — NOT VALID",      star:false },
  published:    { ink:"#0d4f1c", label:"PUBLISHED",    topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"OPEN FOR BIDS",         star:true  },
  closed:       { ink:"#3d3d3d", label:"CLOSED",       topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"BIDDING CLOSED",        star:false },
  awarded:      { ink:"#003366", label:"AWARDED",      topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"CONTRACT AWARDED",      star:true  },
  active:       { ink:"#0d4f1c", label:"ACTIVE",       topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"IN FORCE",              star:true  },
  expired:      { ink:"#8b0000", label:"EXPIRED",      topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"CONTRACT ENDED",        star:false },
  verified:     { ink:"#003d6b", label:"VERIFIED",     topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"QUALITY VERIFIED",      star:true  },
  official:     { ink:"#1a006b", label:"OFFICIAL",     topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"OFFICIAL USE ONLY",     star:true  },
  confidential: { ink:"#4a006b", label:"CONFIDENTIAL", topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"RESTRICTED ACCESS",     star:false },
  urgent:       { ink:"#8b2800", label:"URGENT",       topArc:"EMBU LEVEL 5 HOSPITAL", botArc:"IMMEDIATE ACTION",      star:false },
};

interface StampDef {
  ink:    string; label: string; topArc: string; botArc: string; star: boolean;
  ringColor?:  string;   // outer ring + institution-name arc colour
  labelColor?: string;   // centre label + date block colour
  imageUrl?:   string;   // admin-uploaded image, replaces the vector stamp entirely
}

/* ── O365 design tokens ─────────────────────────────────────────────── */
const O = {
  hero:"#107C73", topBar:"#0a5a52", white:"#ffffff",
  bg:"#f3f2f1", card:"#ffffff", border:"#edebe9",
  text:"#323130", textSub:"#605e5c", textMt:"#a19f9d",
  blue:"#0078d4", shadow:"0 1.6px 3.6px rgba(0,0,0,.13)",
  shadowHov:"0 6.4px 14.4px rgba(0,0,0,.18)",
  font:"'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

const QUICK_TILES = [
  { label:"Preview All",    I:Eye,       color:"#0078d4", action:"preview"  },
  { label:"Reset Defaults", I:RotateCcw, color:"#a4262c", action:"reset"    },
  { label:"Export JSON",    I:Download,  color:"#038387", action:"export"    },
  { label:"Import JSON",    I:Upload,    color:"#498205", action:"import"    },
  { label:"Print Sample",   I:Printer,   color:"#8764b8", action:"print"    },
  { label:"Settings",       I:Settings,  color:"#ca5010", action:"settings" },
];

/* ══════════════════════════════════════════════════════════════════════ */
export default function StampDesignPage() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [configs, setConfigs]   = useState<Record<string, StampDef>>({ ...DEFAULT_CFG });
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft]       = useState<StampDef | null>(null);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [previewAll, setPreviewAll] = useState(false);

  /* load custom overrides from system_settings */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await db
        .from("system_settings")
        .select("key,value")
        .like("key", "stamp_cfg_%");
      if (data?.length) {
        const overrides: Record<string, StampDef> = {};
        for (const row of data) {
          const status = row.key.replace("stamp_cfg_", "");
          try { overrides[status] = JSON.parse(row.value); } catch {}
        }
        setConfigs(prev => ({ ...prev, ...overrides }));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* handle a custom stamp image upload — read as base64, size-guarded */
  const MAX_UPLOAD_BYTES = 250 * 1024; // 250KB raw — keeps the base64 string reasonable for a text column
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "Image too large", description: "Please use an image under 250KB (try cropping/compressing it first).", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft(d => d ? { ...d, imageUrl: reader.result as string } : d);
    };
    reader.onerror = () => toast({ title: "Could not read that image", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  /* open editor for a stamp */
  const openEditor = (status: string) => {
    setSelected(status);
    setDraft({ ...configs[status] });
  };

  /* save one stamp config to system_settings */
  const save = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      await db.from("system_settings").upsert(
        { key: `stamp_cfg_${selected}`, value: JSON.stringify(draft) },
        { onConflict: "key" }
      );
      setConfigs(prev => ({ ...prev, [selected]: { ...draft } }));
      toast({ title: `✓ ${selected.toUpperCase()} stamp saved` });
      broadcastToAll({
        title: "Stamp Design Updated",
        message: `${selected.toUpperCase()} stamp was customized by ${profile?.full_name || "Admin"}.`,
        type: "info",
      }).catch(() => { /* non-critical — the save itself already succeeded */ });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  /* reset one stamp to default */
  const resetOne = async () => {
    if (!selected) return;
    const def = DEFAULT_CFG[selected];
    setDraft({ ...def });
    setSaving(true);
    try {
      await db.from("system_settings").delete().eq("key", `stamp_cfg_${selected}`);
      setConfigs(prev => ({ ...prev, [selected]: { ...def } }));
      toast({ title: `✓ ${selected.toUpperCase()} reset to default` });
    } catch {}
    setSaving(false);
  };

  /* reset ALL stamps to defaults */
  const resetAll = async () => {
    if (!confirm("Reset ALL stamp designs to factory defaults?")) return;
    setSaving(true);
    try {
      await db.from("system_settings").delete().like("key", "stamp_cfg_%");
      setConfigs({ ...DEFAULT_CFG });
      setDraft(null); setSelected(null);
      toast({ title: "✓ All stamps reset to defaults" });
      broadcastToAll({
        title: "Stamp Designs Reset",
        message: `All stamp designs were reset to factory defaults by ${profile?.full_name || "Admin"}.`,
        type: "warning",
      }).catch(() => {});
    } catch {}
    setSaving(false);
  };

  /* export all configs as JSON */
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(configs, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `EL5-stamp-designs-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✓ Stamp designs exported" });
  };

  /* import JSON file */
  const importJSON = () => {
    const inp = document.createElement("input");
    inp.type  = "file"; inp.accept = ".json";
    inp.onchange = async () => {
      const file = inp.files?.[0]; if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Record<string, StampDef>;
        for (const [status, cfg] of Object.entries(data)) {
          if (!DEFAULT_CFG[status]) continue;
          await db.from("system_settings").upsert(
            { key: `stamp_cfg_${status}`, value: JSON.stringify(cfg) },
            { onConflict: "key" }
          );
        }
        setConfigs(prev => ({ ...prev, ...data }));
        toast({ title: `✓ Imported ${Object.keys(data).length} stamp designs` });
      } catch { toast({ title: "Invalid JSON file", variant: "destructive" }); }
    };
    inp.click();
  };

  const handleQuickTile = (action: string) => {
    if (action === "preview")  setPreviewAll(p => !p);
    if (action === "reset")    resetAll();
    if (action === "export")   exportJSON();
    if (action === "import")   importJSON();
    if (action === "settings") nav("/settings");
    if (action === "print") {
      window.print();
    }
  };

  const statuses = Object.keys(DEFAULT_CFG).filter(s =>
    !search || s.includes(search.toLowerCase()) ||
    (configs[s]?.label || "").toLowerCase().includes(search.toLowerCase())
  );

  const isModified = (s: string) => {
    const d = DEFAULT_CFG[s];
    const c = configs[s];
    return JSON.stringify(d) !== JSON.stringify(c);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div style={{ background: O.bg, minHeight:"100vh", fontFamily:O.font, color:O.text }}>

      {/* ── Top bar (O365 style) ─────────────────────────────────────── */}
      <div style={{ background:O.topBar, height:44, display:"flex", alignItems:"center", padding:"0 20px", gap:10 }}>
        <button onClick={()=>nav(-1)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.7)", display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
          <Home size={13}/> Admin
        </button>
        <ChevronRight size={10} color="rgba(255,255,255,.5)"/>
        <span style={{ color:O.white, fontWeight:700, fontSize:13 }}>Stamp Design Studio</span>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 12px", background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)", borderRadius:3, color:O.white, fontSize:11, fontWeight:600, cursor:"pointer" }}>
            <RefreshCw size={11} style={{ animation:loading?"spin 1s linear infinite":"none" }}/> Refresh
          </button>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:O.white, fontWeight:700, fontSize:11 }}>{(profile?.full_name||"A").charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* ── O365 teal hero ──────────────────────────────────────────── */}
      <div style={{ background:O.hero, padding:"30px 24px 36px" }}>
        <h1 style={{ color:O.white, fontSize:26, fontWeight:300, margin:"0 0 6px", letterSpacing:"-.02em" }}>
          {greeting}, {profile?.full_name?.split(" ")[0] || "Administrator"}
        </h1>
        <p style={{ color:"rgba(255,255,255,.75)", margin:"0 0 18px", fontSize:13 }}>
          Stamp Design Studio · Customise official procurement stamps
        </p>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, maxWidth:360 }}>
            <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:O.textMt, pointerEvents:"none" }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stamp types…"
              style={{ width:"100%", padding:"9px 16px 9px 32px", border:"1px solid rgba(255,255,255,.4)", borderRadius:2, fontSize:13, background:O.white, color:O.text, outline:"none", boxSizing:"border-box", fontFamily:O.font }}/>
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:O.textMt, fontSize:16, lineHeight:1 }}>×</button>}
          </div>
          <span style={{ color:"rgba(255,255,255,.6)", fontSize:12 }}>
            {statuses.filter(s=>isModified(s)).length} customised · {statuses.length} total
          </span>
        </div>
      </div>

      <div style={{ padding:"0 20px 32px" }}>

        {/* ── Quick action tiles (O365 "Use the online apps") ─────── */}
        <div style={{ marginTop:18, marginBottom:26 }}>
          <p style={{ fontSize:12, color:O.textSub, margin:"0 0 12px" }}>Quick actions</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {QUICK_TILES.map(t => (
              <button key={t.action} onClick={()=>handleQuickTile(t.action)}
                style={{ width:84, height:84, background:t.color, border:"none", borderRadius:2, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:7, cursor:"pointer", boxShadow:O.shadow, transition:"opacity .15s,transform .15s" }}
                onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity=".85"; el.style.transform="translateY(-2px)"; }}
                onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity="1";   el.style.transform="none"; }}>
                <t.I size={22} color={O.white} strokeWidth={1.5}/>
                <span style={{ color:O.white, fontSize:10, fontWeight:700, textAlign:"center", lineHeight:1.2, padding:"0 4px" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div style={{ borderTop:`1px solid ${O.border}`, marginBottom:18 }}/>

        {/* ── Main content: stamp grid + editor ─────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap:16 }}>

          {/* Stamp tile grid */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <p style={{ fontSize:12, color:O.textSub, margin:0 }}>
                {previewAll ? "All stamp designs — live preview" : "Select a stamp to customise"}
              </p>
              <span style={{ fontSize:11, color:O.textMt }}>Click to edit</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
              {statuses.map(status => {
                const cfg  = configs[status] || DEFAULT_CFG[status];
                const mod  = isModified(status);
                const isSelected = selected === status;
                return (
                  <button key={status} onClick={()=>openEditor(status)}
                    style={{
                      background:O.card, border:`2px solid ${isSelected ? cfg.ink : mod ? `${cfg.ink}60` : O.border}`,
                      borderRadius:4, padding:"14px 10px 10px", cursor:"pointer", textAlign:"center",
                      boxShadow: isSelected ? `0 0 0 3px ${cfg.ink}30,${O.shadowHov}` : O.shadow,
                      transition:"all .15s", position:"relative",
                    }}
                    onMouseEnter={e=>{ if(!isSelected)(e.currentTarget as HTMLElement).style.boxShadow=O.shadowHov; }}
                    onMouseLeave={e=>{ if(!isSelected)(e.currentTarget as HTMLElement).style.boxShadow=O.shadow; }}>

                    {/* Modified badge */}
                    {mod && (
                      <span style={{ position:"absolute", top:6, right:7, fontSize:8, fontWeight:700, padding:"1px 5px", borderRadius:99, background:`${cfg.ink}22`, color:cfg.ink, border:`1px solid ${cfg.ink}44` }}>
                        CUSTOM
                      </span>
                    )}

                    {/* Live stamp preview */}
                    <div style={{ display:"flex", justifyContent:"center", pointerEvents:"none" }}>
                      <DocumentStamp status={status} size={previewAll ? 100 : 80} rotate={-10} worn date={new Date().toISOString()}/>
                    </div>

                    {/* Status label */}
                    <div style={{ fontSize:11, fontWeight:800, color:cfg.ink, textTransform:"uppercase", marginTop:8, letterSpacing:".04em" }}>
                      {status}
                    </div>
                    <div style={{ fontSize:9, color:O.textMt, marginTop:2 }}>{cfg.botArc.slice(0,22)}</div>
                  </button>
                );
              })}
            </div>

            {statuses.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color:O.textMt }}>
                <Search size={28} style={{ opacity:.3 }}/>
                <div style={{ marginTop:10, fontSize:13 }}>No stamps match "{search}"</div>
              </div>
            )}
          </div>

          {/* ── Editor panel (O365 task-pane style) ─────────────── */}
          {selected && draft && (
            <div style={{ background:O.card, border:`1px solid ${O.border}`, borderRadius:4, boxShadow:O.shadowHov, height:"fit-content", position:"sticky", top:16 }}>

              {/* Panel header */}
              <div style={{ padding:"12px 16px", background:draft.ink, display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"3px 3px 0 0" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:O.white }}>{selected.toUpperCase()} Stamp</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.7)" }}>Edit design properties</div>
                </div>
                <button onClick={()=>{ setSelected(null); setDraft(null); }} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:3, padding:"4px 8px", cursor:"pointer", color:O.white, lineHeight:1 }}>
                  <X size={13}/>
                </button>
              </div>

              {/* Live preview — reflects unsaved edits via previewOverride */}
              <div style={{ padding:"18px 0 10px", display:"flex", justifyContent:"center", background:`${draft.ink}08`, borderBottom:`1px solid ${O.border}` }}>
                <DocumentStamp
                  status={selected}
                  size={130} rotate={-12} worn date={new Date().toISOString()}
                  previewOverride={draft}
                  key={JSON.stringify(draft)}
                />
              </div>
              <div style={{ textAlign:"center", fontSize:9, color:O.textMt, paddingTop:4 }}>Live preview</div>

              {/* Fields */}
              <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>

                {/* Custom stamp image upload */}
                <div style={{ padding:10, border:`1px dashed ${draft.imageUrl?O.blue:O.border}`, borderRadius:5, background: draft.imageUrl?`${O.blue}08`:"transparent" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
                    <ImageIcon size={12}/> Upload Your Own Stamp Image
                  </label>
                  {draft.imageUrl ? (
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <img src={draft.imageUrl} alt="Custom stamp" style={{ width:56, height:56, objectFit:"contain", border:`1px solid ${O.border}`, borderRadius:4, background:"#fff" }}/>
                      <div style={{ flex:1, fontSize:11, color:O.textMt }}>
                        Using your uploaded image. The fields below (label, arc text, star, colours) are ignored while this is set.
                      </div>
                      <button onClick={()=>setDraft(d=>d?{...d,imageUrl:undefined}:d)}
                        title="Remove uploaded image"
                        style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 10px", background:"#fff", border:`1px solid ${O.border}`, borderRadius:4, cursor:"pointer", color:"#a4262c", fontSize:11, fontWeight:700, flexShrink:0 }}>
                        <Trash2 size={12}/> Remove
                      </button>
                    </div>
                  ) : (
                    <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 12px", border:`1px solid ${O.border}`, borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600, color:O.textSub, background:"#fff" }}>
                      <Upload size={13}/> Choose image (PNG/JPG, under 250KB)
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display:"none" }}
                        onChange={e=>{ const f=e.target.files?.[0]; if(f) handleImageUpload(f); e.target.value=""; }}/>
                    </label>
                  )}
                </div>

                {/* Ring & institution-text colour */}
                <div style={{ opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
                    <Palette size={12}/> Ring &amp; Institution Text Colour
                  </label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="color" value={draft.ringColor||"#0a3d8f"}
                      onChange={e=>setDraft(d=>d?{...d,ringColor:e.target.value}:d)}
                      style={{ width:44, height:32, border:"1px solid #e5e7eb", borderRadius:3, cursor:"pointer", padding:2 }}/>
                    <input type="text" value={draft.ringColor||"#0a3d8f"}
                      onChange={e=>/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)&&setDraft(d=>d?{...d,ringColor:e.target.value}:d)}
                      style={{ flex:1, padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:3, fontSize:12, fontFamily:"monospace", outline:"none" }}/>
                  </div>
                  <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                    {["#0a3d8f","#003366","#1a006b","#004a5c","#0c2d6b","#1e3a8a"].map(c=>(
                      <button key={c} onClick={()=>setDraft(d=>d?{...d,ringColor:c}:d)}
                        style={{ width:22, height:22, background:c, border: draft.ringColor===c?"3px solid #111":"1px solid rgba(0,0,0,.15)", borderRadius:2, cursor:"pointer" }}
                        title={c}/>
                    ))}
                  </div>
                </div>

                {/* Label & date colour */}
                <div style={{ opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
                    <Palette size={12}/> Label &amp; Date Colour
                  </label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="color" value={draft.labelColor||"#c81e2c"}
                      onChange={e=>setDraft(d=>d?{...d,labelColor:e.target.value}:d)}
                      style={{ width:44, height:32, border:"1px solid #e5e7eb", borderRadius:3, cursor:"pointer", padding:2 }}/>
                    <input type="text" value={draft.labelColor||"#c81e2c"}
                      onChange={e=>/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)&&setDraft(d=>d?{...d,labelColor:e.target.value}:d)}
                      style={{ flex:1, padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:3, fontSize:12, fontFamily:"monospace", outline:"none" }}/>
                  </div>
                  <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                    {["#c81e2c","#8b0000","#a4262c","#7a0c1e","#9a1b1b","#b91c1c"].map(c=>(
                      <button key={c} onClick={()=>setDraft(d=>d?{...d,labelColor:c}:d)}
                        style={{ width:22, height:22, background:c, border: draft.labelColor===c?"3px solid #111":"1px solid rgba(0,0,0,.15)", borderRadius:2, cursor:"pointer" }}
                        title={c}/>
                    ))}
                  </div>
                </div>

                {/* Glow tint (legacy "ink" field — only affects the drop-shadow behind the stamp) */}
                <div style={{ opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
                    <Palette size={12}/> Glow Tint <span style={{fontWeight:400,color:O.textMt}}>(behind the stamp only)</span>
                  </label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="color" value={draft.ink}
                      onChange={e=>setDraft(d=>d?{...d,ink:e.target.value}:d)}
                      style={{ width:44, height:32, border:"1px solid #e5e7eb", borderRadius:3, cursor:"pointer", padding:2 }}/>
                    <input type="text" value={draft.ink}
                      onChange={e=>/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)&&setDraft(d=>d?{...d,ink:e.target.value}:d)}
                      style={{ flex:1, padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:3, fontSize:12, fontFamily:"monospace", outline:"none" }}/>
                  </div>
                  {/* Preset swatches */}
                  <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                    {["#0d4f1c","#8b0000","#7a3e00","#003366","#2e006b","#3d3d3d","#004a5c","#6b0000","#1a006b","#8b2800"].map(c=>(
                      <button key={c} onClick={()=>setDraft(d=>d?{...d,ink:c}:d)}
                        style={{ width:22, height:22, background:c, border: draft.ink===c?"3px solid #111":"1px solid rgba(0,0,0,.15)", borderRadius:2, cursor:"pointer" }}
                        title={c}/>
                    ))}
                  </div>
                </div>

                {/* Label */}
                <div style={{ opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
                    <Type size={12}/> Centre Label
                  </label>
                  <input value={draft.label} onChange={e=>setDraft(d=>d?{...d,label:e.target.value.toUpperCase().slice(0,14)}:d)}
                    placeholder="e.g. APPROVED"
                    style={{ width:"100%", padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:3, fontSize:13, fontWeight:800, fontFamily:"'Arial Black',Arial", outline:"none", boxSizing:"border-box", color:draft.ink }}/>
                  <div style={{ fontSize:9, color:O.textMt, marginTop:3 }}>Max 14 characters · auto upper-case</div>
                </div>

                {/* Top arc */}
                <div style={{ opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, marginBottom:5, display:"block" }}>Top Arc Text</label>
                  <input value={draft.topArc} onChange={e=>setDraft(d=>d?{...d,topArc:e.target.value.toUpperCase().slice(0,30)}:d)}
                    style={{ width:"100%", padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:3, fontSize:12, outline:"none", boxSizing:"border-box" }}/>
                </div>

                {/* Bottom arc */}
                <div style={{ opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color:O.textSub, marginBottom:5, display:"block" }}>Bottom Arc Text</label>
                  <input value={draft.botArc} onChange={e=>setDraft(d=>d?{...d,botArc:e.target.value.toUpperCase().slice(0,30)}:d)}
                    style={{ width:"100%", padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:3, fontSize:12, outline:"none", boxSizing:"border-box" }}/>
                </div>

                {/* Star toggle */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:O.bg, borderRadius:3, opacity: draft.imageUrl?0.4:1, pointerEvents: draft.imageUrl?"none":"auto" }}>
                  <label style={{ fontSize:12, fontWeight:600, color:O.text, display:"flex", alignItems:"center", gap:6 }}>
                    <Star size={13} color={draft.ink}/> Show ★ star decorators
                  </label>
                  <button onClick={()=>setDraft(d=>d?{...d,star:!d.star}:d)}
                    style={{ width:44, height:24, borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"background .2s",
                      background: draft.star ? draft.ink : "#d1d5db" }}>
                    <div style={{ position:"absolute", top:2, left: draft.star ? 22 : 2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.3)" }}/>
                  </button>
                </div>

                {/* Action buttons */}
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button onClick={save} disabled={saving}
                    style={{ flex:1, padding:"10px 0", background:draft.ink, color:O.white, border:"none", borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, opacity:saving?.7:1 }}>
                    <Save size={13}/>{saving?"Saving…":"Save Stamp"}
                  </button>
                  <button onClick={resetOne} disabled={saving}
                    style={{ padding:"10px 12px", background:"transparent", color:O.textSub, border:`1px solid ${O.border}`, borderRadius:3, fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    <RotateCcw size={12}/> Reset
                  </button>
                </div>

                {isModified(selected) && (
                  <div style={{ padding:"8px 10px", background:"#fef3c7", border:"1px solid #fcd34d", borderRadius:3, fontSize:11, color:"#92400e", display:"flex", alignItems:"center", gap:6 }}>
                    <Star size={11} color="#92400e"/> This stamp has custom settings
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Preview all modal overlay ─────────────────────────── */}
        {previewAll && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:999, overflowY:"auto", padding:"32px 20px" }}
            onClick={()=>setPreviewAll(false)}>
            <div style={{ maxWidth:900, margin:"0 auto", background:O.white, borderRadius:6, padding:24, boxShadow:"0 24px 80px rgba(0,0,0,.4)" }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:O.text }}>All Stamp Designs — Full Preview</div>
                  <div style={{ fontSize:12, color:O.textMt }}>EL5 MediProcure · Embu Level 5 Hospital</div>
                </div>
                <button onClick={()=>setPreviewAll(false)} style={{ background:"none", border:"none", cursor:"pointer", color:O.textMt, fontSize:22, lineHeight:1 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:16 }}>
                {Object.keys(DEFAULT_CFG).map(s=>(
                  <div key={s} style={{ textAlign:"center", padding:"10px 0" }}>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <DocumentStamp status={s} size={100} rotate={-10} worn date={new Date().toISOString()}/>
                    </div>
                    <div style={{ fontSize:10, fontWeight:700, color:configs[s]?.ink||"#333", textTransform:"uppercase", marginTop:6 }}>{s}</div>
                    {isModified(s) && <div style={{ fontSize:9, color:O.blue, marginTop:2 }}>● CUSTOM</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── "Recent changes" (O365 recent documents style) ───── */}
        <div style={{ marginTop:24 }}>
          <div style={{ borderTop:`1px solid ${O.border}`, paddingTop:18, marginBottom:12, display:"flex", justifyContent:"space-between" }}>
            <p style={{ fontSize:12, color:O.textSub, margin:0 }}>Customised stamp designs</p>
            <span style={{ fontSize:11, color:O.textMt }}>Last saved</span>
          </div>
          {Object.keys(DEFAULT_CFG).filter(isModified).length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:O.textMt, fontSize:12 }}>
              <CheckCircle2 size={24} color="#107c10" style={{ opacity:.5 }}/>
              <div style={{ marginTop:8 }}>All stamps using factory defaults</div>
            </div>
          ) : (
            <div style={{ background:O.card, border:`1px solid ${O.border}`, borderRadius:3, boxShadow:O.shadow }}>
              {Object.keys(DEFAULT_CFG).filter(isModified).map((s,i,arr)=>{
                const c = configs[s];
                return (
                  <div key={s}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderBottom:i<arr.length-1?`1px solid ${O.border}`:"none", cursor:"pointer", transition:"background .1s" }}
                    onClick={()=>openEditor(s)}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#f7f7f7"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                    <div style={{ width:32, height:32, borderRadius:2, background:c.ink, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Palette size={15} color={O.white} strokeWidth={1.5}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:O.blue, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {s.toUpperCase()} — {c.label}
                      </div>
                      <div style={{ fontSize:11, color:O.textMt, marginTop:1 }}>
                        EL5 MediProcure » Stamps » {s} · ink {c.ink} · {c.star?"★ stars":"no stars"}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:c.ink, fontWeight:700, flexShrink:0, padding:"2px 8px", borderRadius:99, background:`${c.ink}14`, border:`1px solid ${c.ink}40` }}>CUSTOM</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
