import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Bell,
} from "lucide-react";

// SMS Templates
const SMS_TEMPLATES = [
  {
    id: "low_stock_alert",
    label: "⚠️ Low Stock Alert",
    preview: "[MediProcure] ⚠️ LOW STOCK: {item} — only {qty} {unit} remaining.",
    fields: ["item", "qty", "unit", "to"],
  },
  {
    id: "requisition_pending",
    label: "⏳ Approval Reminder",
    preview: "[MediProcure] ⏳ Requisition {num} is pending your approval.",
    fields: ["num", "to"],
  },
  {
    id: "po_sent",
    label: "📤 PO Sent to Supplier",
    preview: "[MediProcure] 📤 Purchase Order {num} sent to {supplier}.",
    fields: ["num", "supplier", "to"],
  },
  {
    id: "goods_received",
    label: "📦 Goods Received",
    preview: "[MediProcure] 📦 Goods received for PO {num}. Items: {items}.",
    fields: ["num", "items", "to"],
  },
  {
    id: "system_alert",
    label: "🔔 System Alert",
    preview: "[MediProcure] 🔔 {message}",
    fields: ["message", "to"],
  },
  {
    id: "custom",
    label: "✏️ Custom Message",
    preview: "Write your own message below.",
    fields: ["message", "to"],
  },
];

interface SmsLog {
  id: string;
  to_number: string;
  message: string;
  status: string;
  module: string;
  created_at: string;
  twilio_sid?: string;
}

const statusIcon = (status: string) => {
  if (status === "sent") return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
};

const statusBadge = (status: string) => {
  const variants: Record<string, string> = {
    sent: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    queued: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-gray-100 text-gray-800"}`}>
      {statusIcon(status)} {status}
    </span>
  );
};

const CommunicationsPage = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(SMS_TEMPLATES[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("sms_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data as SmsLog[]) ?? []);
    setLoadingLogs(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleTemplateChange = (id: string) => {
    const tpl = SMS_TEMPLATES.find((t) => t.id === id)!;
    setSelectedTemplate(tpl);
    setFields({});
  };

  const handleSend = async () => {
    const recipient = fields.to?.trim();
    if (!recipient) {
      toast({ title: "Recipient required", description: "Enter a phone number (e.g. +254712345678)", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const templateData: Record<string, string> = { ...fields };
      delete templateData.to;

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          event: selectedTemplate.id,
          to: recipient,
          templateData,
          ...(selectedTemplate.id === "custom" ? { message: fields.message } : {}),
        },
      });

      if (error) throw error;

      if (data?.ok) {
        toast({
          title: "SMS Sent",
          description: `Message delivered to ${recipient}${data.sid ? ` (SID: ${data.sid})` : ""}`,
        });
      } else {
        toast({
          title: data?.sent === false ? "Logged (not sent)" : "Send failed",
          description: data?.reason ?? "Check Twilio configuration.",
          variant: data?.sent === false ? "default" : "destructive",
        });
      }

      setFields({});
      fetchLogs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Communications
        </h1>
        <Badge variant="outline" className="gap-1 text-xs">
          <Phone className="w-3 h-3" /> Twilio SMS
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4" /> Send SMS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              <div className="space-y-1.5">
                <Label>Message Template</Label>
                <Select value={selectedTemplate.id} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMS_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground bg-muted/60 rounded p-2 leading-relaxed">
                  {selectedTemplate.preview}
                </p>
              </div>

              {/* Dynamic fields */}
              {selectedTemplate.fields.map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field} className="capitalize">
                    {field === "to" ? "📱 Recipient Phone" : field.replace(/_/g, " ")}
                  </Label>
                  {field === "message" ? (
                    <Textarea
                      id={field}
                      value={fields[field] ?? ""}
                      onChange={(e) => setFields((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={field === "message" ? "Enter your message..." : `Enter ${field}`}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  ) : (
                    <Input
                      id={field}
                      value={fields[field] ?? ""}
                      onChange={(e) => setFields((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={
                        field === "to" ? "+254712345678" :
                        field === "qty" ? "12" :
                        field === "unit" ? "boxes" :
                        `Enter ${field}`
                      }
                      className="text-sm"
                    />
                  )}
                </div>
              ))}

              <Button
                onClick={handleSend}
                disabled={sending}
                className="w-full gap-2"
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Message</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" /> Delivery Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                {["sent", "failed", "queued"].map((s) => (
                  <div key={s} className="rounded-lg bg-muted/50 p-2">
                    <div className="text-lg font-bold text-foreground">
                      {logs.filter((l) => l.status === s).length}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{s}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SMS Log */}
        <div className="lg:col-span-2">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> SMS Log
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loadingLogs} className="gap-1 h-8">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No messages sent yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-mono text-foreground truncate">{log.to_number}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusBadge(log.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-5">{log.message}</p>
                      {log.twilio_sid && (
                        <p className="text-xs text-muted-foreground/60 pl-5 font-mono">SID: {log.twilio_sid}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommunicationsPage;
