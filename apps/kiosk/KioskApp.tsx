/**
 * KioskApp — Touch-friendly kiosk for reception & item scanning
 * Roles: reception, warehouse_officer
 * Limited routes: scanner, reception, goods-received, notifications
 */
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ScannerPage from "@/pages/ScannerPage";
import ReceptionPage from "@/pages/ReceptionPage";
import GoodsReceivedPage from "@/pages/GoodsReceivedPage";
import NotificationsPage from "@/pages/NotificationsPage";
import { useState, useEffect } from "react";
import { Eye, EyeOff, MonitorSmartphone, LogOut, Scan, Package, Bell, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60000 } }
});

/* ── Kiosk Login ── */
function KioskLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn(email.trim(), password);
    if (result.error) {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
    } else {
      navigate("/scanner");
    }
    setLoading(false);
  };

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #022c22 0%, #064e3b 50%, #022c22 100%)",
      fontFamily: "'Inter', sans-serif", padding: 24,
    },
    card: {
      width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(20px)", border: "2px solid rgba(16,185,129,0.25)",
      borderRadius: 20, padding: 40, boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
    },
    icon: {
      width: 72, height: 72, borderRadius: "50%",
      background: "linear-gradient(135deg, #059669, #10b981)",
      display: "flex", alignItems: "center", justifyContent: "center",
      margin: "0 auto 20px", boxShadow: "0 0 40px rgba(16,185,129,0.4)",
    },
    title: { color: "#d1fae5", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 6 },
    sub: { color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 32 },
    label: { color: "#a7f3d0", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 10 },
    input: {
      width: "100%", padding: "14px 18px", borderRadius: 12,
      background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(16,185,129,0.2)",
      color: "#d1fae5", fontSize: 16, outline: "none", marginBottom: 20,
    },
    btn: {
      width: "100%", padding: "16px 0",
      background: loading ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #059669, #10b981)",
      border: "none", borderRadius: 12, color: "white",
      fontSize: 17, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
      boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
    },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}><MonitorSmartphone size={34} color="white" /></div>
        <h1 style={s.title}>Kiosk Station</h1>
        <p style={s.sub}>EL5 MediProcure · Embu Level 5 Hospital</p>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Staff Email</label>
          <input style={s.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="staff@embu.go.ke" />
          <label style={s.label}>Password</label>
          <div style={{ position: "relative", marginBottom: 24 }}>
            <input style={{ ...s.input, paddingRight: 48, marginBottom: 0 }}
              type={showPass ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              style={{ position: "absolute", right: 14, top: 14, background: "none", border: "none", cursor: "pointer", color: "#34d399" }}>
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Signing in..." : "🔓 Enter Kiosk"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Kiosk Shell with Nav ── */
function KioskShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { icon: <Scan size={22} />, label: "Scanner", path: "/scanner" },
    { icon: <Users size={22} />, label: "Reception", path: "/reception" },
    { icon: <Package size={22} />, label: "GRN", path: "/goods-received" },
    { icon: <Bell size={22} />, label: "Alerts", path: "/notifications" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#022c22", fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <div style={{
        background: "rgba(6,78,59,0.9)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(16,185,129,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #059669, #10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MonitorSmartphone size={20} color="white" />
          </div>
          <div>
            <div style={{ color: "#d1fae5", fontWeight: 700, fontSize: 15 }}>ProcurBosse Kiosk</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={() => signOut().then(() => navigate("/login"))}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", borderRadius: 8, padding: "8px 16px",
            cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Bottom tab nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(2,44,34,0.95)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(16,185,129,0.2)",
        display: "flex", zIndex: 100,
      }}>
        {nav.map(n => (
          <button key={n.path} onClick={() => navigate(n.path)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "12px 0", background: "none", border: "none",
              color: window.location.pathname === n.path ? "#10b981" : "#6b7280",
              cursor: "pointer", gap: 4, fontSize: 11, fontWeight: 600,
              transition: "color 0.2s",
            }}>
            {n.icon}
            {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 80 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Protected Kiosk Route ── */
function KioskRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate("/login");
  }, [session, loading, navigate]);
  if (loading) return null;
  return <KioskShell>{children}</KioskShell>;
}

export default function KioskApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<KioskLogin />} />
              <Route path="/" element={<Navigate to="/scanner" replace />} />
              <Route path="/scanner" element={<KioskRoute><ScannerPage /></KioskRoute>} />
              <Route path="/reception" element={<KioskRoute><ReceptionPage /></KioskRoute>} />
              <Route path="/goods-received" element={<KioskRoute><GoodsReceivedPage /></KioskRoute>} />
              <Route path="/notifications" element={<KioskRoute><NotificationsPage /></KioskRoute>} />
              <Route path="*" element={<Navigate to="/scanner" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
