/**
 * EL5 MediProcure — Facilities Management
 * Multi-facility / ward / department / building registry
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";

const db = supabase as any;

interface Facility {
  id: string; code: string; name: string; short_name: string;
  type: string | null; level: string | null; location: string;
  county: string | null; phone: string | null; email: string | null;
  is_main: boolean; is_active: boolean; created_at: string | null;
}

const BLANK: Omit<Facility,"id"|"created_at"> = {
  code:"", name:"", short_name:"", type:"hospital", level:"L5",
  location:"", county:"Embu", phone:"", email:"", is_main:false, is_active:true,
};

const inp: React.CSSProperties = {
  width:"100%", padding:"7px 10px", border:`1px solid ${T.border}`,
  borderRadius:5, fontSize:12, background:T.surface, color:T.fg, outline:"none", boxSizing:"border-box",
};
const LEVEL_OPTS = ["L2","L3","L4","L5","L6"];
const TYPE_OPTS  = ["hospital","clinic","dispensary","health_centre","nursing_home"];

export default function FacilitiesPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Facility | null>(null);
  const [form,       setForm]       = useState<typeof BLANK>({ ...BLANK });
  const [saving,     setSaving]     = useState(false);
  const [userCount,  setUserCount]  = useState<Record<string,number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("facilities").select("*").order("is_main",{ascending:false}).order("name");
    setFacilities(data || []);
    // Count users per facility
    const { data: uf } = await db.from("user_facilities").select("facility_id");
    if (uf) {
      const counts: Record<string,number> = {};
      uf.forEach((r: any) => { counts[r.facility_id] = (counts[r.facility_id] || 0) + 1; });
      setUserCount(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...BLANK }); setShowForm(true); };
  const openEdit   = (f: Facility) => { setEditing(f); setForm({ code:f.code, name:f.name, short_name:f.short_name, type:f.type||"hospital", level:f.level||"L5", location:f.location, county:f.county||"", phone:f.phone||"", email:f.email||"", is_main:f.is_main, is_active:f.is_active }); setShowForm(true); };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.location.trim()) {
      toast({ title: "Code, name and location are required", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    let err;
    if (editing) {
      ({ error: err } = await db.from("facilities").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await db.from("facilities").insert({ ...payload, created_at: new Date().toISOString() }));
    }
    if (err) { toast({ title: "Save failed", description: err.message, variant: "destructive" }); }
    else { toast({ title: editing ? "Facility updated" : "Facility created" }); setShowForm(false); load(); }
    setSaving(false);
  };

  const toggleActive = async (f: Facility) => {
    await db.from("facilities").update({ is_active: !f.is_active }).eq("id", f.id);
    toast({ title: f.is_active ? "Facility deactivated" : "Facility activated" });
    load();
  };

  const filtered = search
    ? facilities.filter(f => [f.name, f.code, f.location, f.county, f.type].some(v => String(v||"").toLowerCase().includes(search.toLowerCase())))
    : facilities;

  const levelColor = (l: string | null) => ({ L2:"#94a3b8",L3:"#64748b",L4:"#3b82f6",L5:"#059669",L6:"#7c3aed" }[l||""] ?? "#6b7280");

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "20px 16px" }}>
      <AdminBreadcrumb items={[{ label: "Facilities" }]} />

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>🏥</span>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:T.fg }}>Facilities Management</h1>
            <p style={{ margin:"2px 0 0", fontSize:11, color:T.muted }}>
              {facilities.length} facilit{facilities.length===1?"y":"ies"} registered · {facilities.filter(f=>f.is_active).length} active
            </p>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search facilities…"
            style={{ ...inp, width:200 }} />
          <button onClick={openCreate}
            style={{ padding:"7px 16px", background:T.primary, color:"#fff", border:"none", borderRadius:6, fontWeight:700, fontSize:12, cursor:"pointer" }}>
            + New Facility
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, marginBottom:16 }}>
        {[
          { label:"Total",    val:facilities.length,                             col:"#1d4ed8" },
          { label:"Active",   val:facilities.filter(f=>f.is_active).length,      col:"#059669" },
          { label:"Hospitals",val:facilities.filter(f=>f.type==="hospital").length, col:"#7c3aed" },
          { label:"Level 5",  val:facilities.filter(f=>f.level==="L5").length,   col:"#dc2626" },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px" }}>
            <div style={{ fontSize:20, fontWeight:800, color:k.col }}>{k.val}</div>
            <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:"uppercase" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:T.muted }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:T.muted }}>
          {search ? "No facilities match your search" : "No facilities yet — add one above"}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.map(f => (
            <div key={f.id} style={{ background:T.surface, border:`1px solid ${f.is_main?"#1d4ed8":T.border}`, borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              {f.is_main && <span style={{ fontSize:9, fontWeight:800, background:"#1d4ed8", color:"#fff", padding:"1px 7px", borderRadius:10, flexShrink:0 }}>MAIN</span>}
              <div style={{ flexShrink:0, width:36, height:36, borderRadius:6, background:`${levelColor(f.level)}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:levelColor(f.level) }}>{f.level||"—"}</div>
              <div style={{ flex:1, minWidth:140 }}>
                <div style={{ fontWeight:700, fontSize:13, color:T.fg }}>{f.name}</div>
                <div style={{ fontSize:10, color:T.muted }}>{f.code} · {f.location}{f.county?`, ${f.county}`:""}</div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:10, background:`${levelColor(f.level)}18`, color:levelColor(f.level), padding:"2px 8px", borderRadius:4, fontWeight:600 }}>{f.type||"—"}</span>
                {f.phone && <span style={{ fontSize:10, color:T.muted }}>📞 {f.phone}</span>}
                <span style={{ fontSize:10, color:T.muted }}>👥 {userCount[f.id]||0} users</span>
                <span style={{ fontSize:10, fontWeight:700, color:f.is_active?"#059669":"#dc2626" }}>{f.is_active?"● Active":"● Inactive"}</span>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button onClick={() => openEdit(f)} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:4, fontSize:11, cursor:"pointer", color:T.fg }}>Edit</button>
                <button onClick={() => toggleActive(f)} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${f.is_active?"#dc2626":"#059669"}`, borderRadius:4, fontSize:11, cursor:"pointer", color:f.is_active?"#dc2626":"#059669" }}>
                  {f.is_active?"Deactivate":"Activate"}
                </button>
                <button onClick={() => nav("/departments")} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:4, fontSize:11, cursor:"pointer", color:T.muted }}>Depts →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:T.surface, borderRadius:10, padding:24, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ margin:"0 0 16px", fontSize:15, fontWeight:800, color:T.fg }}>{editing?"Edit Facility":"New Facility"}</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["Code",       "code",       "text",  "EL5H"],
                ["Name",       "name",       "text",  "Embu Level 5 Hospital"],
                ["Short Name", "short_name", "text",  "EL5H"],
                ["Location",   "location",   "text",  "Embu Town"],
                ["County",     "county",     "text",  "Embu"],
                ["Phone",      "phone",      "tel",   "+254..."],
                ["Email",      "email",      "email", "admin@facility.go.ke"],
              ].map(([label, key, type, ph]) => (
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase" }}>{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inp} />
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase" }}>Type</label>
                <select value={form.type||"hospital"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{ ...inp }}>
                  {TYPE_OPTS.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase" }}>Level</label>
                <select value={form.level||"L5"} onChange={e=>setForm(p=>({...p,level:e.target.value}))} style={{ ...inp }}>
                  {LEVEL_OPTS.map(l=><option key={l} value={l}>Level {l.slice(1)} ({l})</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                <input type="checkbox" checked={form.is_main} onChange={e=>setForm(p=>({...p,is_main:e.target.checked}))} />
                Main facility
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} />
                Active
              </label>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowForm(false)} style={{ padding:"8px 18px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, cursor:"pointer", color:T.fg }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding:"8px 18px", background:T.primary, color:"#fff", border:"none", borderRadius:6, fontWeight:700, fontSize:12, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Saving…":editing?"Save Changes":"Create Facility"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
