import { AlertTriangle } from "lucide-react";
import { T } from "@/lib/theme";
import type { ConflictChoice } from "@/hooks/useConflictResolver";

export function ConflictBanner({ fields, onResolve }: {
  fields: string[];
  onResolve: (c: ConflictChoice) => void;
}) {
  if (!fields.length) return null;
  return (
    <div style={{
      background:"#fef3c7", border:"1px solid #fbbf24", borderRadius:T.r,
      padding:"10px 14px", margin:"0 0 12px", display:"flex",
      alignItems:"center", gap:12, flexWrap:"wrap", color:"#78350f", fontSize:13,
    }}>
      <AlertTriangle size={16} style={{ flexShrink:0 }}/>
      <span style={{ flex:1, minWidth:200 }}>
        Another user updated this record. Conflicting fields: <b>{fields.join(", ")}</b>
      </span>
      <button onClick={()=>onResolve("mine")}   style={btn("#0e7490")}>Keep mine</button>
      <button onClick={()=>onResolve("merge")}  style={btn("#7c3aed")}>Merge</button>
      <button onClick={()=>onResolve("remote")} style={btn("#dc2626")}>Use remote</button>
    </div>
  );
}
const btn = (bg:string): React.CSSProperties => ({
  padding:"5px 12px", background:bg, color:"#fff", border:"none",
  borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer",
});