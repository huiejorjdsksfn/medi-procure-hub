import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Palette, Type, Box, MousePointer, BarChart3, Image as ImageIcon,
  Bell, Layers, ChevronDown, Settings, Map, Bell as BellIcon, Menu, Globe,
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, BarChart, Bar } from "recharts";

const data1 = Array.from({ length: 12 }, (_, i) => ({ x: i, y: Math.round(Math.random() * 50 + 30) }));
const data2 = Array.from({ length: 30 }, (_, i) => ({ x: i, y: Math.round(Math.random() * 30 + 50) }));
const data3 = Array.from({ length: 30 }, (_, i) => ({ x: i, y: Math.round(Math.random() * 60 + 20) }));
const data4 = Array.from({ length: 20 }, (_, i) => ({ x: i, y: Math.round(Math.random() * 40 + 10) }));

const traffic = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  visitors: Math.round(80 + Math.sin(i / 3) * 40 + Math.random() * 60),
  pageviews: Math.round(120 + Math.cos(i / 4) * 50 + Math.random() * 40),
}));

const WebmasterPage = () => {
  const [counts, setCounts] = useState({ users: 0, items: 0, pos: 0, suppliers: 0 });

  useEffect(() => {
    (async () => {
      const [u, i, p, s] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ users: u.count || 0, items: i.count || 0, pos: p.count || 0, suppliers: s.count || 0 });
    })();
  }, []);

  const tiles = [
    { val: counts.users.toLocaleString(), label: "Members online", bg: "bg-cyan-400", chart: "line", data: data1 },
    { val: counts.items.toLocaleString(), label: "Items in catalog", bg: "bg-sky-500", chart: "area", data: data2 },
    { val: counts.pos.toLocaleString(), label: "Purchase orders", bg: "bg-amber-400", chart: "wave", data: data3 },
    { val: counts.suppliers.toLocaleString(), label: "Active suppliers", bg: "bg-rose-400", chart: "bar", data: data4 },
  ];

  return (
    <div className="-m-4 md:-m-6 min-h-[calc(100vh-3.5rem)] flex bg-[#f5f7fa]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 hidden md:flex flex-col text-sm">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-cyan-500 flex items-center justify-center text-white font-bold text-xs">WM</div>
          <span className="font-bold text-slate-700">WEBMASTER</span>
        </div>
        <button className="flex items-center justify-between px-4 py-2 bg-cyan-50 text-cyan-700 font-medium border-l-4 border-cyan-500">
          <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Dashboard</span>
          <span className="text-[10px] bg-cyan-500 text-white px-1.5 rounded">NEW</span>
        </button>
        <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Theme</div>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50"><Palette className="w-4 h-4" /> Colors</button>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50"><Type className="w-4 h-4" /> Typography</button>
        <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Components</div>
        <button className="flex items-center justify-between px-4 py-2 text-slate-600 hover:bg-slate-50">
          <span className="flex items-center gap-2"><Box className="w-4 h-4" /> Base</span><ChevronDown className="w-3 h-3" />
        </button>
        <button className="flex items-center justify-between px-4 py-2 text-slate-600 hover:bg-slate-50">
          <span className="flex items-center gap-2"><MousePointer className="w-4 h-4" /> Buttons</span><ChevronDown className="w-3 h-3" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50"><BarChart3 className="w-4 h-4" /> Charts</button>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50"><ImageIcon className="w-4 h-4" /> Icons</button>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50"><Bell className="w-4 h-4" /> Notifications</button>
        <button className="flex items-center justify-between px-4 py-2 text-slate-600 hover:bg-slate-50">
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Widgets</span>
          <span className="text-[10px] bg-cyan-500 text-white px-1.5 rounded">NEW</span>
        </button>
        <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Extras</div>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50"><Settings className="w-4 h-4" /> Pages</button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-4">
          <Menu className="w-5 h-5 text-slate-500" />
          <button className="text-slate-700 font-medium">Admin Panel</button>
          <button className="text-slate-700">Users</button>
          <button className="text-slate-700">Settings</button>
          <div className="flex-1" />
          <BellIcon className="w-5 h-5 text-slate-500" />
          <Globe className="w-5 h-5 text-slate-500" />
          <Map className="w-5 h-5 text-slate-500" />
          <div className="w-8 h-8 rounded-full bg-slate-300" />
        </header>

        <div className="px-4 py-2 text-xs text-slate-500">Home / <span className="text-cyan-600">Dashboard</span></div>

        <div className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map((t) => (
              <Card key={t.label} className={`${t.bg} text-white border-0 shadow overflow-hidden`}>
                <CardContent className="p-4 pb-0">
                  <div className="text-3xl font-bold">{t.val}</div>
                  <div className="text-xs opacity-90">{t.label}</div>
                </CardContent>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    {t.chart === "bar" ? (
                      <BarChart data={t.data}>
                        <Bar dataKey="y" fill="rgba(255,255,255,0.6)" />
                      </BarChart>
                    ) : t.chart === "area" ? (
                      <AreaChart data={t.data}>
                        <Area dataKey="y" stroke="white" fill="rgba(255,255,255,0.3)" />
                      </AreaChart>
                    ) : (
                      <LineChart data={t.data}>
                        <Line dataKey="y" stroke="white" strokeWidth={2} dot={false} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-700">Traffic</div>
                  <div className="text-xs text-slate-400">Last 30 days</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs">Day</Button>
                  <Button size="sm" className="h-7 text-xs bg-cyan-500 hover:bg-cyan-600">Month</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs">Year</Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={traffic}>
                  <Area type="monotone" dataKey="visitors" stroke="#06b6d4" fill="#06b6d433" />
                  <Area type="monotone" dataKey="pageviews" stroke="#10b981" fill="#10b98133" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WebmasterPage;