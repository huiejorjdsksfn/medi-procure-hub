/**
 * EL5 MediProcure — Stamps Gallery v3.0
 * Shows every stamp type in the new realistic rubber-stamp design.
 * Admin/manager can preview, print, or apply any stamp to a document.
 */
import { useState } from "react";
import { DocumentStamp, QuickStampButton, type StampStatus } from "@/components/DocumentStamp";
import { useAuth } from "@/contexts/AuthContext";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import { RefreshCw, Printer, Stamp } from "lucide-react";

const ALL_STAMPS: { status: StampStatus; name: string; roles: string[] }[] = [
  { status:"approved",     name:"Approved",       roles:["admin","procurement_manager","finance_manager"] },
  { status:"rejected",     name:"Rejected",       roles:["admin","procurement_manager","finance_manager"] },
  { status:"pending",      name:"Pending",        roles:["admin","procurement_manager","procurement_officer"] },
  { status:"submitted",    name:"Submitted",      roles:["admin","procurement_manager","procurement_officer","requisitioner"] },
  { status:"received",     name:"Received",       roles:["admin","procurement_manager","warehouse_officer","inventory_manager"] },
  { status:"issued",       name:"Issued",         roles:["admin","finance_manager","accountant"] },
  { status:"draft",        name:"Draft",          roles:["admin","procurement_officer","requisitioner"] },
  { status:"ordered",      name:"Ordered",        roles:["admin","procurement_manager","procurement_officer"] },
  { status:"partial",      name:"Partial",        roles:["admin","procurement_manager","warehouse_officer"] },
  { status:"sent",         name:"Sent",           roles:["admin","procurement_manager","procurement_officer"] },
  { status:"cancelled",    name:"Cancelled",      roles:["admin","procurement_manager","finance_manager"] },
  { status:"published",    name:"Published",      roles:["admin","procurement_manager"] },
  { status:"closed",       name:"Closed",         roles:["admin","procurement_manager"] },
  { status:"awarded",      name:"Awarded",        roles:["admin","procurement_manager"] },
  { status:"active",       name:"Active",         roles:["admin","procurement_manager","finance_manager"] },
  { status:"expired",      name:"Expired",        roles:["admin","procurement_manager","finance_manager"] },
  { status:"verified",     name:"Verified",       roles:["admin","procurement_manager","inventory_manager","warehouse_officer"] },
  { status:"official",     name:"Official Use",   roles:["admin","superadmin","webmaster"] },
  { status:"confidential", name:"Confidential",   roles:["admin","superadmin","webmaster"] },
  { status:"urgent",       name:"Urgent",         roles:["admin","procurement_manager","finance_manager"] },
];

const INK: Record<string, string> = {
  approved:"#0d4f1c", rejected:"#8b0000", pending:"#7a3e00",
  submitted:"#7a3e00", received:"#003366", issued:"#2e006b",
  draft:"#3d3d3d", ordered:"#004a5c", partial:"#4a006b",
  sent:"#003366", cancelled:"#6b0000", published:"#0d4f1c",
  closed:"#3d3d3d", awarded:"#003366", active:"#0d4f1c",
  expired:"#8b0000", verified:"#003d6b", official:"#1a006b",
  confidential:"#4a006b", urgent:"#8b2800",
};

