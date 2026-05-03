import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, db } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin" | "database_admin" | "requisitioner" | "procurement_officer"
  | "procurement_manager" | "warehouse_officer" | "inventory_manager"
  | "accountant" | "reception";

interface AuthContextType {
  session: Session | null; user: User | null; profile: any | null;
  roles: string[]; loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: string) => boolean;
  hasAnyRole: (rs: string[]) => boolean;
  primaryRole: ProcurementRole;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, roles: [], loading: true,
  signOut: async () => {}, hasRole: () => false, hasAnyRole: () => false,
  primaryRole: "requisitioner", isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

const ROLE_PRIORITY: ProcurementRole[] = [
  "admin","database_admin","procurement_manager","accountant",
  "procurement_officer","inventory_manager","warehouse_officer","reception","requisitioner",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles]     = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      setProfile(data || null);
    } catch { setProfile(null); }
  }

  async function fetchRoles(uid: string) {
    try {
      const { data } = await db.from("user_roles").select("role").eq("user_id", uid);
      let list = (data as any[])?.map((r: any) => r.role) || [];
      if (!list.length) {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (p?.role) list = [p.role];
      }
      // samwise@gmail.com always gets admin
      if (!list.length) {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.email === "samwise@gmail.com") list = ["admin"];
      }
      setRoles(list);
    } catch { setRoles([]); }
  }

  useEffect(() => {
    let timer = setTimeout(() => setLoading(false), 6000);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id)])
          .finally(() => { clearTimeout(timer); setLoading(false); });
      } else { clearTimeout(timer); setLoading(false); }
    }).catch(() => { clearTimeout(timer); setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id)]);
      } else { setProfile(null); setRoles([]); }
    });
    return () => { clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
  };

  const hasRole = (r: string) => roles.includes(r);
  const hasAnyRole = (rs: string[]) => rs.some(r => roles.includes(r));
  const isAdmin = roles.includes("admin");
  const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner";

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, signOut, hasRole, hasAnyRole, primaryRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
