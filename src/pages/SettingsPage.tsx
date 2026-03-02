import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, User, Building2, Database, Shield, Copy, Terminal } from "lucide-react";

const SettingsPage = () => {
  const { profile, user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [form, setForm] = useState({
    full_name: profile?.full_name || "", phone_number: profile?.phone_number || "", department: profile?.department || "",
  });
  const [odbc, setOdbc] = useState({
    server: "", database: "", port: "1433", username: "", password: "", driver: "ODBC Driver 17 for SQL Server",
  });
  const [sysSettings, setSysSettings] = useState({
    hospital_name: "Embu Level 5 Hospital", tax_rate: "16", currency: "KSH",
    approval_threshold: "50000", auto_po_numbering: true, email_notifications: true,
    audit_retention_days: "365", fiscal_year_start: "July", requisition_prefix: "RQQ/EL5H",
    po_prefix: "LPO/EL5H", grn_prefix: "GRN/EL5H",
  });
  const [saving, setSaving] = useState(false);
  const [connString, setConnString] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user?.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
    setSaving(false);
  };

  const generateODBCString = () => {
    if (!odbc.server || !odbc.database) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    const str = `Driver={${odbc.driver}};Server=${odbc.server},${odbc.port};Database=${odbc.database};Uid=${odbc.username};Pwd=${odbc.password};Encrypt=yes;TrustServerCertificate=yes;`;
    setConnString(str);
    toast({ title: "Connection string generated" });
  };

  const copyConnString = () => {
    navigator.clipboard.writeText(connString);
    toast({ title: "Copied to clipboard" });
  };

  // Sample ODBC code
  const odbcCode = `const odbc = require('odbc');

async function connect() {
  try {
    const connection = await odbc.connect(\`${connString || 'DSN=mydsn;UID=user;PWD=pass'}\`);
    const result = await connection.query('SELECT * FROM mytable');
    console.log(result);
    await connection.close();
  } catch (err) {
    console.error(err);
  }
}

connect();`;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><SettingsIcon className="w-6 h-6" /> Settings</h1>

      <Card className="border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} placeholder="+254 7XX" /></div>
              <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled className="bg-muted" /></div>
            </div>
            <Button type="submit" disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> System Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Hospital Name</Label><Input value={sysSettings.hospital_name} onChange={e => setSysSettings({...sysSettings, hospital_name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={sysSettings.tax_rate} onChange={e => setSysSettings({...sysSettings, tax_rate: e.target.value})} /></div>
                <div className="space-y-2"><Label>Currency</Label><Input value={sysSettings.currency} onChange={e => setSysSettings({...sysSettings, currency: e.target.value})} /></div>
                <div className="space-y-2"><Label>Approval Threshold</Label><Input type="number" value={sysSettings.approval_threshold} onChange={e => setSysSettings({...sysSettings, approval_threshold: e.target.value})} /></div>
                <div className="space-y-2"><Label>Audit Retention (days)</Label><Input type="number" value={sysSettings.audit_retention_days} onChange={e => setSysSettings({...sysSettings, audit_retention_days: e.target.value})} /></div>
                <div className="space-y-2"><Label>Fiscal Year Start</Label><Input value={sysSettings.fiscal_year_start} onChange={e => setSysSettings({...sysSettings, fiscal_year_start: e.target.value})} /></div>
                <div className="space-y-2"><Label>Requisition Prefix</Label><Input value={sysSettings.requisition_prefix} onChange={e => setSysSettings({...sysSettings, requisition_prefix: e.target.value})} /></div>
                <div className="space-y-2"><Label>PO Prefix</Label><Input value={sysSettings.po_prefix} onChange={e => setSysSettings({...sysSettings, po_prefix: e.target.value})} /></div>
                <div className="space-y-2"><Label>GRN Prefix</Label><Input value={sysSettings.grn_prefix} onChange={e => setSysSettings({...sysSettings, grn_prefix: e.target.value})} /></div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                <div><Label>Auto PO Numbering</Label><p className="text-xs text-muted-foreground">Automatically generate PO numbers</p></div>
                <Switch checked={sysSettings.auto_po_numbering} onCheckedChange={v => setSysSettings({...sysSettings, auto_po_numbering: v})} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><Label>Email Notifications</Label><p className="text-xs text-muted-foreground">Send email on approvals</p></div>
                <Switch checked={sysSettings.email_notifications} onCheckedChange={v => setSysSettings({...sysSettings, email_notifications: v})} />
              </div>
              <Button variant="outline" onClick={() => toast({ title: "System settings saved (local)" })}><Save className="w-4 h-4 mr-1" /> Save System Settings</Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> External SQL Server (ODBC)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Configure connection to external SQL Server for data synchronization.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Server Host</Label><Input value={odbc.server} onChange={e => setOdbc({...odbc, server: e.target.value})} placeholder="192.168.1.100" /></div>
                <div className="space-y-2"><Label>Port</Label><Input value={odbc.port} onChange={e => setOdbc({...odbc, port: e.target.value})} /></div>
                <div className="space-y-2"><Label>Database Name</Label><Input value={odbc.database} onChange={e => setOdbc({...odbc, database: e.target.value})} placeholder="HospitalDB" /></div>
                <div className="space-y-2"><Label>ODBC Driver</Label><Input value={odbc.driver} onChange={e => setOdbc({...odbc, driver: e.target.value})} /></div>
                <div className="space-y-2"><Label>Username</Label><Input value={odbc.username} onChange={e => setOdbc({...odbc, username: e.target.value})} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={odbc.password} onChange={e => setOdbc({...odbc, password: e.target.value})} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={generateODBCString} variant="outline"><Database className="w-4 h-4 mr-1" /> Generate Connection String</Button>
                {connString && <Button onClick={copyConnString} variant="outline" size="sm"><Copy className="w-4 h-4 mr-1" /> Copy</Button>}
              </div>
              {connString && (
                <div className="space-y-2">
                  <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all border border-border">{connString}</div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Terminal className="w-3 h-3" /> Node.js ODBC Usage</Label>
                    <Textarea value={odbcCode} readOnly className="font-mono text-xs h-48 bg-muted" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> System Information</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Hospital:</span> Embu Level 5 Hospital</p>
          <p><span className="text-muted-foreground">System:</span> MediProcure ERP Suite v2.0</p>
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
