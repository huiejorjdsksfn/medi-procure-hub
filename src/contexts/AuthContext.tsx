/**
 * ProcurBosse — AuthContext v5.0 NUCLEAR
 * FIXED: initialized always set — no more infinite loading
 * Supabase session + role cache + 3s hard timeout
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin" | "superadmin" | "webmaster" | "database_admin"
  | "procurement_manager" | "procurement_officer"
  | "inventory_manager" | "warehouse_officer"
  | "requisitioner" | "accountant";

const ROLE_PRIORITY: ProcurementRole[] = [
  "superadmin","webmaster","admin","database_admin",
  "procurement_manager","procurement_officer",
  "accountant","inventory_manager","warehouse_officer","requisitioner",
];

const LS_SESSION = "el5_auth_v5";

interface CachedAuth { userId:string; roles:string[]; profile:any; ts:number; }

function readCache(userId:string): CachedAuth|null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const c: CachedAuth = JSON.parse(raw);
    if (c.userId !== userId) return null;
    if (Date.now() - c.ts > 30*60*1000) { localStorage.removeItem(LS_SESSION); return null; }
    return c;
  } catch { return null; }
}

function writeCache(userId:string, roles:string[], profile:any) {
  try { localStorage.setItem(LS_SESSION, JSON.stringify({userId,roles,profile,ts:Date.now()})); } catch {}
}

function clearCache() { try { localStorage.removeItem(LS_SESSION); } catch {} }

interface AuthCtx {
  session:      Session|null;
  user:         User|null;
  profile:      any;
  roles:        string[];
  loading:      boolean;
  initialized:  boolean;
  primaryRole:  ProcurementRole;
  hasRole:      (...r:ProcurementRole[])=>boolean;
  hasAnyRole:   (r:ProcurementRole[])=>boolean;
  signOut:      ()=>Promise<void>;
  refreshRoles: ()=>Promise<void>;
  updateProfile:(d:Partial<any>)=>Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session:null,user:null,profile:null,roles:[],loading:true,initialized:false,
  primaryRole:"requisitioner",
  hasRole:()=>false,hasAnyRole:()=>false,
  signOut:async()=>{},refreshRoles:async()=>{},updateProfile:async()=>{},
});

export const useAuth = () => useContext(Ctx);

async function fetchUserData(userId:string):{profile:any,roles:string[]} {
  try {
    const [pRes,rRes] = await Promise.allSettled([
      (supabase as any).from("profiles").select("*").eq("id",userId).maybeSingle(),
      (supabase as any).from("user_roles").select("role").eq("user_id",userId),
    ]);
    const profile = pRes.status==="fulfilled" ? pRes.value.data : null;
    const roles   = rRes.status==="fulfilled"
      ? ((rRes.value.data as any[])||[]).map((r:any)=>r.role)
      : [];
    return { profile, roles };
  } catch { return { profile:null, roles:[] }; }
}

export function AuthProvider({ children }:{ children:ReactNode }) {
  const [session,     setSession]     = useState<Session|null>(null);
  const [user,        setUser]        = useState<User|null>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [roles,       setRoles]       = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [initialized, setInitialized] = useState(false);

  const apply = useCallback((p:any, r:string[]) => {
    setProfile(p);
    setRoles(r.length ? r : ["requisitioner"]);
  },[]);

  const done = useCallback(() => {
    setLoading(false);
    setInitialized(true);
  },[]);

  const primaryRole: ProcurementRole = (() => {
    for (const r of ROLE_PRIORITY) {
      if (roles.includes(r)) return r;
    }
    return "requisitioner";
  })();

  const hasRole   = useCallback((...r:ProcurementRole[])=>r.some(x=>roles.includes(x)),[roles]);
  const hasAnyRole= useCallback((r:ProcurementRole[])=>r.some(x=>roles.includes(x)),[roles]);

  const refreshRoles = useCallback(async()=>{
    const s=(await supabase.auth.getSession()).data.session;
    if(!s?.user) return;
    const d=await fetchUserData(s.user.id);
    apply(d.profile,d.roles);
    writeCache(s.user.id,d.roles,d.profile);
  },[apply]);

  const updateProfile = useCallback(async(data:Partial<any>)=>{
    const u=(await supabase.auth.getSession()).data.session?.user;
    if(!u) return;
    try { await (supabase as any).from("profiles").update(data).eq("id",u.id); } catch {}
    setProfile((p:any)=>({...p,...data}));
  },[]);

  const signOut = useCallback(async()=>{
    clearCache();
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
    done();
  },[done]);

  useEffect(()=>{
    let live = true;

    const boot = async () => {
      // HARD 3-second timeout — ALWAYS initialize no matter what
      const hardTimeout = setTimeout(()=>{
        if(live && !initialized){ console.warn("[Auth] Hard timeout — initializing"); done(); }
      }, 1500);

      try {
        const { data:{ session:s } } = await supabase.auth.getSession();
        if(!live){ clearTimeout(hardTimeout); return; }

        setSession(s); setUser(s?.user??null);

        if(s?.user) {
          // Try cache first for instant UI
          const cached = readCache(s.user.id);
          if(cached) {
            apply(cached.profile, cached.roles);
            clearTimeout(hardTimeout); done();
            // Refresh in background silently
            fetchUserData(s.user.id).then(d=>{
              if(live){ apply(d.profile,d.roles); writeCache(s.user.id,d.roles,d.profile); }
            }).catch(()=>{});
          } else {
            // Fresh fetch
            const d = await fetchUserData(s.user.id);
            if(live){
              apply(d.profile,d.roles);
              writeCache(s.user.id,d.roles,d.profile);
              clearTimeout(hardTimeout); done();
            }
          }
        } else {
          clearTimeout(hardTimeout); done();
        }
      } catch(e) {
        console.warn("[Auth] boot error:", e);
        if(live){ clearTimeout(hardTimeout); done(); }
      }
    };

    boot();

    const { data:{ subscription } } = supabase.auth.onAuthStateChange(async(event,s)=>{
      if(!live) return;
      setSession(s); setUser(s?.user??null);

      if(event==="SIGNED_IN" && s?.user) {
        const cached = readCache(s.user.id);
        if(cached) {
          apply(cached.profile,cached.roles);
          fetchUserData(s.user.id).then(d=>{ if(live){ apply(d.profile,d.roles); writeCache(s.user.id,d.roles,d.profile); }}).catch(()=>{});
        } else {
          const d = await fetchUserData(s.user.id).catch(()=>({profile:null,roles:[]}));
          if(live){ apply(d.profile,d.roles); writeCache(s.user.id,d.roles,d.profile); }
        }
        done();
      } else if(event==="SIGNED_OUT") {
        clearCache(); setProfile(null); setRoles([]); done();
      }
    });

    return ()=>{ live=false; subscription.unsubscribe(); };
  },[]); // eslint-disable-line

  return (
    <Ctx.Provider value={{ session,user,profile,roles,loading,initialized,primaryRole,hasRole,hasAnyRole,signOut,refreshRoles,updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}
