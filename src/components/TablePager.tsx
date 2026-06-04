import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function TablePager({
  total, page, perPage, onPage, onPerPage, color = "#1a3d12",
}: {
  total: number; page: number; perPage: number;
  onPage: (n: number) => void;
  onPerPage: (n: number) => void;
  color?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (p - 1) * perPage + 1;
  const to = Math.min(total, p * perPage);
  const btn: React.CSSProperties = {
    padding: "4px 8px", border: "1px solid #e5e7eb", background: "#fff",
    borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center",
    fontSize: 11, color: "#374151",
  };
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"8px 14px",background:"#f9fafb",borderTop:"1px solid #e5e7eb",flexWrap:"wrap"}}>
      <div style={{fontSize:11,color:"#6b7280"}}>
        Showing <b style={{color}}>{from}-{to}</b> of <b style={{color}}>{total}</b>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <label style={{fontSize:11,color:"#6b7280"}}>Rows:</label>
        <select value={perPage} onChange={e=>{onPerPage(Number(e.target.value));onPage(1);}}
          style={{padding:"3px 6px",border:"1px solid #e5e7eb",borderRadius:6,fontSize:11,background:"#fff"}}>
          {[10,25,50,100,200].map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <button style={btn} disabled={p<=1} onClick={()=>onPage(1)} title="First"><ChevronsLeft size={12}/></button>
        <button style={btn} disabled={p<=1} onClick={()=>onPage(p-1)} title="Prev"><ChevronLeft size={12}/></button>
        <span style={{fontSize:11,color:"#374151",fontWeight:700,minWidth:60,textAlign:"center"}}>{p} / {pages}</span>
        <button style={btn} disabled={p>=pages} onClick={()=>onPage(p+1)} title="Next"><ChevronRight size={12}/></button>
        <button style={btn} disabled={p>=pages} onClick={()=>onPage(pages)} title="Last"><ChevronsRight size={12}/></button>
      </div>
    </div>
  );
}

export function ColSearchRow({
  cols, values, onChange, headerBg = "#1f2937",
}: {
  cols: { key: string; placeholder?: string; type?: "text" | "none" }[];
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
  headerBg?: string;
}) {
  return (
    <tr style={{background: headerBg}}>
      {cols.map((c, i) => (
        <th key={c.key + i} style={{padding:"4px 6px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
          {c.type === "none" ? null : (
            <input
              value={values[c.key] || ""}
              onChange={e => onChange(c.key, e.target.value)}
              placeholder={c.placeholder || "Filter…"}
              style={{width:"100%",padding:"3px 6px",fontSize:10,border:"none",borderRadius:4,background:"rgba(255,255,255,0.92)",color:"#111827",outline:"none",boxSizing:"border-box"}}
            />
          )}
        </th>
      ))}
    </tr>
  );
}