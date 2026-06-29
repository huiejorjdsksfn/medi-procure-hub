/**
 * GlobalSearchBar — ProcurBosse v12.0.0
 * System-wide search: requisitions, POs, suppliers, items, users, vouchers
 * Keyboard shortcut: Ctrl+K / Cmd+K
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  type: string;
  url: string;
  icon: string;
}

const TYPE_COLORS: Record<string, string> = {
  requisition:    "#3b82f6",
  purchase_order: "#8b5cf6",
  supplier:       "#22c55e",
  item:           "#f59e0b",
  user:           "#06b6d4",
  voucher:        "#ec4899",
};

const TYPE_LABELS: Record<string, string> = {
  requisition:    "Requisition",
  purchase_order: "Purchase Order",
  supplier:       "Supplier",
  item:           "Item",
  user:           "User",
  voucher:        "Voucher",
};

export default function GlobalSearchBar() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 80);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const like = `%${q}%`;
    try {
      const [reqs, pos, sups, items] = await Promise.allSettled([
        supabase.from("requisitions").select("id,title,status,requisition_number")
          .or(`title.ilike.${like},requisition_number.ilike.${like}`).limit(4),
        supabase.from("purchase_orders").select("id,order_number,supplier_name,status")
          .or(`order_number.ilike.${like},supplier_name.ilike.${like}`).limit(4),
        supabase.from("suppliers").select("id,name,contact_email,status")
          .ilike("name", like).limit(4),
        supabase.from("items").select("id,name,code,category")
          .or(`name.ilike.${like},code.ilike.${like}`).limit(4),
      ]);

      const out: SearchResult[] = [];

      if (reqs.status === "fulfilled" && reqs.value.data) {
        reqs.value.data.forEach(r => out.push({
          id: r.id, type: "requisition",
          label: r.title || r.requisition_number || r.id,
          subtitle: `Requisition · ${r.status || "Draft"}`,
          url: "/requisitions", icon: "📋",
        }));
      }
      if (pos.status === "fulfilled" && pos.value.data) {
        pos.value.data.forEach(r => out.push({
          id: r.id, type: "purchase_order",
          label: r.order_number || r.id,
          subtitle: `PO · ${r.supplier_name || ""} · ${r.status || ""}`,
          url: "/purchase-orders", icon: "🛒",
        }));
      }
      if (sups.status === "fulfilled" && sups.value.data) {
        sups.value.data.forEach(r => out.push({
          id: r.id, type: "supplier",
          label: r.name,
          subtitle: `Supplier · ${r.contact_email || r.status || ""}`,
          url: "/suppliers", icon: "🏢",
        }));
      }
      if (items.status === "fulfilled" && items.value.data) {
        items.value.data.forEach(r => out.push({
          id: r.id, type: "item",
          label: r.name,
          subtitle: `Item · ${r.code || ""} · ${r.category || ""}`,
          url: "/items", icon: "📦",
        }));
      }

      setResults(out);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => search(query), 260);
    return () => clearTimeout(t);
  }, [query, search]);

  const go = (r: SearchResult) => {
    nav(r.url);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) go(results[selected]);
  };

  if (!open) return (
    <button
      onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 80); }}
      title="Global Search (Ctrl+K)"
      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:8, color:"rgba(255,255,255,0.85)", fontSize:13, cursor:"pointer", minWidth:180 }}
    >
      <span style={{ fontSize:14 }}>🔍</span>
      <span style={{ flex:1, textAlign:"left" }}>Search everything…</span>
      <kbd style={{ fontSize:10, background:"rgba(255,255,255,0.15)", padding:"2px 6px", borderRadius:4, fontFamily:"monospace" }}>Ctrl+K</kbd>
    </button>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(15,23,42,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:80 }}
      onClick={() => setOpen(false)}>
      <div style={{ width:"100%", maxWidth:580, background:"#fff", borderRadius:16, boxShadow:"0 25px 60px rgba(0,0,0,0.35)", overflow:"hidden" }}
        onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:"1px solid #f1f5f9" }}>
          <span style={{ fontSize:18 }}>{loading ? "⏳" : "🔍"}</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKey}
            placeholder="Search requisitions, POs, suppliers, items…"
            style={{ flex:1, border:"none", outline:"none", fontSize:16, color:"#0f172a", background:"transparent" }} />
          <kbd style={{ fontSize:11, color:"#94a3b8", background:"#f8fafc", padding:"3px 8px", borderRadius:6, fontFamily:"monospace", cursor:"pointer" }}
            onClick={() => setOpen(false)}>ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight:360, overflowY:"auto" }}>
            {results.map((r, i) => (
              <div key={r.id} onClick={() => go(r)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 20px", cursor:"pointer",
                  background: i === selected ? "#f0f7ff" : "transparent",
                  borderLeft: i === selected ? "3px solid #0078d4" : "3px solid transparent" }}>
                <span style={{ fontSize:20 }}>{r.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#0f172a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{r.subtitle}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:TYPE_COLORS[r.type] || "#64748b",
                  background: (TYPE_COLORS[r.type] || "#64748b") + "18", padding:"2px 8px", borderRadius:99 }}>
                  {TYPE_LABELS[r.type] || r.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div style={{ padding:"32px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>
            No results for "<strong>{query}</strong>"
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"10px 20px", borderTop:"1px solid #f1f5f9", display:"flex", gap:16, fontSize:11, color:"#94a3b8" }}>
          <span>↑↓ Navigate</span><span>↵ Open</span><span>ESC Close</span>
          <span style={{ marginLeft:"auto" }}>EL5 MediProcure v12.0.0</span>
        </div>
      </div>
    </div>
  );
}
