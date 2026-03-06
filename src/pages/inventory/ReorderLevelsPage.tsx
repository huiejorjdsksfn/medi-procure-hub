import { useState } from "react";
import { Search, Plus, Download, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ReorderLevelsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reorder Levels</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure minimum stock and reorder points</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
            <Plus className="w-4 h-4 mr-2" />New Reorder Level
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search reorder levels..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Code</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Name</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Current Stock</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Min Level</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Reorder Qty</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Lead Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No records found. Click "New Reorder Level" to get started.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
