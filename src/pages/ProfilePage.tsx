import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, Building2, Key, Save, RefreshCw, Shield, Clock, CheckCircle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer",
  inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer",
  requisitioner: "Requisitioner",
};

export default function ProfilePage() {
  const { user, profile, roles } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone_number || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [saving, setSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone_number || "");
      setDepartment(profile.department || "");
    }
    if (user) {
      (supabase as any).from("audit_log")
        .select("action,module,created_at").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(8)
        .then(({ data }: any) => setActivityLog(data || []));
    }
  }, [profile, user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("profiles").update({
        full_name: fullName,
        phone_number: phone,
        department: department,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated", description: "Your profile has been saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const sendPasswordReset = async () => {
    const email = user?.email;
    if (!email) return;
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Reset email sent", description: `Password reset link sent to ${email}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setResetSending(false);
  };

  const primaryRole = roles.includes("admin") ? "admin"
    : roles.includes("procurement_manager") ? "procurement_manager"
    : roles.includes("procurement_officer") ? "procurement_officer"
    : roles.includes("inventory_manager") ? "inventory_manager"
    : roles.includes("warehouse_officer") ? "warehouse_officer"
    : "requisitioner";

  const initials = fullName.split(" ").map(n=>n[0]?.toUpperCase()||"").slice(0,2).join("");

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Profile header */}
      <div className="rounded-2xl p-6" style={{background:"linear-gradient(135deg,#1a3a6b,#1d4a87)",boxShadow:"0 4px 20px rgba(26,58,107,0.3)"}}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
            style={{background:"rgba(255,255,255,0.2)"}}>
            {initials||"U"}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{fullName||"My Profile"}</h1>
            <p className="text-white/60 text-sm mt-0.5">{user?.email}</p>
            <span className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold"
              style={{background:"rgba(255,255,255,0.2)",color:"#fff"}}>
              {ROLE_LABELS[primaryRole]||primaryRole}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Edit profile */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Personal Information
          </h2>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Phone Number</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Department</label>
            <input value={department} onChange={e=>setDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
            <input value={user?.email||""} readOnly
              className="w-full px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400" />
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all w-full justify-center"
            style={{background:"#1a3a6b",opacity:saving?0.7:1}}>
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
            {saving?"Saving…":"Save Profile"}
          </button>
        </div>

        <div className="space-y-4">
          {/* Password Reset */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" /> Password Reset
            </h2>
            <p className="text-xs text-gray-500">A password reset link will be sent to your registered email address.</p>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user?.email}</span>
              </div>
            </div>
            {resetSent ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Reset link sent! Check your email.</span>
              </div>
            ) : (
              <button onClick={sendPasswordReset} disabled={resetSending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold w-full justify-center text-white transition-all"
                style={{background:"#f59e0b",opacity:resetSending?0.7:1}}>
                {resetSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Key className="w-3.5 h-3.5"/>}
                {resetSending?"Sending…":"Send Password Reset Email"}
              </button>
            )}
          </div>

          {/* Account info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" /> Account Details
            </h2>
            <div className="space-y-2">
              {[
                {label:"User ID",val:user?.id?.slice(0,16)+"…"},
                {label:"Role",val:ROLE_LABELS[primaryRole]},
                {label:"Account Created",val:user?.created_at?new Date(user.created_at).toLocaleDateString("en-KE"):"—"},
                {label:"Last Sign In",val:user?.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"},
              ].map(r=>(
                <div key={r.label} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="font-semibold text-gray-700 font-mono text-[10px]">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {activityLog.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Recent Activity
          </h2>
          <div className="space-y-1">
            {activityLog.map((a,i)=>(
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 text-xs">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                  {i+1}
                </div>
                <span className="flex-1 text-gray-600"><span className="font-semibold capitalize">{a.action}</span> in {a.module}</span>
                <span className="text-gray-400 text-[10px]">{a.created_at?new Date(a.created_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
