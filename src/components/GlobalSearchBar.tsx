/**
 * GlobalSearchBar — ProcurBosse v12.1.0
 * System-wide search: requisitions, POs, suppliers, items
 * Ctrl+K / Cmd+K to open. Results deep-link via ?focus=<id> which each
 * target page reads to auto-open the matching record's view modal.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { netEngine } from "@/lib/networkEngine";
import { pageCache } from "@/lib/pageCache";

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
};

const TYPE_LABELS: Record<string, string> = {
  requisition:    "Requisition",
  purchase_order: "Purchase Order",
  supplier:       "Supplier",
  item:           "Item",
};

// Local fallback: searches whatever each list page last cached via
// pageCache (see RequisitionsPage/PurchaseOrdersPage/SuppliersPage/
// ItemsPage), so the search bar keeps working offline or when Supabase
// is unreachable — just scoped to whatever the user has already loaded.
function searchLocal(q: string): SearchResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const out: SearchResult[] = [];

  const reqs = pageCache.get<any[]>("requisitions") || [];
  reqs.forEach((r: any) => {
    if ((r.title || "").toLowerCase().includes(needle) || (r.requisition_number || "").toLowerCase().includes(needle)) {
      out.push({ id:r.id, type:"requisition", label:r.title||r.requisition_number||r.id,
        subtitle:`${r.requisition_number||""} · ${r.status||"Draft"}`, url:`/requisitions?focus=${r.id}`, icon:"📋" });
    }
  });
  const pos = pageCache.get<any[]>("purchase_orders") || [];
  pos.forEach((r: any) => {
    if ((r.po_number || "").toLowerCase().includes(needle) || (r.supplier_name || "").toLowerCase().includes(needle)) {
      out.push({ id:r.id, type:"purchase_order", label:r.po_number||r.id,
        subtitle:`${r.supplier_name||"PO"} · ${r.status||""}`, url:`/purchase-orders?focus=${r.id}`, icon:"🛒" });
    }
  });
  const sups = pageCache.get<any[]>("suppliers") || [];
  sups.forEach((r: any) => {
    if ((r.name || "").toLowerCase().includes(needle)) {
      out.push({ id:r.id, type:"supplier", label:r.name,
        subtitle:`Supplier · ${r.email||r.status||""}`, url:`/suppliers?focus=${r.id}`, icon:"🏢" });
    }
  });
  const items = pageCache.get<any[]>("items") || [];
  items.forEach((r: any) => {
    if ((r.name || "").toLowerCase().includes(needle) || (r.sku || "").toLowerCase().includes(needle)) {
      out.push({ id:r.id, type:"item", label:r.name,
        subtitle:`${r.sku||"Item"} · ${r.category||""}`, url:`/items?focus=${r.id}`, icon:"📦" });
    }
  });

  return out.slice(0, 20);
}

export default function GlobalSearchBar() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [selected, setSelected] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  // Ctrl+K / Cmd+K to open, Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
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
    if (q.trim().length < 2) { setResults([]); setErrored(false); setFromCache(false); return; }
    setLoading(true);
    setErrored(false);

    // Offline: skip the network entirely and search whatever's cached
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setResults(searchLocal(q));
      setSelected(0);
      setFromCache(true);
      setLoading(false);
      return;
    }

    const like = `%${q.trim()}%`;
    try {
      // Routed through netEngine: each table gets its own circuit breaker
      // (a failing table fast-fails after 4 misses instead of eating a
      // timeout on every keystroke), "critical" priority jumps the
      // request queue ahead of background/prefetch work, and timeouts
      // adapt to real connection quality instead of a fixed value.
      const [reqs, pos, sups, items] = await Promise.all([
        netEngine.request(
          "search:requisitions",
          () => supabase.from("requisitions")
            .select("id,title,status,requisition_number")
            .or(`title.ilike.${like},requisition_number.ilike.${like}`)
            .limit(5),
          { priority: "critical", label: "search requisitions" }
        ),
        netEngine.request(
          "search:purchase_orders",
          () => supabase.from("purchase_orders")
            .select("id,po_number,supplier_name,status")
            .or(`po_number.ilike.${like},supplier_name.ilike.${like}`)
            .limit(5),
          { priority: "critical", label: "search purchase orders" }
        ),
        netEngine.request(
          "search:suppliers",
          () => supabase.from("suppliers")
            .select("id,name,email,status")
            .ilike("name", like)
            .limit(5),
          { priority: "critical", label: "search suppliers" }
        ),
        netEngine.request(
          "search:items",
          () => supabase.from("items")
            .select("id,name,sku,category")
            .or(`name.ilike.${like},sku.ilike.${like}`)
            .limit(5),
          { priority: "critical", label: "search items" }
        ),
      ]);

      const out: SearchResult[] = [];
      let anyOk = false;

      if (!reqs.error && reqs.data) {
        anyOk = true;
        (reqs.data as any[]).forEach((r: any) => out.push({
          id: r.id, type: "requisition",
          label: r.title || r.requisition_number || r.id,
          subtitle: `${r.requisition_number || ""} · ${r.status || "Draft"}`,
          url: `/requisitions?focus=${r.id}`, icon: "📋",
        }));
      }
      if (!pos.error && pos.data) {
        anyOk = true;
        (pos.data as any[]).forEach((r: any) => out.push({
          id: r.id, type: "purchase_order",
          label: r.po_number || r.id,
          subtitle: `${r.supplier_name || "PO"} · ${r.status || ""}`,
          url: `/purchase-orders?focus=${r.id}`, icon: "🛒",
        }));
      }
      if (!sups.error && sups.data) {
        anyOk = true;
        (sups.data as any[]).forEach((r: any) => out.push({
          id: r.id, type: "supplier",
          label: r.name,
          subtitle: `Supplier · ${r.email || r.status || ""}`,
          url: `/suppliers?focus=${r.id}`, icon: "🏢",
        }));
      }
      if (!items.error && items.data) {
        anyOk = true;
        (items.data as any[]).forEach((r: any) => out.push({
          id: r.id, type: "item",
          label: r.name,
          subtitle: `${r.sku || "Item"} · ${r.category || ""}`,
          url: `/items?focus=${r.id}`, icon: "📦",
        }));
      }

      setResults(out);
      setSelected(0);
      // If literally every query failed (network/RLS/circuit-open), surface it
      const allFailed = !anyOk && [reqs, pos, sups, items].every(r => !!r.error);
      if (allFailed) {
        const local = searchLocal(q);
        if (local.length) {
          setResults(local);
          setFromCache(true);
          setErrored(false);
        } else {
          setErrored(true);
          setFromCache(false);
        }
      } else {
        setFromCache(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => search(query), 260);
    return () => clearTimeout(t);
  }, [query, search]);

  // Re-run the live search once connectivity returns, so cached
  // (offline) results get upgraded to fresh ones automatically.
  useEffect(() => {
    const onOnline = () => { if (query.trim().length >= 2) search(query); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
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
          <>
            {fromCache && (
              <div style={{ padding:"6px 20px", background:"#fffbeb", borderBottom:"1px solid #fef3c7", fontSize:11, color:"#92400e" }}>
                📡 Offline — showing cached results from what's already loaded
              </div>
            )}
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {results.map((r, i) => (
              <div key={`${r.type}-${r.id}`} onClick={() => go(r)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 20px", cursor:"pointer",
                  background: i === selected ? "#f0f7ff" : "transparent",
                  borderLeft: i === selected ? "3px solid #0078d4" : "3px solid transparent" }}>
                <span style={{ fontSize:20 }}>{r.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#0f172a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.subtitle}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:TYPE_COLORS[r.type] || "#64748b",
                  background: (TYPE_COLORS[r.type] || "#64748b") + "18", padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>
                  {TYPE_LABELS[r.type] || r.type}
                </span>
              </div>
            ))}
          </div>
          </>
        )}

        {query.trim().length >= 2 && !loading && results.length === 0 && !errored && (
          <div style={{ padding:"32px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>
            No results for "<strong>{query}</strong>"
          </div>
        )}

        {errored && (
          <div style={{ padding:"32px 20px", textAlign:"center", color:"#dc2626", fontSize:13 }}>
            ⚠ Search is temporarily unavailable. Check your connection and try again.
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"10px 20px", borderTop:"1px solid #f1f5f9", display:"flex", gap:16, fontSize:11, color:"#94a3b8" }}>
          <span>↑↓ Navigate</span><span>↵ Open</span><span>ESC Close</span>
          <span style={{ marginLeft:"auto" }}>EL5 MediProcure v12.1.0</span>
        </div>
      </div>
    </div>
  );
}
