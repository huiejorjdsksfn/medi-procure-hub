import type React from "react";
/**
 * EL5 MediProcure — Facilities v10
 * Classic ERP Financial Management System UI
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

const db = supabase as any;

interface Facility {
  id: string; name: string; code?: string; facility_type?: string;
  county?: string; sub_county?: string; ward?: string; address?: string;
  phone?: string; email?: string; status?: string; bed_capacity?: number;
  mfl_code?: string; level?: string; created_at: string; updated_at?: string;
}

function fmtDate(s: string) { if(!s) return "—"; return new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function StatusChip({ status }: { status: string }) { return <span style={erpStyles.statusChip(status||"active")}>{status||"active"}</span>; }

const FACILITY_TYPES = ["Level 5 Hospital","Level 4 Hospital","Level 3 Health Centre","Level 2 Dispensary","Level 1 Community Unit","Pharmacy","Laboratory"];
const COUNTIES = ["Embu","Nairobi","Mombasa","Kisumu","Nakuru","Meru","Tharaka-Nithi","Kirinyaga","Murang'a","Nyeri"];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewFacility, setViewFacility] = useState<Facility|null>(null);
  const [form, setForm] = useState({
    name:"", code:"", facility_type:"Level 5 Hospital", county:"Embu",
    sub_county:"", ward:"", address:"", phone:"", email:"",
    bed_capacity:"", mfl_code:"", level:"5",
  });

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from("facilities").select("*").order("name",{ascending:true}).limit(200);
      if(error) throw error;
      setFacilities(data||[]);
    } catch(e:any) { console.error("[Facilities]",e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchFacilities(); },[fetchFacilities]);

  async function createFacility() {
    if(!form.name){ toast({title:"Facility name required",variant:"destructive"}); return; }
    setSaving(true);
    const { error } = await db.from("facilities").insert({
      name:form.name, code:form.code||null, facility_type:form.facility_type,
      county:form.county, sub_county:form.sub_county, ward:form.ward,
      address:form.address, phone:form.phone, email:form.email,
      bed_capacity:form.bed_capacity?parseInt(form.bed_capacity):null,
      mfl_code:form.mfl_code||null, level:form.level, status:"active",
    });
    setSaving(false);
    if(error){ toast({title:"Error: "+error.message,variant:"destructive"}); return; }
    toast({title:`✓ Facility "${form.name}" created`});
    setShowNew(false);
    setForm({name:"",code:"",facility_type:"Level 5 Hospital",county:"Embu",sub_county:"",ward:"",address:"",phone:"",email:"",bed_capacity:"",mfl_code:"",level:"5"});
    fetchFacilities();
  }

  async function toggleStatus(id: string, current: string) {
    const newStatus = current==="active" ? "inactive" : "active";
    const { error } = await db.from("facilities").update({status:newStatus}).eq("id",id);
    if(!error){ toast({title:`✓ Status → ${newStatus}`}); fetchFacilities(); }
  }

  function exportCSV() {
    const rows = ["Name,Code,Type,Level,County,Sub-County,MFL Code,Beds,Phone,Email,Status",
      ...filtered.map(f=>`${f.name},${f.code||""},${f.facility_type||""},${f.level||""},${f.county||""},${f.sub_county||""},${f.mfl_code||""},${f.bed_capacity||""},${f.phone||""},${f.email||""},${f.status||"active"}`)
    ];
    const blob = new Blob([rows.join("\n")],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="facilities.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({title:"✓ Exported"});
  }

  const filtered = facilities.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !search || [f.name,f.code,f.mfl_code,f.county,f.phone,f.email].some(x=>x?.toLowerCase().includes(q));
    const matchType = typeFilter==="ALL" || f.facility_type===typeFilter;
    const matchStatus = statusFilter==="ALL" || (f.status||"active")===statusFilter.toLowerCase();
    return matchSearch && matchType && matchStatus;
  });

  const inp: React.CSSProperties = { ...erpStyles.inp, width:"100%", boxSizing:"border-box" };

  const kpiData = [
    {label:"TOTAL FACILITIES",val:facilities.length},
    {label:"ACTIVE",val:facilities.filter(f=>(f.status||"active")==="active").length},
    {label:"INACTIVE",val:facilities.filter(f=>f.status==="inactive").length},
    {label:"HOSPITALS",val:facilities.filter(f=>f.facility_type?.includes("Hospital")).length},
    {label:"TOTAL BEDS",val:facilities.reduce((s,f)=>s+(f.bed_capacity||0),0)},
  ];

  return (
    <div style={{ background:"#f0f0f0", minHeight:"100vh", fontFamily:ERP.fontFamily, fontSize:12 }}>
      {/* Title */}
      <div style={{ background:ERP.titleBar, color:"#fff", padding:"5px 10px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>🏥</span>
          <div>
            <div>EL5 MediProcure — Facilities Management</div>
            <div style={{ fontSize:10, fontWeight:400, opacity:.85 }}>Embu Level 5 Hospital · Health Facility Registry</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {["0","1","r"].map(c=><div key={c} style={{ width:16,height:14,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#333",fontWeight:700 }}>{c}</div>)}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background:"#f5f5f5", borderBottom:"1px solid #ccc", padding:"2px 8px", display:"flex", gap:16, fontSize:12 }}>
        {["File","View","Reports","Help"].map(m=>(
          <span key={m} style={{ cursor:"pointer", padding:"2px 4px" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><u>{m[0]}</u>{m.slice(1)}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, padding:"5px 10px", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:28,height:28,background:"linear-gradient(135deg,#1a3580,#2a4fa3)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:14 }}>🏥</span>
          </div>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a3580" }}>Facilities Registry</span>
        </div>
        <button onClick={fetchFacilities} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          <button onClick={()=>setShowNew(v=>!v)} style={erpStyles.btn(true)}>+ New Facility</button>
          <button onClick={exportCSV} style={erpStyles.btn(false)}>- Export</button>
          <button onClick={()=>window.print()} style={erpStyles.btn(false)}>- Print</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:"flex", borderBottom:"1px solid #aaa" }}>
        {kpiData.map((k,i)=>(
          <div key={i} style={{ flex:1, padding:"10px 16px", borderRight:i<kpiData.length-1?"1px solid #aaa":"none", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ color:"#c0392b", fontWeight:700, fontSize:11 }}>-</span>
              <span style={{ fontWeight:800, fontSize:20, color:"#1a1a1a" }}>{k.val}</span>
            </div>
            <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {viewFacility && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", border:"2px solid #2a4fa3", width:520 }}>
            <div style={{ background:ERP.titleBar, color:"#fff", padding:"6px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700 }}>Facility Details — {viewFacility.name}</span>
              <button onClick={()=>setViewFacility(null)} style={{ background:"none", border:"1px solid #fff", color:"#fff", cursor:"pointer", padding:"1px 8px", fontSize:12 }}>✕</button>
            </div>
            <div style={{ padding:16 }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                {[
                  ["Name",viewFacility.name,"Code",viewFacility.code||"—"],
                  ["Type",viewFacility.facility_type||"—","Level",`Level ${viewFacility.level||"—"}`],
                  ["County",viewFacility.county||"—","Sub-County",viewFacility.sub_county||"—"],
                  ["MFL Code",viewFacility.mfl_code||"—","Bed Capacity",viewFacility.bed_capacity||"—"],
                  ["Phone",viewFacility.phone||"—","Email",viewFacility.email||"—"],
                  ["Address",viewFacility.address||"—","Status",<StatusChip status={viewFacility.status||"active"}/>],
                  ["Created",fmtDate(viewFacility.created_at),"Last Updated",fmtDate(viewFacility.updated_at||"")],
                ].map((row,i)=>(
                  <tr key={i} style={{ background:i%2===0?"#f9f9f9":"#fff" }}>
                    <td style={{ ...erpStyles.gridTd, fontWeight:700, color:"#555", width:"25%", fontSize:11 }}>{row[0]}</td>
                    <td style={{ ...erpStyles.gridTd, width:"25%" }}>{row[1]}</td>
                    <td style={{ ...erpStyles.gridTd, fontWeight:700, color:"#555", width:"25%", fontSize:11 }}>{row[2]}</td>
                    <td style={{ ...erpStyles.gridTd, width:"25%" }}>{row[3]}</td>
                  </tr>
                ))}
              </table>
              <div style={{ marginTop:10, display:"flex", gap:8 }}>
                <button onClick={()=>{ toggleStatus(viewFacility.id, viewFacility.status||"active"); setViewFacility(null); }} style={erpStyles.btn(false)}>
                  {(viewFacility.status||"active")==="active" ? "⊗ Deactivate" : "✓ Activate"}
                </button>
                <button onClick={()=>setViewFacility(null)} style={erpStyles.btn(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Facility Form */}
      {showNew && (
        <div style={{ margin:"8px 8px 0", background:"#fff", border:"1px solid #ccc", padding:"12px 16px" }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>🏥 Register New Facility</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              {label:"Facility Name *",key:"name",type:"text"},
              {label:"Facility Code",key:"code",type:"text"},
              {label:"MFL Code",key:"mfl_code",type:"text"},
              {label:"Level",key:"level",type:"text",placeholder:"e.g. 5"},
              {label:"Sub-County",key:"sub_county",type:"text"},
              {label:"Ward",key:"ward",type:"text"},
              {label:"Phone",key:"phone",type:"text"},
              {label:"Email",key:"email",type:"email"},
              {label:"Bed Capacity",key:"bed_capacity",type:"number"},
            ].map(f=>(
              <div key={f.key}>
                <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inp}/>
              </div>
            ))}
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Facility Type</label>
              <select value={form.facility_type} onChange={e=>setForm(p=>({...p,facility_type:e.target.value}))} style={inp}>
                {FACILITY_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>County</label>
              <select value={form.county} onChange={e=>setForm(p=>({...p,county:e.target.value}))} style={inp}>
                {COUNTIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Physical Address</label>
              <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} style={inp}/>
            </div>
          </div>
          <div style={{ marginTop:10, display:"flex", gap:8 }}>
            <button onClick={createFacility} disabled={saving} style={erpStyles.btn(true)}>{saving?"⏳ Saving...":"💾 Register Facility"}</button>
            <button onClick={()=>setShowNew(false)} style={erpStyles.btn(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ margin:"6px 8px" }}>
        <div style={{ background:"#f5f5f5", border:"1px solid #ccc", padding:"5px 10px", marginBottom:4, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, fontSize:11, color:"#555" }}>Facilities — Filter & Extract</span>
          <div style={{ display:"flex", gap:4 }}>
            <span style={{ fontSize:11 }}>Search:</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, code, MFL, county..." style={{ ...erpStyles.inp, width:200, fontSize:11 }}/>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <span style={{ fontSize:11 }}>Type:</span>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...erpStyles.inp, fontSize:11 }}>
              <option>ALL</option>
              {FACILITY_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <span style={{ fontSize:11 }}>Status:</span>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...erpStyles.inp, fontSize:11 }}>
              {["ALL","ACTIVE","INACTIVE"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#888" }}>{filtered.length} records</span>
          <button onClick={exportCSV} style={erpStyles.btn(true)}>Extract →</button>
        </div>

        <div style={{ background:"#fff", border:"1px solid #ccc", maxHeight:"calc(100vh - 230px)", overflow:"auto" }}>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#888" }}>Loading facilities...</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                <tr>
                  {["Facility Name","Code","MFL Code","Type","Level","County","Sub-County","Beds","Phone","Status","Registered","Actions"].map(h=>(
                    <th key={h} style={erpStyles.gridTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f,i)=>(
                  <tr key={f.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")}
                    onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}
                  >
                    <td style={{ ...erpStyles.gridTd, fontWeight:700, color:"#2255cc", cursor:"pointer" }} onClick={()=>setViewFacility(f)}>{f.name}</td>
                    <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{f.code||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{f.mfl_code||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontSize:11 }}>{f.facility_type||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, textAlign:"center" }}>L{f.level||"—"}</td>
                    <td style={erpStyles.gridTd}>{f.county||"—"}</td>
                    <td style={erpStyles.gridTd}>{f.sub_county||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, textAlign:"center" }}>{f.bed_capacity||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{f.phone||"—"}</td>
                    <td style={erpStyles.gridTd}><StatusChip status={f.status||"active"}/></td>
                    <td style={{ ...erpStyles.gridTd, fontSize:11, color:"#555" }}>{fmtDate(f.created_at)}</td>
                    <td style={erpStyles.gridTd}>
                      <div style={{ display:"flex", gap:3 }}>
                        <button onClick={()=>setViewFacility(f)} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px" }}>View</button>
                        <button onClick={()=>toggleStatus(f.id,f.status||"active")} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px", color:(f.status||"active")==="active"?"#cc0000":"#007700" }}>
                          {(f.status||"active")==="active"?"Deactivate":"Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && (
                  <tr><td colSpan={12} style={{ padding:30, textAlign:"center", color:"#888" }}>No facilities found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#e0e0e0", borderTop:"1px solid #aaa", padding:"2px 10px", fontSize:11, color:"#555", display:"flex", gap:16 }}>
        <span>Facilities: {filtered.length}</span>
        <span>|</span>
        <span>Active: {facilities.filter(f=>(f.status||"active")==="active").length}</span>
        <span>|</span>
        <span>Total Beds: {facilities.reduce((s,f)=>s+(f.bed_capacity||0),0)}</span>
        <span style={{ marginLeft:"auto" }}>EL5 MediProcure v10 · Facilities Management</span>
      </div>
    </div>
  );
}

