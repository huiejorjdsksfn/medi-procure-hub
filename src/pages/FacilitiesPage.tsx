/**
 * FacilitiesPage — Admin management of all facilities / sub-locations
 * Covers: Embu L5H (main), Runyenjes, Ishiara, Mitheru, Kagaari, etc.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Building2, Plus, Edit2, Trash2, MapPin, Phone, Mail, RefreshCw,
  X, Save, Globe, Users, Shield, Star, ChevronRight, CheckCircle
} from "lucide-react";
import { Facility } from "@/contexts/FacilityContext";

const LEVELS = ["2","3","4","5","6"];
const TYPES  = ["hospital","health_centre","dispensary","clinic","nursing_home"];

export default function FacilitiesPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState<Facility | null>(null);
  const [saving, setSaving]           = useState(false);

  const EMPTY: Partial<Facility> = {
    code:"", name:"", short_name:"", location:"", type:"hospital",
    level:"4", county:"Embu", sub_county:"", address:"", phone:"",
    email:"", primary_color:"#0a2558", accent_color:"#C45911",
    is_active:true, is_main:false,
  };
  const [form, setForm] = useState<Partial<Facility>>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("facilities").select("*").order("is_main", { ascending:false }).order("name");
    setFacilities(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = (supabase as any).channel("facilities-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"facilities" }, () => load())
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (f: Facility) => { setEditing(f); setForm({...f}); setShowForm(true); };

  const save = async () => {
    if (!form.code?.trim()) { toast({ title:"Code is required", variant:"destructive" }); return; }
    if (!form.name?.trim()) { toast({ title:"Name is required", variant:"destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await (supabase as any).from("facilities").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editing.id);
        toast({ title:"Facility updated ✓" });
      } else {
        await (supabase as any).from("facilities").insert({ ...form });
        toast({ title:"Facility added ✓" });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      toast({ title:"Save failed", description: e.message, variant:"destructive" });
    }
    setSaving(false);
  };

  const del = async (f: Facility) => {
    if (f.is_main) { toast({ title:"Cannot delete main facility", variant:"destructive" }); return; }
    if (!confirm(`Delete ${f.name}?`)) return;
    await (supabase as any).from("facilities").update({ is_active:false }).eq("id", f.id);
    toast({ title:"Facility deactivated" });
    load();
  };

  const inp: React.CSSProperties = { width:"100%", padding:"8px 10px", border:"1.5px solid #e2e8f0", borderRadius:7, fontSize:12.5, outline:"none", background:"#fff", color:"#1e293b", boxSizing:"border-box" as const };
  const lbl: React.CSSProperties = { display:"block" as const, fontSize:9.5, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.06em", color:"#64748b", marginBottom:4 };

  const typeColors: Record<string,string> = {
    hospital:"#1e3a6b", health_centre:"#065f46", dispensary:"#7c2d12", clinic:"#4c1d95", nursing_home:"#0f766e"
  };

  return (
    <div style={{ padding:16, display:"flex" as const, flexDirection:"column" as const, gap:12, fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f8fafc", minHeight:"100%" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.fac-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.12)!important;transform:translateY(-1px)}`}</style>

      {/* Header */}
      <div style={{ borderRadius:12, background:"linear-gradient(90deg,#0a2558,#1a3a6b)", padding:"12px 18px", display:"flex" as const, alignItems:"center" as const, justifyContent:"space-between" as const, boxShadow:"0 4px 16px rgba(26,58,107,0.3)" }}>
        <div style={{ display:"flex" as const, alignItems:"center" as const, gap:10 }}>
          <Building2 style={{ width:20, height:20, color:"#fff" }}/>
          <div>
            <h1 style={{ fontSize:15, fontWeight:900, color:"#fff", margin:0 }}>Health Facilities</h1>
            <p style={{ fontSize:10, color:"rgba(255,255,255,0.5)", margin:0 }}>Embu County Government — {facilities.length} facilities</p>
          </div>
        </div>
        <div style={{ display:"flex" as const, gap:8 }}>
          <button onClick={load} style={{ padding:"6px 10px", borderRadius:8, background:"rgba(255,255,255,0.15)", color:"#fff", border:"none", cursor:"pointer" as const }}>
            <RefreshCw style={{ width:14, height:14, animation:loading?"spin 1s linear infinite":"none" }}/>
          </button>
          {isAdmin && (
            <button onClick={openNew} style={{ display:"flex" as const, alignItems:"center" as const, gap:6, padding:"6px 14px", borderRadius:8, background:"#fff", color:"#0a2558", border:"none", cursor:"pointer" as const, fontSize:12, fontWeight:700 }}>
              <Plus style={{ width:14, height:14 }}/>Add Facility
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display:"grid" as const, gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {[
          { label:"Total Facilities", val:facilities.length,                                   bg:"#0a2558" },
          { label:"Hospitals",        val:facilities.filter(f=>f.type==="hospital").length,    bg:"#065f46" },
          { label:"Health Centres",   val:facilities.filter(f=>f.type==="health_centre").length, bg:"#7c2d12" },
          { label:"Active",           val:facilities.filter(f=>f.is_active).length,            bg:"#4c1d95" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius:10, padding:"10px 14px", background:k.bg, color:"#fff", boxShadow:"0 2px 8px rgba(0,0,0,0.12)" }}>
            <div style={{ fontSize:22, fontWeight:900 }}>{k.val}</div>
            <div style={{ fontSize:10, opacity:0.75, marginTop:3, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Facilities grid */}
      <div style={{ display:"grid" as const, gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
        {loading ? (
          Array(4).fill(0).map((_,i) => (
            <div key={i} style={{ borderRadius:12, background:"#fff", border:"1px solid #e2e8f0", padding:18, height:160 }}>
              <div style={{ height:12, background:"#e2e8f0", borderRadius:4, marginBottom:8, width:"60%" }}/>
              <div style={{ height:10, background:"#f1f5f9", borderRadius:4, marginBottom:6 }}/>
              <div style={{ height:10, background:"#f1f5f9", borderRadius:4, width:"80%" }}/>
            </div>
          ))
        ) : facilities.map(f => (
          <div key={f.id} className="fac-card"
            style={{ borderRadius:12, background:"#fff", border:`1px solid #e2e8f0`,
              borderTop:`4px solid ${f.primary_color}`, padding:18,
              transition:"all 0.15s", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
              opacity:f.is_active ? 1 : 0.6 }}>
            {/* Card header */}
            <div style={{ display:"flex" as const, alignItems:"flex-start" as const, justifyContent:"space-between" as const, marginBottom:12 }}>
              <div style={{ display:"flex" as const, gap:10, alignItems:"flex-start" as const }}>
                <div style={{ width:40, height:40, borderRadius:10, background:f.primary_color,
                  display:"flex" as const, alignItems:"center" as const, justifyContent:"center" as const, flexShrink:0 }}>
                  <span style={{ fontSize:12, fontWeight:900, color:"#fff" }}>{f.code}</span>
                </div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:800, color:"#1e293b", lineHeight:1.2 }}>{f.name}</div>
                  <div style={{ display:"flex" as const, gap:6, marginTop:4, flexWrap:"wrap" as const }}>
                    <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:20,
                      background: typeColors[f.type] || "#1e3a6b", color:"#fff" }}>
                      {f.type.replace("_"," ").toUpperCase()}
                    </span>
                    <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:20, background:"#dbeafe", color:"#1d4ed8" }}>
                      LEVEL {f.level}
                    </span>
                    {f.is_main && (
                      <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:20, background:"#dcfce7", color:"#166534" }}>
                        ★ MAIN
                      </span>
                    )}
                    {!f.is_active && (
                      <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:20, background:"#fee2e2", color:"#dc2626" }}>
                        INACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display:"flex" as const, gap:4 }}>
                  <button onClick={() => openEdit(f)} style={{ padding:5, borderRadius:6, background:"#eff6ff", color:"#2563eb", border:"none", cursor:"pointer" as const }}>
                    <Edit2 style={{ width:12, height:12 }}/>
                  </button>
                  {!f.is_main && (
                    <button onClick={() => del(f)} style={{ padding:5, borderRadius:6, background:"#fee2e2", color:"#dc2626", border:"none", cursor:"pointer" as const }}>
                      <Trash2 style={{ width:12, height:12 }}/>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Info rows */}
            <div style={{ display:"flex" as const, flexDirection:"column" as const, gap:5 }}>
              <div style={{ display:"flex" as const, alignItems:"center" as const, gap:7, fontSize:12, color:"#64748b" }}>
                <MapPin style={{ width:12, height:12, color:"#94a3b8", flexShrink:0 }}/>
                {f.location}{f.sub_county ? `, ${f.sub_county}` : ""} Sub-County
              </div>
              {f.phone && (
                <div style={{ display:"flex" as const, alignItems:"center" as const, gap:7, fontSize:12, color:"#64748b" }}>
                  <Phone style={{ width:12, height:12, color:"#94a3b8", flexShrink:0 }}/>
                  {f.phone}
                </div>
              )}
              {f.email && (
                <div style={{ display:"flex" as const, alignItems:"center" as const, gap:7, fontSize:12, color:"#64748b" }}>
                  <Mail style={{ width:12, height:12, color:"#94a3b8", flexShrink:0 }}/>
                  {f.email}
                </div>
              )}
              {f.address && (
                <div style={{ display:"flex" as const, alignItems:"center" as const, gap:7, fontSize:11, color:"#94a3b8" }}>
                  <Globe style={{ width:11, height:11, color:"#cbd5e1", flexShrink:0 }}/>
                  {f.address}
                </div>
              )}
            </div>

            {/* Color swatches */}
            <div style={{ display:"flex" as const, gap:4, marginTop:10, alignItems:"center" as const }}>
              <div style={{ width:16, height:16, borderRadius:4, background:f.primary_color, border:"1px solid #e2e8f0" }} title={`Primary: ${f.primary_color}`}/>
              <div style={{ width:16, height:16, borderRadius:4, background:f.accent_color,  border:"1px solid #e2e8f0" }} title={`Accent: ${f.accent_color}`}/>
              <span style={{ fontSize:10, color:"#94a3b8", marginLeft:4 }}>{f.primary_color} / {f.accent_color}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ ADD/EDIT MODAL ═══ */}
      {showForm && (
        <div style={{ position:"fixed" as const, inset:0, zIndex:1000, display:"flex" as const, alignItems:"flex-start" as const, justifyContent:"center" as const, paddingTop:24, paddingBottom:24, overflowY:"auto" as const }}>
          <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,0.5)" }} onClick={() => setShowForm(false)}/>
          <div style={{ position:"relative" as const, background:"#fff", borderRadius:16, width:"min(680px,97%)", boxShadow:"0 24px 80px rgba(0,0,0,0.2)", border:"1px solid #e2e8f0", overflow:"hidden" as const }}>
            {/* Modal header */}
            <div style={{ padding:"14px 20px", background:`linear-gradient(90deg,${form.primary_color||"#0a2558"},${form.primary_color||"#0a2558"}bb)`, display:"flex" as const, alignItems:"center" as const, justifyContent:"space-between" as const }}>
              <h3 style={{ fontSize:14, fontWeight:900, color:"#fff", margin:0 }}>
                {editing ? `Edit — ${editing.name}` : "Add New Facility"}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ padding:5, borderRadius:6, background:"rgba(255,255,255,0.15)", color:"#fff", border:"none", cursor:"pointer" as const }}>
                <X style={{ width:15, height:15 }}/>
              </button>
            </div>

            <div style={{ padding:20, display:"flex" as const, flexDirection:"column" as const, gap:12 }}>
              {/* Row 1 */}
              <div style={{ display:"grid" as const, gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Facility Code *</label>
                  <input value={form.code||""} onChange={e => setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="EL5H" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Short Name *</label>
                  <input value={form.short_name||""} onChange={e => setForm(p=>({...p,short_name:e.target.value.toUpperCase()}))} placeholder="EL5H" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>KEPH Level</label>
                  <select value={form.level||"4"} onChange={e => setForm(p=>({...p,level:e.target.value}))} style={inp}>
                    {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <label style={lbl}>Full Facility Name *</label>
                <input value={form.name||""} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Runyenjes Sub-District Hospital" style={inp}/>
              </div>

              {/* Row 3 */}
              <div style={{ display:"grid" as const, gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Facility Type</label>
                  <select value={form.type||"hospital"} onChange={e => setForm(p=>({...p,type:e.target.value}))} style={inp}>
                    {TYPES.map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Location / Town</label>
                  <input value={form.location||""} onChange={e => setForm(p=>({...p,location:e.target.value}))} placeholder="Runyenjes" style={inp}/>
                </div>
              </div>

              {/* Row 4 */}
              <div style={{ display:"grid" as const, gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>County</label>
                  <input value={form.county||"Embu"} onChange={e => setForm(p=>({...p,county:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Sub-County</label>
                  <input value={form.sub_county||""} onChange={e => setForm(p=>({...p,sub_county:e.target.value}))} placeholder="Runyenjes" style={inp}/>
                </div>
              </div>

              {/* Row 5 */}
              <div style={{ display:"grid" as const, gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Phone</label>
                  <input value={form.phone||""} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="+254 068 xxxxx" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input value={form.email||""} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="facility@embu.health.go.ke" style={inp}/>
                </div>
              </div>

              {/* Row 6 */}
              <div>
                <label style={lbl}>Address / P.O. Box</label>
                <input value={form.address||""} onChange={e => setForm(p=>({...p,address:e.target.value}))} placeholder="P.O. Box 25, Runyenjes" style={inp}/>
              </div>

              {/* Colors */}
              <div style={{ display:"grid" as const, gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Primary Color</label>
                  <div style={{ display:"flex" as const, gap:6 }}>
                    <input type="color" value={form.primary_color||"#0a2558"} onChange={e => setForm(p=>({...p,primary_color:e.target.value}))} style={{ width:38,height:34,borderRadius:6,border:"1.5px solid #e2e8f0",cursor:"pointer" as const,padding:2 }}/>
                    <input value={form.primary_color||""} onChange={e => setForm(p=>({...p,primary_color:e.target.value}))} style={{...inp,fontFamily:"monospace",flex:1}}/>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Accent Color</label>
                  <div style={{ display:"flex" as const, gap:6 }}>
                    <input type="color" value={form.accent_color||"#C45911"} onChange={e => setForm(p=>({...p,accent_color:e.target.value}))} style={{ width:38,height:34,borderRadius:6,border:"1.5px solid #e2e8f0",cursor:"pointer" as const,padding:2 }}/>
                    <input value={form.accent_color||""} onChange={e => setForm(p=>({...p,accent_color:e.target.value}))} style={{...inp,fontFamily:"monospace",flex:1}}/>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display:"flex" as const, gap:16 }}>
                <label style={{ display:"flex" as const, alignItems:"center" as const, gap:7, cursor:"pointer" as const, fontSize:12, color:"#374151", fontWeight:500 }}>
                  <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(p=>({...p,is_active:e.target.checked}))} style={{ width:15,height:15,accentColor:"#0a2558" }}/>
                  Active
                </label>
                <label style={{ display:"flex" as const, alignItems:"center" as const, gap:7, cursor:"pointer" as const, fontSize:12, color:"#374151", fontWeight:500 }}>
                  <input type="checkbox" checked={form.is_main ?? false} onChange={e => setForm(p=>({...p,is_main:e.target.checked}))} style={{ width:15,height:15,accentColor:"#f59e0b" }}/>
                  Main / Parent Facility
                </label>
              </div>

              {/* Footer */}
              <div style={{ display:"flex" as const, gap:8, justifyContent:"flex-end" as const, paddingTop:8, borderTop:"1px solid #e2e8f0" }}>
                <button onClick={() => setShowForm(false)} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer" as const, fontSize:13 }}>Cancel</button>
                <button onClick={save} disabled={saving}
                  style={{ display:"flex" as const, alignItems:"center" as const, gap:7, padding:"8px 20px", borderRadius:8, border:"none",
                    background:`linear-gradient(90deg,${form.primary_color||"#0a2558"},${form.accent_color||"#C45911"}88)`,
                    color:"#fff", cursor:saving?"not-allowed":"pointer", fontSize:13, fontWeight:700, opacity:saving?0.7:1 }}>
                  {saving ? <RefreshCw style={{ width:13, height:13, animation:"spin 1s linear infinite" }}/> : <Save style={{ width:13, height:13 }}/>}
                  {saving ? "Saving..." : editing ? "Update Facility" : "Add Facility"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}