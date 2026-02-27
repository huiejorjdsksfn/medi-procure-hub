import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, User, Building2 } from "lucide-react";

const SettingsPage = () => {
  const { profile, user } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone_number: profile?.phone_number || "",
    department: profile?.department || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user?.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" /> Settings
      </h1>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+254 7XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> System Information</CardTitle>
        </CardHeader>
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
