import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import type { ConflictChoice } from "@/hooks/useConflictResolver";

type Props = {
  fields: string[];
  onResolve: (choice: ConflictChoice) => void;
  remoteLabel?: string;
};

const labelField = (field: string) => field.replace(/_/g, " ");

export function ConflictResolutionBanner({ fields, onResolve, remoteLabel = "remote" }: Props) {
  if (!fields.length) return null;

  return (
    <div style={{
      margin: "12px 20px 0",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #f59e0b",
      background: "#fffbeb",
      color: "#78350f",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 8px 24px rgba(245,158,11,0.18)",
    }}>
      <AlertTriangle style={{ width: 18, height: 18, color: "#d97706", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Concurrent edit detected</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>
          {fields.length} field(s) changed in the {remoteLabel} record while you were editing: <strong>{fields.slice(0, 5).map(labelField).join(", ")}{fields.length > 5 ? "…" : ""}</strong>.
        </div>
      </div>
      <button onClick={() => onResolve("mine")} style={btn("#fff", "#92400e", "#f59e0b")}>Keep mine</button>
      <button onClick={() => onResolve("merge")} style={btn("#fff", "#92400e", "#f59e0b")}>Merge</button>
      <button onClick={() => onResolve("remote")} style={btn("#d97706", "#fff", "#d97706")}>Use remote</button>
    </div>
  );
}

function btn(background: string, color: string, border: string): CSSProperties {
  return {
    padding: "7px 10px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background,
    color,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}
