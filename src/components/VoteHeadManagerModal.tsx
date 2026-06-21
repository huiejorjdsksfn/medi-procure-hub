/**
 * VoteHeadManagerModal — admin-only modal for adding/removing vote heads.
 * Vote heads are auto-populated with sensible defaults on first use, but
 * admin-tier users can extend or correct the list at any time. Changes
 * apply instantly everywhere the useVoteHeads() hook is used (it shares
 * a single in-memory cache + system_settings row, broadcast on save).
 */
import { useState, CSSProperties } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useVoteHeads, VoteHead } from "@/hooks/useVoteHeads";
import { toast } from "@/hooks/use-toast";

export default function VoteHeadManagerModal({ onClose }: { onClose: () => void }) {
  const { voteHeads, addVoteHead, removeVoteHead } = useVoteHeads();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const inp: CSSProperties = { width: "100%", padding: "7px 9px", fontSize: 12, border: "1px solid #d1d5db", borderRadius: 6 };

  const add = async () => {
    if (!code.trim() || !label.trim()) { toast({ title: "Code and label required", variant: "destructive" }); return; }
    setSaving(true);
    await addVoteHead(code.trim(), label.trim());
    setSaving(false);
    setCode(""); setLabel("");
    toast({ title: `✓ Vote head ${code} added` });
  };

  const remove = async (vh: VoteHead) => {
    await removeVoteHead(vh.code);
    toast({ title: `Removed ${vh.code}` });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: 480, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Manage Vote Heads</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code e.g. 2210400" style={{ ...inp, flex: "0 0 130px" }} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label e.g. 2210400 — Rentals" style={{ ...inp, flex: 1 }} />
          <button onClick={add} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 12px", borderRadius: 6, background: "#0a2558", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={14} /> Add
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 18px 18px" }}>
          {voteHeads.map(vh => (
            <div key={vh.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{vh.label}</div>
                {vh.defaultForTypes?.length ? <div style={{ fontSize: 10, color: "#64748b" }}>Default for: {vh.defaultForTypes.join(", ")}</div> : null}
              </div>
              <button onClick={() => remove(vh)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}><Trash2 size={14} /></button>
            </div>
          ))}
          {voteHeads.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 20 }}>No vote heads configured yet.</div>}
        </div>
      </div>
    </div>
  );
}
