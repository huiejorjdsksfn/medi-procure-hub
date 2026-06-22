import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, Globe, Phone, Mail, MapPin, Calendar,
  Heart, Shield, Zap, BarChart3, MessageSquare, Package,
  FileText, CheckCircle2, Smartphone, Monitor,
} from "lucide-react";

const AboutPage = () => {
  const version = "v11.14.0";
  const buildDate = new Date().toLocaleDateString("en-KE", {
    day: "2-digit", month: "long", year: "numeric"
  });

  const features = [
    { icon: ShoppingCart, label: "Requisitions", desc: "Full procurement workflow" },
    { icon: FileText, label: "Purchase Orders", desc: "Three-way matching" },
    { icon: Package, label: "Inventory", desc: "Stock management" },
    { icon: MessageSquare, label: "WhatsApp Hub", desc: "Business automation" },
    { icon: BarChart3, label: "Reports", desc: "Analytics & BI" },
    { icon: Shield, label: "Security", desc: "Role-based access" },
    { icon: Smartphone, label: "Mobile Apps", desc: "iOS & Android" },
    { icon: Monitor, label: "Desktop", desc: "Electron wrapper" },
  ];

  const techStack = [
    "React 18 + TypeScript",
    "Vite 5 Build System",
    "Supabase Backend",
    "PostgreSQL Database",
    "Twilio SMS/WhatsApp",
    "Capacitor Mobile",
    "Electron Desktop",
    "Tailwind CSS",
  ];

  const contact = [
    { icon: Building2, label: "Organization", value: "Embu Level 5 Hospital" },
    { icon: MapPin, label: "Location", value: "Embu County, Kenya" },
    { icon: Globe, label: "Website", value: "procurbosse.edgeone.app" },
    { icon: Mail, label: "Support", value: "support@embu.go.ke" },
    { icon: Phone, label: "Phone", value: "+254 20 1234567" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800">EL5 MediProcure</h1>
        <p className="text-lg text-slate-600">Hospital Procurement & ERP System</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-sm px-3 py-1">
            {version}
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm px-3 py-1">
            Production Ready
          </Badge>
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-sm px-3 py-1">
            Kenya Healthcare
          </Badge>
        </div>
      </div>

      {/* Organization Info */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            About the Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Embu Level 5 Hospital</h3>
              <p className="text-slate-600 mt-1">
                Embu Level 5 Hospital is a premier healthcare facility serving the residents of Embu County and surrounding areas in Kenya. 
                As a Level 5 hospital, it provides specialized medical services including inpatient care, surgical services, 
                maternal and child health services, and comprehensive laboratory and diagnostic services.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              {contact.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg">
                    <c.icon className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{c.label}</div>
                    <div className="font-medium text-slate-700">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600 mb-6">
            <strong>ProcurBosse</strong> is a comprehensive Hospital Procurement & ERP System designed specifically 
            for healthcare facilities in Kenya. It streamlines the entire procurement lifecycle from requisition 
            to payment, with integrated communication channels for stakeholder notifications.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/50 transition-all">
                <f.icon className="w-6 h-6 text-sky-600 mb-2" />
                <div className="font-semibold text-slate-700 text-sm">{f.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="w-5 h-5 text-violet-600" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {techStack.map((tech, i) => (
              <div key={i} className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100 text-center">
                <span className="text-sm font-medium text-violet-700">{tech}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-800">Multi-Platform Support</div>
                <p className="text-sm text-emerald-700 mt-1">
                  Available on Web (primary), Windows/macOS/Linux (Electron), iOS (Capacitor), and Android (Capacitor)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Highlights */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
              <div className="font-bold text-sky-700 mb-2">Procurement Workflow</div>
              <ul className="text-sm text-sky-600 space-y-1">
                <li>✓ Requisition management</li>
                <li>✓ Purchase order generation</li>
                <li>✓ Goods receipt tracking</li>
                <li>✓ Invoice matching</li>
                <li>✓ Payment processing</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="font-bold text-green-700 mb-2">Communication Hub</div>
              <ul className="text-sm text-green-600 space-y-1">
                <li>✓ SMS notifications</li>
                <li>✓ WhatsApp Business</li>
                <li>✓ Email integration</li>
                <li>✓ Voice calls</li>
                <li>✓ Template messaging</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="font-bold text-purple-700 mb-2">Analytics & Reports</div>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>✓ Real-time dashboards</li>
                <li>✓ System utilization</li>
                <li>✓ Budget tracking</li>
                <li>✓ Audit trails</li>
                <li>✓ Export capabilities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-gradient-to-r from-sky-600 to-sky-700 border-sky-500 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm opacity-80">System Information</div>
              <div className="text-2xl font-bold">EL5 MediProcure {version}</div>
              <div className="text-sm opacity-80 mt-1">Build Date: {buildDate}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80">Healthcare ERP Solution</div>
              <div className="font-semibold">For Kenya Healthcare</div>
              <div className="text-sm opacity-80 mt-1">© {new Date().getFullYear()} Embu County Government</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 py-4">
        <p>Built with care for healthcare professionals in Kenya</p>
        <p className="mt-1">
          <span className="inline-flex items-center gap-1">
            <Heart className="w-4 h-4 text-rose-500" /> EL5 MediProcure
          </span>
          {" "}·{" "}
          <span className="inline-flex items-center gap-1">
            <Shield className="w-4 h-4 text-emerald-500" /> Secure & Compliant
          </span>
          {" "}·{" "}
          <span className="inline-flex items-center gap-1">
            <Zap className="w-4 h-4 text-amber-500" /> High Performance
          </span>
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
