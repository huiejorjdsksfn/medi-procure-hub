import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" /> Settings
      </h1>
      <Card className="border-border">
        <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">System configuration options will be available here. Contact your administrator for changes.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
