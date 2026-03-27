/**
 * FacilitySwitcher — Compact dropdown in the top bar
 * Lets users switch between their assigned facilities
 */
import { useState, useRef, useEffect } from "react";
import { useFacility } from "@/contexts/FacilityContext";
import { Building2, ChevronDown, Check, MapPin } from "lucide-react";

export default function FacilitySwitcher() {
  const { facility, userFacilities, switchFacility } = useFacility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!facility || userFacilities.length <= 1) {
    // Single facility — show as static label
    return (
      <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:3, background:"rgba(255,255,255,0.08)" }}>
        <Building2 style={{ width:11, height:11, color:"rgba(255,255,255,0.5)" }}/>
        <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {facility?.short_name || facility?.name || "EL5H"}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:3,
          background: open ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
          border:"none", cursor:"pointer" }}>
        <Building2 style={{ width:11, height:11, color:"rgba(255,255,255,0.6)" }}/>
        <span style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {facility.short_name}
        </span>
        <ChevronDown style={{ width:9, height:9, color:"rgba(255,255,255,0.4)" }}/>
      </button>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, minWidth:260, maxWidth:320,
          background:"#fff", borderRadius:8, boxShadow:"0 8px 32px rgba(0,0,0,0.2)",
          border:"1px solid #e2e8f0", overflow:"hidden", zIndex:700 }}>
          <div style={{ padding:"8px 12px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
            <div style={{ fontSize:9.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"#64748b" }}>
              Switch Facility
            </div>
          </div>
          {userFacilities.map(f => (
            <button key={f.id}
              onClick={() => { switchFacility(f.id); setOpen(false); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px",
                border:"none", cursor:"pointer", textAlign:"left",
                background: f.id === facility.id ? "#eff6ff" : "#fff",
                borderBottom:"1px solid #f8fafc" }}
              onMouseEnter={e => { if(f.id !== facility.id)(e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = f.id === facility.id ? "#eff6ff" : "#fff"; }}>
              {/* Color dot */}
              <div style={{ width:8, height:8, borderRadius:"50%", background:f.primary_color, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:f.id === facility.id ? 700 : 500, color:"#1e293b",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {f.name}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
                  <MapPin style={{ width:9, height:9, color:"#94a3b8", flexShrink:0 }}/>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>{f.location} · Level {f.level}</span>
                  {f.is_main && <span style={{ fontSize:9, fontWeight:700, color:"#0a2558", background:"#dbeafe", padding:"0px 5px", borderRadius:4 }}>MAIN</span>}
                </div>
              </div>
              {f.id === facility.id && <Check style={{ width:13, height:13, color:"#2563eb", flexShrink:0 }}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
