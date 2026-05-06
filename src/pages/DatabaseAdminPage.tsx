import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Database, RefreshCw, Plus, Save, Trash2, Download, Printer,
  Calendar, HelpCircle, Search, Server, Activity, Layers, Shield,
} from "lucide-react";

const TABLES = [
  "items", "suppliers", "requisitions", "purchase_orders", "goods_received",
  "contracts", "budgets", "departments", "user_roles", "audit_log",
];

const DatabaseAdminPage = () => {
  const [active, setActive] = useState("items");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({});

  const load = async (t: string) => {
    setLoading(true);
    const { data } = await (supabase as any).from(t).select("*").limit(200);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(active); }, [active]);

  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const t of TABLES) {
        const { count } = await (supabase as any).from(t).select("*", { count: "exact", head: true });
        counts[t] = count || 0;
      }
      setStats(counts);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object");
    const csv = [
      cols.join(","),
      ...filtered.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${active}.csv`;
    a.click();
  };

  const deleteRow = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await (supabase as any).from(active).delete().eq("id", id);
    load(active);
  };

  const cols = rows[0]
    ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object").slice(0, 8)
    : [];

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-4 md:-m-6 bg-[hsl(215_30%_10%)] text-foreground">
      {/* Left rail */}
      <aside className="w-64 bg-[hsl(215_35%_8%)] border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border flex items-center gap-2">
          <Database className="w-5 h-5 text-sidebar-primary" />
          <span className="font-bold text-sidebar-foreground">Database Admin</span>
        </div>
        <div className="p-3">
          <Input
            placeholder="Search tables..."
            className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground h-8"
          />
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 text-sm">
          {TABLES.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${
                active === t
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> {t}
              </span>
              <Badge variant="secondary" className="text-[10px]">{stats[t] ?? "—"}</Badge>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/60 space-y-1">
          <div className="flex items-center gap-2"><Server className="w-3 h-3" /> Postgres • Supabase</div>
          <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-success" /> Connected</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <div className="bg-[hsl(215_28%_14%)] border-b border-sidebar-border px-4 py-2 flex items-center gap-3 text-sm">
          <Shield className="w-4 h-4 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">Enterprise Database Console</span>
          <span className="text-sidebar-foreground/40">/</span>
          <span className="text-sidebar-foreground/70 capitalize">{active.replace(/_/g, " ")}</span>
          <div className="flex-1" />
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-sidebar-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quick Search..."
              className="pl-7 pr-3 py-1 rounded bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/40 text-xs w-56 outline-none border border-sidebar-border"
            />
          </div>
          <Calendar className="w-4 h-4 text-sidebar-foreground/60" />
          <HelpCircle className="w-4 h-4 text-sidebar-foreground/60" />
        </div>

        {/* Action toolbar (orange like reference) */}
        <div className="bg-[hsl(215_28%_18%)] border-b border-sidebar-border px-3 py-2 flex flex-wrap items-center gap-2">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8">
            <Plus className="w-4 h-4 mr-1" /> New Record
          </Button>
          <Button size="sm" variant="secondary" className="h-8" onClick={() => load(active)}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="secondary" className="h-8">
            <Save className="w-4 h-4 mr-1" /> Save Changes
          </Button>
          <Button size="sm" variant="secondary" className="h-8" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="secondary" className="h-8" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <div className="ml-auto text-xs text-sidebar-foreground/60">
            {filtered.length} rows • {loading ? "loading…" : "ready"}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[hsl(215_30%_12%)]">
          {[
            { label: "Total Records", val: filtered.length, color: "from-blue-500/30 to-blue-700/10" },
            { label: "Tables", val: TABLES.length, color: "from-emerald-500/30 to-emerald-700/10" },
            { label: "Columns", val: cols.length, color: "from-amber-500/30 to-amber-700/10" },
            { label: "Health", val: "OK", color: "from-rose-500/30 to-rose-700/10" },
          ].map((k) => (
            <Card key={k.label} className={`bg-gradient-to-br ${k.color} border-sidebar-border`}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-sidebar-foreground">{k.val}</div>
                <div className="text-xs text-sidebar-foreground/70">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data grid */}
        <div className="flex-1 overflow-auto p-4">
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="py-2 px-3 border-b border-sidebar-border">
              <CardTitle className="text-sm text-sidebar-foreground capitalize">
                {active.replace(/_/g, " ")} • Live View
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[55vh]">
                <table className="w-full text-xs text-sidebar-foreground">
                  <thead className="bg-[hsl(215_28%_18%)] sticky top-0">
                    <tr>
                      {cols.map((c) => (
                        <th key={c} className="px-3 py-2 text-left border-b border-sidebar-border whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                      <th className="px-3 py-2 border-b border-sidebar-border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="hover:bg-sidebar-accent/40 border-b border-sidebar-border/50">
                        {cols.map((c) => (
                          <td key={c} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                            {String(r[c] ?? "—")}
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive"
                            onClick={() => deleteRow(r.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr><td colSpan={cols.length + 1} className="text-center py-8 text-sidebar-foreground/50">No records</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DatabaseAdminPage;