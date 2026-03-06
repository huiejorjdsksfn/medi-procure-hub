import { useState } from "react";
import { Settings, Bell, Shield, Database, Globe, Building2, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sections = [
  { id: "hospital", label: "Hospital Details", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Database },
  { id: "regional", label: "Regional Settings", icon: Globe },
];

export default function SettingsPage() {
  const [active, setActive] = useState("hospital");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure MediProcure ERP system settings</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" />Save Changes
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                  ${active === s.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
                <s.icon className="w-4 h-4" />{s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">
          {active === "hospital" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Hospital Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Hospital Name</Label>
                  <Input className="mt-1" defaultValue="Embu Level 5 Hospital" />
                </div>
                <div>
                  <Label>KHIS Code</Label>
                  <Input className="mt-1" defaultValue="EL5H" />
                </div>
                <div>
                  <Label>Facility Type</Label>
                  <Input className="mt-1" defaultValue="Level 5 Referral Hospital" />
                </div>
                <div>
                  <Label>County</Label>
                  <Input className="mt-1" defaultValue="Embu County" />
                </div>
                <div>
                  <Label>Financial Year Start</Label>
                  <Input className="mt-1" defaultValue="July 1" />
                </div>
                <div>
                  <Label>Default Currency</Label>
                  <Input className="mt-1" defaultValue="KES (Kenyan Shilling)" />
                </div>
                <div>
                  <Label>VAT Rate (%)</Label>
                  <Input className="mt-1" defaultValue="16" type="number" />
                </div>
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Notification Settings</h2>
              {[
                "Email notifications for PO approvals",
                "SMS alerts for low stock items",
                "Email digest for daily transactions",
                "Alerts for overdue payments",
                "Supplier bid submission notifications",
                "Budget threshold warnings",
              ].map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          )}

          {active === "security" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Security Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Input className="mt-1" defaultValue="30" type="number" />
                </div>
                <div>
                  <Label>Password Min. Length</Label>
                  <Input className="mt-1" defaultValue="8" type="number" />
                </div>
                <div className="col-span-2 space-y-3">
                  {["Enforce 2-Factor Authentication", "Allow password reset via email", "Log all user activities"].map(i => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-slate-700">{i}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(active === "integrations" || active === "regional") && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Configuration coming soon</p>
              <p className="text-sm text-slate-400 mt-1">This section is being configured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