function printStamp(status: StampStatus, name: string) {
  const ink  = INK[status] || "#333";
  const now  = new Date();
  const day  = String(now.getDate()).padStart(2,"0");
  const mon  = now.toLocaleString("en-KE",{month:"short"}).toUpperCase();
  const year = now.getFullYear();
  const w    = window.open("","_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${name} Stamp</title>
  <style>body{margin:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;min-height:100vh;background:#fff;font-family:Arial}
  h2{font-size:13px;color:#555;margin-top:12px;}
  p{font-size:11px;color:#888;margin:4px 0;}
  @media print{button{display:none}}</style></head>
  <body>
  <svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    <g filter="url(#ink)">
      <circle cx="110" cy="110" r="104" fill="none" stroke="${ink}" stroke-width="5.5"/>
      <circle cx="110" cy="110" r="96" fill="none" stroke="${ink}" stroke-width="2.5"/>
      <circle cx="110" cy="110" r="79" fill="none" stroke="${ink}" stroke-width="2.5"/>
      <text x="110" y="81" text-anchor="middle" dominant-baseline="middle"
        fill="${ink}" font-size="24" font-weight="900" font-family="Arial Black, Arial">
        ${status.toUpperCase()}
      </text>
      <line x1="54" y1="96" x2="166" y2="96" stroke="${ink}" stroke-width="2"/>
      <line x1="54" y1="131" x2="166" y2="131" stroke="${ink}" stroke-width="2"/>
      <line x1="101" y1="96" x2="101" y2="131" stroke="${ink}" stroke-width="1.6"/>
      <line x1="119" y1="96" x2="119" y2="131" stroke="${ink}" stroke-width="1.6"/>
      <text x="77" y="113" text-anchor="middle" dominant-baseline="middle"
        fill="${ink}" font-size="17" font-weight="900" font-family="Arial Black">${day}</text>
      <text x="110" y="113" text-anchor="middle" dominant-baseline="middle"
        fill="${ink}" font-size="14" font-weight="900" font-family="Arial Black">${mon}</text>
      <text x="143" y="113" text-anchor="middle" dominant-baseline="middle"
        fill="${ink}" font-size="13" font-weight="900" font-family="Arial Black">${year}</text>
      <text x="110" y="152" text-anchor="middle" dominant-baseline="middle"
        fill="${ink}" font-size="11" font-weight="700" font-family="Arial">EMBU LEVEL 5 HOSPITAL</text>
    </g>
  </svg>
  <h2>${name}</h2>
  <p>EL5 MediProcure · Official Stamp</p>
  <button onclick="window.print()" style="margin-top:14px;padding:8px 22px;
    background:${ink};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">
    🖨 Print
  </button>
  </body></html>`);
  w.document.close();
}

export default function StampsPage() {
  const { roles } = useAuth();
  const [filter, setFilter] = useState<"all"|"mine">("all");
  const now = new Date();

  const visible = ALL_STAMPS.filter(s =>
    filter === "all" ? true : s.roles.some(r => roles.includes(r))
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f3f4f6", fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      <AdminBreadcrumb />

      {/* ── Header ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"20px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:10,
              background:"linear-gradient(135deg,#0d4f1c,#1a006b)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Stamp size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111" }}>
                Official Stamps
              </h1>
              <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>
                {now.toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button
              onClick={() => setFilter(f => f==="all"?"mine":"all")}
              style={{ padding:"8px 16px", borderRadius:6, border:"1.5px solid #e5e7eb",
                background: filter==="mine"?"#0d4f1c":"#fff",
                color: filter==="mine"?"#fff":"#374151",
                fontWeight:700, fontSize:12, cursor:"pointer" }}>
              {filter==="mine" ? "My Stamps Only" : "Show All"}
            </button>
            <QuickStampButton label="Apply Stamp" size="md" />
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ padding:"16px 28px", background:"#fff", borderBottom:"1px solid #e5e7eb",
        display:"flex", gap:24, flexWrap:"wrap" }}>
        {[
          { label:"Total Stamp Types", val: ALL_STAMPS.length, color:"#0d4f1c" },
          { label:"Available to My Role", val: ALL_STAMPS.filter(s=>s.roles.some(r=>roles.includes(r))).length, color:"#003366" },
          { label:"Approval Stamps",   val: ALL_STAMPS.filter(s=>["approved","verified","official"].includes(s.status)).length, color:"#1a006b" },
          { label:"Rejection/Void",    val: ALL_STAMPS.filter(s=>["rejected","cancelled","expired"].includes(s.status)).length, color:"#8b0000" },
        ].map(s => (
          <div key={s.label} style={{ display:"flex", flexDirection:"column", gap:2 }}>
            <span style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</span>
            <span style={{ fontSize:11, color:"#6b7280" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{ padding:"28px", display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:22 }}>
        {visible.map(({ status, name, roles: stampRoles }) => {
          const ink     = INK[status] || "#333";
          const canUse  = stampRoles.some(r => roles.includes(r));
          return (
            <div key={status} style={{ background:"#fff", borderRadius:14,
              border:`2px solid ${canUse ? ink+"33" : "#e5e7eb"}`,
              boxShadow:"0 2px 12px rgba(0,0,0,0.07)",
              overflow:"hidden", transition:"transform .15s, box-shadow .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 8px 28px ${ink}22`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="none"; (e.currentTarget as HTMLElement).style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}>

              {/* Stamp preview */}
              <div style={{ padding:"28px 0 12px", display:"flex", justifyContent:"center",
                background: canUse ? `${ink}08` : "#fafafa" }}>
                <DocumentStamp
                  status={status}
                  size={150}
                  date={now.toISOString()}
                  rotate={-12}
                  worn
                />
              </div>

              {/* Info */}
              <div style={{ padding:"12px 16px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:"#111" }}>{name}</span>
                  {canUse && (
                    <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px",
                      borderRadius:10, background:`${ink}18`, color:ink,
                      textTransform:"uppercase", letterSpacing:".05em" }}>Available</span>
                  )}
                </div>
                <div style={{ fontSize:11, color:"#6b7280", marginBottom:12, lineHeight:1.4 }}>
                  Roles: {stampRoles.slice(0,2).map(r=>r.replace(/_/g," ")).join(", ")}
                  {stampRoles.length > 2 ? ` +${stampRoles.length-2}` : ""}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button
                    onClick={() => printStamp(status, name)}
                    style={{ flex:1, padding:"7px 0", borderRadius:6,
                      border:`1.5px solid ${ink}`, background:"transparent",
                      color:ink, fontWeight:700, fontSize:11, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <Printer size={12} /> Print
                  </button>
                  <QuickStampButton label="Apply" size="sm" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
