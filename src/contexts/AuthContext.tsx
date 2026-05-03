/**
 * AuthContext v5.8.0 — Online + Offline login
 * EL5 MediProcure · Embu Level 5 Hospital
 * Offline login via IndexedDB credential cache
 * Safety timeout: 6s — never hangs on blank screen
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, db } from "@/integrations/supabase/client";
import {
  cacheCredentials, verifyOfflineLogin, hashPassword,
  isOnline, onNetworkChange, cacheSettings,
} from "@/lib/offlineEngine";

export type ProcurementRole =
  | "admin" | "database_admin" | "requisitioner" | "procurement_officer"
  | "procurement_manager" | "warehouse_officer" | "inventory_manager"
  | "accountant" | "reception";

interface AuthContextType {
  session:      Session | null;
  user:         User | null;
  profile:      any | null;
  roles:        string[];
  loading:      boolean;
  online:       boolean;
  offlineMode:  boolean;
  signOut:      () => Promise<void>;
  signIn:       (email: string, password: string) => Promise<{ error?: string }>;
  hasRole:      (r: string) => boolean;
  hasAnyRole:   (rs: string[]) => boolean;
  primaryRole:  ProcurementRole;
  isAdmin:      boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, roles: [], loading: true,
  online: true, offlineMode: false,
  signOut: async () => {}, signIn: async () => ({}),
  hasRole: () => false, hasAnyRole: () => false,
  primaryRole: "requisitioner", isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

const ROLE_PRIORITY: ProcurementRole[] = [
  "admin","database_admin","procurement_manager","accountant",
  "procurement_officer","inventory_manager","warehouse_officer","reception","requisitioner",
];

// Synthetic offline user shape
function makeOfflineUser(email: string): any {
  return { id: `offline_${btoa(email)}`, email, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,     setSession]     = useState<Session | null>(null);
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [roles,       setRoles]       = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [online,      setOnline]      = useState(isOnline());
  const [offlineMode, setOfflineMode] = useState(false);

  // Network monitor
  useEffect(() => {
    const unsub = onNetworkChange(setOnline);
    return unsub;
  }, []);

  async function fetchProfile(uid: string) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (data) { setProfile(data); return data; }
    } catch { /* offline */ }
    return null;
  }

  async function fetchRoles(uid: string, email?: string): Promise<string[]> {
    try {
      const { data } = await db.from("user_roles").select("role").eq("user_id", uid);
      let list = (data as any[])?.map((r: any) => r.role) || [];
      if (!list.length) {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (p?.role) list = [p.role];
      }
      // samwise always admin
      if (email === "samwise@gmail.com" && !list.includes("admin")) list = ["admin", ...list];
      setRoles(list);
      return list;
    } catch { setRoles([]); return []; }
  }

  async function cacheAfterLogin(supaUser: User, fetchedRoles: string[], fetchedProfile: any) {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.access_token) {
        const hash = await hashPassword(s.access_token.slice(-32));
        await cacheCredentials(supaUser.email!, hash, fetchedRoles, fetchedProfile);
      }
    } catch { /* ignore caching errors */ }
  }

  // ── signIn: tries online first, falls back to offline cache ──────────────
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (online) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        const [fetchedProfile, fetchedRoles] = await Promise.all([
          fetchProfile(data.user.id),
          fetchRoles(data.user.id, email),
        ]);
        // Cache credentials for offline use
        try {
          const hash = await hashPassword(password);
          await cacheCredentials(email, hash, fetchedRoles, fetchedProfile);
        } catch { /* ignore */ }
        return {};
      }
      // Online but Supabase failed — try offline cache as fallback
      if (error) {
        const offline = await verifyOfflineLogin(email, await hashPassword(password).catch(() => password));
        if (offline?.ok) {
          setOfflineMode(true);
          setUser(makeOfflineUser(email) as any);
          setRoles(offline.roles);
          setProfile(offline.profile);
          return {};
        }
        return { error: error.message };
      }
    } else {
      // Fully offline — use cached credentials
      const hash = await hashPassword(password).catch(() => password);
      const offline = await verifyOfflineLogin(email, hash);
      if (offline?.ok) {
        setOfflineMode(true);
        setUser(makeOfflineUser(email) as any);
        setRoles(offline.roles);
        setProfile(offline.profile);
        return {};
      }
      return { error: "You are offline and no cached credentials found for this account. Please connect to internet for first login." };
    }
    return { error: "Login failed" };
  };

  // ── Initialise session on mount ───────────────────────────────────────────
  useEffect(() => {
    let timer = setTimeout(() => setLoading(false), 6000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          Promise.all([
            fetchProfile(session.user.id),
            fetchRoles(session.user.id, session.user.email),
          ]).then(([prof, roles]) => {
            // Refresh offline cache on each successful online session
            if (session.user.email) {
              hashPassword(session.access_token?.slice(-32) ?? "")
                .then(hash => cacheCredentials(session.user!.email!, hash, roles, prof))
                .catch(() => {});
            }
          }).finally(() => { clearTimeout(timer); setLoading(false); });
        } else {
          clearTimeout(timer);
          setLoading(false);
        }
      })
      .catch(() => { clearTimeout(timer); setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setOfflineMode(false);
      if (session?.user) {
        await Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id, session.user.email)]);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => { clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    if (!offlineMode) await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]); setOfflineMode(false);
  };

  const hasRole    = (r: string)       => roles.includes(r);
  const hasAnyRole = (rs: string[])    => rs.some(r => roles.includes(r));
  const isAdmin    = roles.includes("admin");
  const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner";

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles, loading, online, offlineMode,
      signOut, signIn, hasRole, hasAnyRole, primaryRole, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
