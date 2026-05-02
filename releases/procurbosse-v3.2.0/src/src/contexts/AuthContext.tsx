import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, db } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin"
  | "database_admin"
  | "requisitioner"
  | "procurement_officer"
  | "procurement_manager"
  | "warehouse_officer"
  | "inventory_manager"
  | "accountant"
  | "reception";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: ProcurementRole | string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  primaryRole: ProcurementRole;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  hasRole: () => false,
  hasAnyRole: () => false,
  primaryRole: "requisitioner",
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

const ROLE_PRIORITY: ProcurementRole[] = [
  "admin",
  "database_admin",
  "procurement_manager",
  "accountant",
  "procurement_officer",
  "inventory_manager",
  "warehouse_officer",
  "reception",
  "requisitioner",
];

const SAFETY_TIMEOUT_MS = 6000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data || null);
    } catch {
      setProfile(null);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roleList = (data as any[])?.map((r: any) => r.role) || [];
      // Fallback: if no roles, check profiles.role column
      if (roleList.length === 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (p?.role) roleList.push(p.role);
      }
      setRoles(roleList);
    } catch {
      setRoles([]);
    }
  };

  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout>;

    // Safety: always resolve loading after timeout
    safetyTimer = setTimeout(() => setLoading(false), SAFETY_TIMEOUT_MS);

    // Get initial session first (no Supabase round-trip delay)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]).finally(() => {
          clearTimeout(safetyTimer);
          setLoading(false);
        });
      } else {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(safetyTimer);
      setLoading(false);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await Promise.all([
            fetchProfile(session.user.id),
            fetchRoles(session.user.id),
          ]);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: string) => roles.includes(role);
  const hasAnyRole = (checkRoles: string[]) => checkRoles.some(r => roles.includes(r));
  const isAdmin = roles.includes("admin");

  const primaryRole: ProcurementRole =
    ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner";

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles, loading,
      signOut, hasRole, hasAnyRole, primaryRole, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
