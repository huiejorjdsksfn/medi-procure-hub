import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, db } from "@/integrations/supabase/client";

export type ProcurementRole = 
  | "admin" 
  | "requisitioner" 
  | "procurement_officer" 
  | "procurement_manager" 
  | "warehouse_officer" 
  | "inventory_manager";

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
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  hasRole: () => false,
  primaryRole: "requisitioner",
});

export const useAuth = () => useContext(AuthContext);

const ROLE_PRIORITY: ProcurementRole[] = [
  "admin",
  "procurement_manager",
  "procurement_officer",
  "inventory_manager",
  "warehouse_officer",
  "requisitioner",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data as any[])?.map((r: any) => r.role) || []);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            await fetchRoles(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: ProcurementRole) => roles.includes(role);
  
  const primaryRole: ProcurementRole = 
    ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner";

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, signOut, hasRole, primaryRole }}>
      {children}
    </AuthContext.Provider>
  );
};
