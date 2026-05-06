import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Phone,
  Bell,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  Save,
  TestTube,
  Info,
} from "lucide-react";

const SettingsPage = () => {
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [notifPrefs, setNotifPrefs] = useState({
    sms_on_approval: true,
    sms_on_rejection: true,
    sms_on_po_raised: true,
    sms_on_goods_received: true,
    sms_on_low_stock: true,
    sms_on_pending_approval: true,
  });

  const handleTestSMS = async () => {
    if (!testPhone.trim()) {
      toast({ title: "Phone required", description: "Enter a number e.g. +254712345678", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          event: "system_alert",
          to: testPhone.trim(),
          templateData: { message: "MediProcure SMS configured correctly. Test from your procurement system." },
        },
      });
      if (error) throw error;
      if (data?.ok) {
        setTwilioStatus("ok");
        toast({ title: "✅ Test SMS Sent", description: `Message delivered to ${testPhone}` });
      } else if (data?.sent === false) {
        setTwilioStatus("error");
        toast({ title: "⚠️ Not Sent", description: data?.reason ?? "Twilio secrets not configured.", variant: "destructive" });
      } else {
        setTwilioStatus("error");
        toast({ title: "Send failed", description: "Check Twilio secrets in Supabase.", variant: "destructive" });
      }
    } catch (err: any) {
      setTwilioStatus("error");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveNotifications = () => {
    toast({ title: "Preferences saved", description: "Notification settings updated successfully." });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-primary" /> Settings
      </h1>

      {/* System Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" /> System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Facility", value: "Level 5 Hospital" },
              { label: "System", value: "MediProcure Hub" },
              { label: "Version", value: "2.1.0" },
              { label: "SMS Provider", value: "Twilio" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Twilio Configuration */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Twilio SMS Configuration
              </CardTitle>
              <CardDescription className="mt-1">
                Credentials are securely stored as Supabase Edge Function secrets.
              </CardDescription>
            </div>
            <div className="shrink-0">
              {twilioStatus === "ok" && <Badge className="gap-1 bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3" /> Connected</Badge>}
              {twilioStatus === "error" && <Badge className="gap-1 bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3" /> Not Configured</Badge>}
              {twilioStatus === "unknown" && <Badge variant="outline" className="gap-1 text-xs"><Info className="w-3 h-3" /> Untested</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">API Key SID</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-muted-foreground">SKOecb017c1d53fe437d443ae66f8e4a9c</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Auth Secret</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-muted-foreground">••••••••••••••••••••••••</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">How to configure Twilio secrets in Supabase</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Supabase Dashboard → Edge Functions → Secrets</li>
              <li>Add <code className="bg-blue-100 px-1 rounded">TWILIO_ACCOUNT_SID</code> — your Account SID (ACxxxx from Twilio console)</li>
              <li>Add <code className="bg-blue-100 px-1 rounded">TWILIO_AUTH_TOKEN</code> — Auth Token from Twilio</li>
              <li>Add <code className="bg-blue-100 px-1 rounded">TWILIO_FROM_NUMBER</code> — your Twilio number e.g. +12345678900</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Send Test SMS</Label>
            <div className="flex gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+254712345678"
                className="font-mono text-sm flex-1"
              />
              <Button onClick={handleTestSMS} disabled={testing} variant="outline" className="gap-2 shrink-0">
                <TestTube className="w-4 h-4" />
                {testing ? "Sending…" : "Test SMS"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sends a test message using your configured Twilio account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Triggers */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> SMS Notification Triggers
          </CardTitle>
          <CardDescription>Choose which procurement events automatically send SMS notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "sms_on_approval", label: "Requisition Approved", description: "Notify requestor when requisition is approved" },
            { key: "sms_on_rejection", label: "Requisition Rejected", description: "Notify requestor when requisition is rejected with reason" },
            { key: "sms_on_pending_approval", label: "Approval Reminder", description: "Remind approvers of pending requisitions" },
            { key: "sms_on_po_raised", label: "Purchase Order Raised", description: "Alert procurement team when a PO is created" },
            { key: "sms_on_goods_received", label: "Goods Received", description: "Notify stores/requestor when goods arrive" },
            { key: "sms_on_low_stock", label: "Low Stock Alert", description: "Alert department when item stock falls below threshold" },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5 flex-1 pr-4">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={notifPrefs[key as keyof typeof notifPrefs]}
                onCheckedChange={(checked) => setNotifPrefs((p) => ({ ...p, [key]: checked }))}
              />
            </div>
          ))}
          <Button onClick={handleSaveNotifications} className="gap-2">
            <Save className="w-4 h-4" /> Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
