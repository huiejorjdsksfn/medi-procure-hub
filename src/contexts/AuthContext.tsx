import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, db } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin" | "database_admin" | "requisitioner"
  | "procurement_officer" | "procurement_manager"
  | "warehouse_officer" | "inventory_manager";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: ProcurementRole) => boolean;
  primaryRole: ProcurementRole;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null,
  roles: [], loading: true,
  signOut: async () => {},
  hasRole: () => false,
  primaryRole: "requisitioner",
});

export const useAuth = () => useContext(AuthContext);

const ROLE_PRIORITY: ProcurementRole[] = [
  "admin","database_admin","procurement_manager",
  "procurement_officer","inventory_manager","warehouse_officer","requisitioner",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [roles,    setRoles]    = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      setProfile(data);
    } catch { /* non-fatal */ }
  };

  const fetchRoles = async (uid: string) => {
    try {
      const { data } = await db.from("user_roles").select("role").eq("user_id", uid);
      setRoles((data as any[] || []).map((r: any) => r.role));
    } catch { setRoles([]); }
  };

  useEffect(() => {
    let mounted = true;
    // Hard safety: loading MUST become false within 6 seconds no matter what
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, 6000);

    // Get session immediately from localStorage (synchronous in supabase-js v2)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id)])
          .finally(() => { if (mounted) { clearTimeout(safety); setLoading(false); } });
      } else {
        clearTimeout(safety);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id)]);
        if (mounted) setLoading(false);
      } else {
        setProfile(null);
        setRoles([]);
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; clearTimeout(safety); subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
  };

  const hasRole = (r: ProcurementRole) => roles.includes(r);
  const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner";

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, signOut, hasRole, primaryRole }}>
      {children}
    </AuthContext.Provider>
  );
};
