import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, User, Building2, Database, Shield, Bell, Palette } from "lucide-react";

const SettingsPage = () => {
  const { profile, user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone_number: profile?.phone_number || "",
    department: profile?.department || "",
  });
  const [odbc, setOdbc] = useState({
    server: "", database: "", port: "1433", username: "", password: "", driver: "ODBC Driver 17 for SQL Server",
  });
  const [sysSettings, setSysSettings] = useState({
    hospital_name: "Embu Level 5 Hospital",
    tax_rate: "16",
    currency: "KSH",
    approval_threshold: "50000",
    auto_po_numbering: true,
    email_notifications: true,
    audit_retention_days: "365",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user?.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
    setSaving(false);
  };

  const testODBC = () => {
    if (!odbc.server || !odbc.database) {
      toast({ title: "Missing fields", description: "Server and database name are required", variant: "destructive" });
      return;
    }
    const connStr = `Driver={${odbc.driver}};Server=${odbc.server},${odbc.port};Database=${odbc.database};Uid=${odbc.username};Pwd=****;`;
    toast({ title: "ODBC Connection String Generated", description: connStr });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" /> Settings
      </h1>

      <Card className="border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Settings</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+254 7XX XXX XXX" /></div>
            <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled className="bg-muted" /></div>
            <Button type="submit" disabled={saving} className="gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}</Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> System Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Hospital Name</Label><Input value={sysSettings.hospital_name} onChange={e => setSysSettings({...sysSettings, hospital_name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={sysSettings.tax_rate} onChange={e => setSysSettings({...sysSettings, tax_rate: e.target.value})} /></div>
                <div className="space-y-2"><Label>Currency</Label><Input value={sysSettings.currency} onChange={e => setSysSettings({...sysSettings, currency: e.target.value})} /></div>
                <div className="space-y-2"><Label>Approval Threshold (KSH)</Label><Input type="number" value={sysSettings.approval_threshold} onChange={e => setSysSettings({...sysSettings, approval_threshold: e.target.value})} /></div>
                <div className="space-y-2"><Label>Audit Log Retention (days)</Label><Input type="number" value={sysSettings.audit_retention_days} onChange={e => setSysSettings({...sysSettings, audit_retention_days: e.target.value})} /></div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div><Label>Auto PO Numbering</Label><p className="text-xs text-muted-foreground">Automatically generate PO numbers</p></div>
                <Switch checked={sysSettings.auto_po_numbering} onCheckedChange={v => setSysSettings({...sysSettings, auto_po_numbering: v})} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><Label>Email Notifications</Label><p className="text-xs text-muted-foreground">Send email on approvals and status changes</p></div>
                <Switch checked={sysSettings.email_notifications} onCheckedChange={v => setSysSettings({...sysSettings, email_notifications: v})} />
              </div>
              <Button variant="outline" onClick={() => toast({ title: "Settings saved (local)" })}><Save className="w-4 h-4 mr-1" /> Save System Settings</Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> External SQL Server (ODBC)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Configure connection to external SQL Server for data sync.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Server Host</Label><Input value={odbc.server} onChange={e => setOdbc({ ...odbc, server: e.target.value })} placeholder="192.168.1.100 or hostname" /></div>
                <div className="space-y-2"><Label>Port</Label><Input value={odbc.port} onChange={e => setOdbc({ ...odbc, port: e.target.value })} /></div>
                <div className="space-y-2"><Label>Database Name</Label><Input value={odbc.database} onChange={e => setOdbc({ ...odbc, database: e.target.value })} placeholder="HospitalDB" /></div>
                <div className="space-y-2"><Label>ODBC Driver</Label><Input value={odbc.driver} onChange={e => setOdbc({ ...odbc, driver: e.target.value })} /></div>
                <div className="space-y-2"><Label>Username</Label><Input value={odbc.username} onChange={e => setOdbc({ ...odbc, username: e.target.value })} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={odbc.password} onChange={e => setOdbc({ ...odbc, password: e.target.value })} /></div>
              </div>
              <Button onClick={testODBC} variant="outline" className="gap-1.5"><Database className="w-4 h-4" /> Generate Connection String</Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> System Information</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><span className="text-muted-foreground">Hospital:</span> Embu Level 5 Hospital</p>
          <p><span className="text-muted-foreground">System:</span> MediProcure Procurement Suite</p>
          <p><span className="text-muted-foreground">Address:</span> P.O. Box 33 - 60100, Embu, Kenya</p>
          <p><span className="text-muted-foreground">Phone:</span> +254 68 31055/56</p>
          <p><span className="text-muted-foreground">Email:</span> pghembu@gmail.com</p>
          <p><span className="text-muted-foreground">ISO:</span> 9001:2015 Certified</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
