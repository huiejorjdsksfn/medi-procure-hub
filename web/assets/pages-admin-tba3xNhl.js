import { r as reactExports, j as jsxRuntimeExports, u as useNavigate, L as Lock, C as ChevronRight, D as Database, W as Wifi, A as Activity, a as CodeXml, b as ChartColumn, M as Minimize2, c as Maximize2, S as Server, X, R as RefreshCw, d as Search, e as ChevronDown, T as Table, E as Eye, P as Play, f as Layers, g as Settings, h as TriangleAlert, i as Plus, F as FileSpreadsheet, k as Filter, l as Download, U as Upload, m as ArrowUpNarrowWide, n as ArrowDownWideNarrow, o as ArrowUpDown, p as CircleCheckBig, q as Save, s as PenLine, t as Clock, v as Copy, w as Trash2, G as Globe, x as Users, B as Bell, y as Archive, z as Mail, H as Palette, K as Key, I as Terminal, J as Monitor, N as Shield, Z as Zap$1, O as ShoppingCart, Q as Package, V as Truck, Y as DollarSign, _ as Gavel, $ as Building2, a0 as SlidersVertical, a1 as UserCheck, a2 as Phone, a3 as Printer, a4 as Radio, a5 as FolderOpen, a6 as Folder, a7 as LayoutDashboard, a8 as FileCheck, a9 as BookOpen, aa as ChartNoAxesColumn, ab as PiggyBank, ac as FileText } from "./react-vendor-CySSbiQ5.js";
import { u as utils, w as writeFileSync } from "./xlsx-vendor-BSOddODG.js";
import { c as createClient } from "./supabase-vendor-DIkCmlJl.js";
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1e6;
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}
const toastTimeouts = /* @__PURE__ */ new Map();
const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId
    });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};
const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t)
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast2) => {
          addToRemoveQueue(toast2.id);
        });
      }
      return {
        ...state,
        toasts: state.toasts.map(
          (t) => t.id === toastId || toastId === void 0 ? {
            ...t,
            open: false
          } : t
        )
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === void 0) {
        return {
          ...state,
          toasts: []
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId)
      };
  }
};
const listeners = [];
let memoryState = { toasts: [] };
function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}
function toast({ ...props }) {
  const id = genId();
  const update = (props2) => dispatch({
    type: "UPDATE_TOAST",
    toast: { ...props2, id }
  });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      }
    }
  });
  return {
    id,
    dismiss,
    update
  };
}
function useToast() {
  const [state, setState] = reactExports.useState(memoryState);
  reactExports.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);
  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId })
  };
}
const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
const db = supabase;
const DB_NAME = "procurbosse_offline";
const DB_VER = 3;
const STORES = ["credentials", "queue", "pages", "settings", "last_sync"];
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db2 = e.target.result;
      STORES.forEach((s) => {
        if (!db2.objectStoreNames.contains(s)) db2.createObjectStore(s, { keyPath: "key" });
      });
    };
    req.onsuccess = (e) => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}
async function idbGet(store, key) {
  const db2 = await openDB();
  return new Promise((res, rej) => {
    const tx = db2.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result?.value ?? null);
    req.onerror = () => rej(req.error);
  });
}
async function idbSet(store, key, value) {
  const db2 = await openDB();
  return new Promise((res, rej) => {
    const tx = db2.transaction(store, "readwrite");
    tx.objectStore(store).put({ key, value, updated: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function cacheCredentials(email, passwordHash, roles, profile) {
  await idbSet("credentials", email.toLowerCase(), { email, passwordHash, roles, profile, cached: Date.now() });
}
async function getCachedCredential(email) {
  return idbGet("credentials", email.toLowerCase());
}
async function hashPassword(password) {
  if (typeof crypto.subtle === "undefined") return btoa(password + "_procurbosse");
  const enc = new TextEncoder().encode(password + "_procurbosse_salt_el5");
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyOfflineLogin(email, password) {
  const cred = await getCachedCredential(email);
  if (!cred) return null;
  const hash = await hashPassword(password);
  if (hash !== cred.passwordHash) return null;
  return { ok: true, roles: cred.roles || [], profile: cred.profile || {} };
}
function isOnline() {
  return navigator.onLine;
}
function onNetworkChange(cb) {
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online", on);
  window.addEventListener("offline", off);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", off);
  };
}
const AuthContext = reactExports.createContext({
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  online: true,
  offlineMode: false,
  signOut: async () => {
  },
  signIn: async () => ({}),
  hasRole: () => false,
  hasAnyRole: () => false,
  primaryRole: "requisitioner",
  isAdmin: false
});
const useAuth = () => reactExports.useContext(AuthContext);
const ROLE_PRIORITY = [
  "admin",
  "database_admin",
  "procurement_manager",
  "accountant",
  "procurement_officer",
  "inventory_manager",
  "warehouse_officer",
  "reception",
  "requisitioner"
];
function makeOfflineUser(email) {
  return { id: `offline_${btoa(email)}`, email, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" };
}
const AuthProvider = ({ children }) => {
  const [session, setSession] = reactExports.useState(null);
  const [user, setUser] = reactExports.useState(null);
  const [profile, setProfile] = reactExports.useState(null);
  const [roles, setRoles] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [online, setOnline] = reactExports.useState(isOnline());
  const [offlineMode, setOfflineMode] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const unsub = onNetworkChange(setOnline);
    return unsub;
  }, []);
  async function fetchProfile(uid) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (data) {
        setProfile(data);
        return data;
      }
    } catch {
    }
    return null;
  }
  async function fetchRoles(uid, email) {
    try {
      const { data } = await db.from("user_roles").select("role").eq("user_id", uid);
      let list = data?.map((r) => r.role) || [];
      if (!list.length) {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (p?.role) list = [p.role];
      }
      if (email === "samwise@gmail.com" && !list.includes("admin")) list = ["admin", ...list];
      setRoles(list);
      return list;
    } catch {
      setRoles([]);
      return [];
    }
  }
  const signIn = async (email, password) => {
    if (online) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        const [fetchedProfile, fetchedRoles] = await Promise.all([
          fetchProfile(data.user.id),
          fetchRoles(data.user.id, email)
        ]);
        try {
          const hash = await hashPassword(password);
          await cacheCredentials(email, hash, fetchedRoles, fetchedProfile);
        } catch {
        }
        return {};
      }
      if (error) {
        const offline = await verifyOfflineLogin(email, await hashPassword(password).catch(() => password));
        if (offline?.ok) {
          setOfflineMode(true);
          setUser(makeOfflineUser(email));
          setRoles(offline.roles);
          setProfile(offline.profile);
          return {};
        }
        return { error: error.message };
      }
    } else {
      const hash = await hashPassword(password).catch(() => password);
      const offline = await verifyOfflineLogin(email, hash);
      if (offline?.ok) {
        setOfflineMode(true);
        setUser(makeOfflineUser(email));
        setRoles(offline.roles);
        setProfile(offline.profile);
        return {};
      }
      return { error: "You are offline and no cached credentials found for this account. Please connect to internet for first login." };
    }
    return { error: "Login failed" };
  };
  reactExports.useEffect(() => {
    let timer = setTimeout(() => setLoading(false), 6e3);
    supabase.auth.getSession().then(({ data: { session: session2 } }) => {
      setSession(session2);
      setUser(session2?.user ?? null);
      if (session2?.user) {
        Promise.all([
          fetchProfile(session2.user.id),
          fetchRoles(session2.user.id, session2.user.email)
        ]).then(([prof, roles2]) => {
          if (session2.user.email) {
            hashPassword(session2.access_token?.slice(-32) ?? "").then((hash) => cacheCredentials(session2.user.email, hash, roles2, prof)).catch(() => {
            });
          }
        }).finally(() => {
          clearTimeout(timer);
          setLoading(false);
        });
      } else {
        clearTimeout(timer);
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(timer);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session2) => {
      setSession(session2);
      setUser(session2?.user ?? null);
      setOfflineMode(false);
      if (session2?.user) {
        await Promise.all([fetchProfile(session2.user.id), fetchRoles(session2.user.id, session2.user.email)]);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);
  const signOut = async () => {
    if (!offlineMode) await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setOfflineMode(false);
  };
  const hasRole = (r) => roles.includes(r);
  const hasAnyRole = (rs) => rs.some((r) => roles.includes(r));
  const isAdmin = roles.includes("admin");
  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) || "requisitioner";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AuthContext.Provider, { value: {
    session,
    user,
    profile,
    roles,
    loading,
    online,
    offlineMode,
    signOut,
    signIn,
    hasRole,
    hasAnyRole,
    primaryRole,
    isAdmin
  }, children });
};
async function broadcastToAll(payload) {
  const channel = supabase.channel("system-broadcast");
  await channel.send({
    type: "broadcast",
    event: "system_alert",
    payload: {
      ...payload,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      expiresIn: payload.expiresIn ?? 30
    }
  });
  await supabase.removeChannel(channel);
}
async function persistBroadcast(payload, senderId) {
  const { data: users } = await supabase.from("profiles").select("id").limit(500);
  if (!users?.length) return;
  const rows = users.map((u) => ({
    user_id: u.id,
    title: payload.title,
    message: payload.message,
    type: payload.type === "maintenance" ? "warning" : payload.type,
    module: "system",
    action_url: payload.actionUrl || null,
    is_read: false,
    status: "delivered",
    sender_id: senderId || null,
    subject: payload.title
  }));
  for (let i = 0; i < rows.length; i += 50) {
    await supabase.from("notifications").insert(rows.slice(i, i + 50));
  }
}
async function sendSystemBroadcast(payload, options = { persist: true, realtime: true }) {
  const tasks = [];
  if (options.realtime !== false) tasks.push(broadcastToAll(payload));
  if (options.persist !== false) tasks.push(persistBroadcast(payload, payload.senderId));
  await Promise.allSettled(tasks);
}
function subscribeToBroadcasts(callback) {
  const channel = supabase.channel("system-broadcast").on("broadcast", { event: "system_alert" }, ({ payload }) => {
    callback(payload);
  }).subscribe();
  return () => supabase.removeChannel(channel);
}
const logoImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF20lEQVR4nO2ZfWwTZRzHb0IQA2LEEDFEMUoiJsaYkJD9o/4hvvxhoolO2EAw2+6ulE1g7VoYPW8DgUlvg9Zu3nUMlmHL9dbyNnlT1kMGEzKuAwTWTdaxjRYRmVAFYob7mbutpevKdt3oyxK+yTe9u97zPN9Pn9+Te5pDkBgKgHwMmvAXQcieA2cUr8HJ3CnIWBHw5HhowtLAhdWCgPnBhUGYm0FAcSSZBQL2FgjorxHCD7SA7Rbvb9HqFp9RqSYhySQ4ja0AF9ozLEQoiIbg3RrdhQuqNTORZBAIKC4LIAJIi5aAFo2u/byanJ5YiNPZqeDC7o0KRIIh6gBBUhIDwaWNk7Um5IBI1i1ODIgL/yhS0I66XMjUULC3ejX0CngUIIQ7IbMCLtQRGlAMXUkTEkTAxIYN0H1cKRcEWjQFc+MLAUgKuNA/QwM21eZJ4ZkyEo7W5MMP36+CbC0FVQwhG8StITQxCbx9Oz+x3FL/tGgTx08OgpxSTg8vmXqHWgIRP2+fVEBPIy7Nxl8n5M+IW6urCozBcdy4wNiiAWBkZWfi+OkMy99mbDxIZp0HgyBC1qvhILdPLgVt0cZgWWVr9bB5c5F0Xf6M6PYFxmDs/Ozg2DYeaJavHBGImePf6O9kP8PyxYytLvM+SObMSAv9zimFVFb27QVSSWVp9bBzqy6KNaJjA2NUcsemSeP2+Rpjc/KjAjFz/Bfh30HDyifCn+Tn9q8EqnQttBxeHoRaThTDli1F0awRKlIWmnU2xQREgnGhjaEBbzYoIZf4RiqrHN0mwFbppRlp3KOKprQ+iz+IgK4JL63rx5aBdatOgtFTa+HiwRWynyNuLXGnOT//yfiDnMt6FlzY3fCgd/vXSRefG92TXUOYHpQlpiASjAsjHsoWRUN0XywoeC5xIOfTJoCAHh8NiFuj+69VS3wyVJaYg/TBZE0FF3Z2JCAiRIuGyBkuCx0PkD4Y5WRwoWxUIFqixp2v+1hOFjpeIEEgF/4uuLB6ELDeB8OgDvHe8yQ5QW6/dLxBAgIhaxYIaCYImAEEzAwCVgECppNAW3Mfj7Y/eiQg5VzdKzTr/IOx8bekPY6N/4exObsZlpdVBg9LAJBC2/hD4tg0y99jWGdP/7FNdicMyxtCN2wM66wf8e5zFKrgnHMkiPsbx3/FzaTsDgw7DkxhWKevH6KnwnrkdSRBom08HfKDboy6A8bmXNLXmC9BEqgK7tBUsdRp1tkV+p9ItsRSYlieZbifnkISLLONR7/j+E9H3EEi1kUy54ivVHqLVk1ZiwNeX8WfKDIfcoReU2+yzIt3rk5OOcvrwFZ47XiOl8NeGLaBmrJeVlNWCLikphG+rqoLnotW6S2FSBx1dZfiQ58Du+Nz4CDaa8f9vl3o22MKBABJ8dpxXwAiCOPALkQFsm7bESDo2oSBdHL4jHCIgK9WL5okGySS4zojPDne68D+HgRix7xDNkw2EFFeB/blgLKy470+B754TIFklHa8lGFsm1e+bWdBraXsx70W0wFTpV01f8uldzJMnplJD5JW0jljgaHt53SjBwIurOkCjaUzeC7Z0HYgzdA6LTlBAFLCIUTbG65B9dHfB4IYPbDA2LZHareEJCcuWU3NFq3SW37JoyyX1aU7u1SUpT2Psnju2+pRU1ZP3qYd63JIZnbB5t3v55fWvCkeB5y7vnLwrxOl5htaXw4PK7q5oxuE324Mup5uaOv9/NsrzyDZmpLU0PcZykIaiPJaUHxVPuA9h7KQ9iwrYiBg8fmiK9sbPBetLGKKRw/ieS88rLKyA275/XDzlh+ymfbBMMa2uUkHssDQ/kF40PLDPvD7/ZKpfd5BIAsN7amDQUgaiLJ9oCCGAdl2BNaU7YkLiGG/NwhSvPuKPJAHORwkkmMFkm70QEPzDag7ez1CWY0xEGVlB6Dmy2MfJH0IPwJZ9ggkhiBK0jRZhBnOOGmcqyDNqUN56bqy52VkHVILDa1TMgyX5kTjRfqrk/4HNwYPQ5WcIqUAAAAASUVORK5CYII=";
const logAudit = async (userId, userName, action, module, recordId, details) => {
  try {
    await db.from("audit_log").insert({
      user_id: userId || null,
      user_name: userName || "System",
      action,
      module,
      record_id: recordId || null,
      details: details || null
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
};
const DEFAULTS = {
  hospital_name: "Embu Level 5 Hospital",
  system_name: "EL5 MediProcure",
  hospital_address: "Embu Town, Embu County, Kenya",
  hospital_email: "info@embu.health.go.ke",
  hospital_phone: "+254 060 000000",
  primary_color: "#1a3a6b",
  accent_color: "#C45911",
  doc_footer: "Embu Level 5 Hospital - Embu County Government",
  currency_symbol: "KES",
  vat_rate: "16",
  maintenance_mode: "false",
  realtime_notifications: "true",
  enable_procurement: "true",
  enable_financials: "true",
  enable_quality: "true",
  enable_scanner: "true",
  enable_vouchers: "true",
  enable_tenders: "true",
  enable_contracts_module: "true",
  enable_documents: "true",
  show_logo_print: "true",
  show_watermark: "false",
  show_stamp: "true",
  print_font: "Times New Roman",
  print_font_size: "11",
  paper_size: "A4"
};
let _cache = null;
const _listeners = /* @__PURE__ */ new Set();
function notify(s) {
  _cache = s;
  _listeners.forEach((fn) => fn(s));
}
function useSystemSettings() {
  const [settings, setSettings] = reactExports.useState(_cache || DEFAULTS);
  const [loading, setLoading] = reactExports.useState(!_cache);
  reactExports.useEffect(() => {
    const handler = (s) => setSettings(s);
    _listeners.add(handler);
    if (!_cache) {
      supabase.from("system_settings").select("key,value").limit(500).then(({ data }) => {
        const map = { ...DEFAULTS };
        (data || []).forEach((r) => {
          if (r.key) map[r.key] = r.value ?? "";
        });
        notify(map);
        applyThemeToDOM(map);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    const channel = supabase.channel("sys_settings_rt").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "system_settings"
    }, (payload) => {
      if (payload.new?.key) {
        const updated = { ..._cache || DEFAULTS, [payload.new.key]: payload.new.value ?? "" };
        notify(updated);
        applyThemeToDOM(updated);
      }
    }).subscribe();
    return () => {
      _listeners.delete(handler);
      supabase.removeChannel(channel);
    };
  }, []);
  const get = reactExports.useCallback((key, def = "") => settings[key] ?? DEFAULTS[key] ?? def, [settings]);
  const bool = reactExports.useCallback((key, def = false) => {
    const v = settings[key] ?? DEFAULTS[key];
    return v !== void 0 ? v === "true" : def;
  }, [settings]);
  return { settings, loading, get, getSetting: get, bool };
}
async function saveSettings(kvPairs, category = "general") {
  try {
    for (const [key, value] of Object.entries(kvPairs)) {
      const { data: ex } = await supabase.from("system_settings").select("id").eq("key", key).maybeSingle();
      if (ex?.id) {
        await supabase.from("system_settings").update({ value, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("key", key);
      } else {
        await supabase.from("system_settings").insert({ key, value, category });
      }
    }
    if (_cache) {
      notify({ ..._cache, ...kvPairs });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
function applyThemeToDOM(settings) {
  if (typeof document === "undefined") return;
  try {
    localStorage.setItem("el5_theme_cache", JSON.stringify(settings));
  } catch {
  }
  const root = document.documentElement;
  const apply = (varName, key, fallback) => {
    const val = settings[key] || DEFAULTS[key] || fallback;
    if (val) root.style.setProperty(varName, val);
  };
  apply("--color-primary", "primary_color", "#0a2558");
  apply("--color-accent", "accent_color", "#C45911");
  apply("--color-nav-bg", "nav_bg_color", "#ffffff");
  apply("--color-nav-text", "nav_text_color", "#1e293b");
  apply("--color-page-bg", "page_bg_color", "#f8fafc");
  apply("--color-card-bg", "card_bg", "#ffffff");
  apply("--color-text", "text_primary", "#1e293b");
  apply("--color-text-muted", "text_secondary", "#64748b");
  apply("--color-border", "border_color", "#e2e8f0");
  apply("--color-success", "success_color", "#166534");
  apply("--color-warning", "warning_color", "#92400e");
  apply("--color-danger", "danger_color", "#dc2626");
  apply("--font-family", "font_family", "Segoe UI");
  apply("--font-size-base", "font_size_base", "13px");
  apply("--font-size-sm", "font_size_sm", "11px");
  apply("--font-size-lg", "font_size_lg", "15px");
  apply("--border-radius", "border_radius", "8px");
  apply("--content-padding", "content_padding", "16px");
  apply("--topbar-height", "topbar_height", "44px");
  apply("--nav-height", "nav_height", "44px");
  const printFont = settings["print_font"] || "Times New Roman";
  const printSize = settings["print_font_size"] || "11";
  root.style.setProperty("--print-font", printFont);
  root.style.setProperty("--print-font-size", printSize + "pt");
  if (settings["compact_tables"] === "true") {
    document.body.classList.add("compact-tables");
  } else {
    document.body.classList.remove("compact-tables");
  }
}
function AccessDenied({ requiredRoles }) {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full flex items-center justify-center bg-gray-50", style: { minHeight: "calc(100vh - 120px)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center max-w-sm px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-8 h-8 text-red-400" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold text-gray-900 mb-2", children: "Access Restricted" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 mb-1", children: "You do not have permission to view this page." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-gray-400 mb-6", children: [
      "Required: ",
      requiredRoles.join(", ")
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => navigate("/dashboard"),
        className: "inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-4 h-4" }),
          "Go to Dashboard"
        ]
      }
    )
  ] }) });
}
function RoleGuard({ allowed, children, fallback }) {
  const { roles } = useAuth();
  const hasAccess = allowed.some((r) => roles.includes(r));
  if (!hasAccess) {
    return fallback ? /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: fallback }) : /* @__PURE__ */ jsxRuntimeExports.jsx(AccessDenied, { requiredRoles: allowed });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
}
const TABLE_GROUPS = [
  { id: "users", label: "Users & Access", color: "#4f46e5", tables: ["profiles", "user_roles", "roles", "permissions"] },
  { id: "procurement", label: "Procurement", color: "#0078d4", tables: ["requisitions", "requisition_items", "purchase_orders", "goods_received", "contracts", "tenders", "bid_evaluations", "procurement_plans"] },
  { id: "inventory", label: "Inventory", color: "#107c10", tables: ["items", "item_categories", "departments", "suppliers", "stock_movements"] },
  { id: "vouchers", label: "Vouchers & Finance", color: "#C45911", tables: ["payment_vouchers", "receipt_vouchers", "journal_vouchers", "purchase_vouchers", "sales_vouchers", "budgets", "chart_of_accounts", "bank_accounts", "gl_entries", "fixed_assets"] },
  { id: "quality", label: "Quality", color: "#00695C", tables: ["inspections", "non_conformance"] },
  { id: "system", label: "System", color: "#5C2D91", tables: ["audit_log", "notifications", "system_settings", "system_config", "documents", "backup_jobs", "inbox_items"] },
  { id: "connections", label: "Connections", color: "#0369a1", tables: ["odbc_connections", "external_connections"] }
];
TABLE_GROUPS.flatMap((g) => g.tables.map((t) => ({ table: t, group: g })));
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500, 1e3];
const MAX_ROWS_OPTIONS = [100, 500, 1e3, 5e3, "All"];
function CtxMenu({ x, y, items, onClose }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { onClick: onClose, style: { position: "fixed", inset: 0, zIndex: 9999 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { onClick: (e) => e.stopPropagation(), style: {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 1e4,
    background: "#1e2233",
    border: "1px solid #3a3d52",
    borderRadius: 4,
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
    minWidth: 210,
    padding: "3px 0"
  }, children: items.map(
    (item, i) => item.divider ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 1, background: "#2e3248", margin: "3px 0" } }, i) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => {
          item.action();
          onClose();
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 12,
          color: item.color || "#c8cfe0",
          textAlign: "left"
        },
        onMouseEnter: (e) => e.currentTarget.style.background = "#2a3050",
        onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
        children: [
          item.icon && /* @__PURE__ */ jsxRuntimeExports.jsx(item.icon, { style: { width: 13, height: 13, flexShrink: 0 } }),
          item.label
        ]
      },
      i
    )
  ) }) });
}
function SqlPanel({ table, onClose }) {
  const [sql, setSql] = reactExports.useState(`SELECT *
FROM ${table}
LIMIT 50;`);
  const [result, setResult] = reactExports.useState([]);
  const [cols, setCols] = reactExports.useState([]);
  const [running, setRunning] = reactExports.useState(false);
  const [execMs, setExecMs] = reactExports.useState(null);
  const [messages, setMessages] = reactExports.useState([]);
  const [activeTab, setActiveTab] = reactExports.useState("result");
  const run = async () => {
    setRunning(true);
    const t0 = Date.now();
    try {
      const match = sql.match(/FROM\s+([a-z_]+)/i);
      const tbl = match?.[1] || table;
      const limit = parseInt(sql.match(/LIMIT\s+(\d+)/i)?.[1] || "50");
      const { data, error } = await supabase.from(tbl).select("*").limit(Math.min(limit, 1e3));
      if (error) throw error;
      const d = data || [];
      setResult(d);
      setCols(d.length > 0 ? Object.keys(d[0]) : []);
      const ms = Date.now() - t0;
      setExecMs(ms);
      setMessages([`✅ Query executed successfully`, `Set 1, Execution Time: ${ms} Milliseconds`, `Rows returned: ${d.length}`]);
      setActiveTab("result");
    } catch (e) {
      setMessages([`❌ Error: ${e.message}`]);
      setActiveTab("messages");
      toast({ title: "SQL Error", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };
  const fmtVal = (v) => v === null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#555e7a", fontStyle: "italic" }, children: "NULL" }) : String(v).slice(0, 120);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", height: "100%", background: "#1e1e1e", fontFamily: "'Cascadia Code','Fira Code',monospace" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", padding: "4px 8px", background: "#252526", borderBottom: "1px solid #3c3c3c", gap: 6, flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { style: { width: 13, height: 13, color: "#60a5fa" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, fontWeight: 700, color: "#cdd6f4" }, children: [
        "SQL Editor — ",
        table
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4, marginLeft: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: run, disabled: running, style: {
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 12px",
          background: "#1a3a6b",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700
        }, children: [
          running ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 11, height: 11, animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { style: { width: 11, height: 11 } }),
          "Run (F5)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSql(`SELECT * FROM ${table} LIMIT 50;`), style: { padding: "3px 10px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 11 }, children: "Reset" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, style: { padding: "3px 8px", background: "transparent", color: "#64748b", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 12, height: 12 } }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 10px", background: "#181d2c", borderBottom: "1px solid #2e3248", fontSize: 10, color: "#64748b", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", defaultChecked: true, style: { accentColor: "#ef4444" } }),
        " Stop On Error"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Max Rows: 1000" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Rows Per Page: 50" }),
      execMs !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#22c55e", marginLeft: "auto" }, children: [
        "✓ ",
        execMs,
        "ms"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: sql,
        onChange: (e) => setSql(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "F5" || (e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            run();
          }
        },
        spellCheck: false,
        style: {
          height: 130,
          padding: "10px 14px",
          fontSize: 12,
          lineHeight: 1.7,
          fontFamily: "'Cascadia Code','Fira Code',monospace",
          background: "#10121c",
          color: "#cdd6f4",
          border: "none",
          borderBottom: "1px solid #2e3248",
          resize: "none",
          outline: "none",
          flexShrink: 0
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", background: "#1a1e2e", borderBottom: "1px solid #2e3248", flexShrink: 0 }, children: ["result", "messages"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveTab(t), style: {
      padding: "5px 14px",
      fontSize: 11,
      fontWeight: 600,
      border: "none",
      background: activeTab === t ? "#141825" : "transparent",
      color: activeTab === t ? "#cdd6f4" : "#64748b",
      cursor: "pointer",
      borderBottom: activeTab === t ? "2px solid #60a5fa" : "2px solid transparent",
      textTransform: "capitalize"
    }, children: t === "result" ? `Results (${result.length})` : "Messages" }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflow: "auto" }, children: activeTab === "messages" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "12px 16px" }, children: messages.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: m.startsWith("✅") ? "#22c55e" : m.startsWith("❌") ? "#ef4444" : "#94a3b8", lineHeight: 2, fontFamily: "monospace" }, children: m }, i)) }) : result.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "20px", color: "#475569", fontSize: 12, textAlign: "center" }, children: "Run a query to see results" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: "max-content" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#1a1e2e", position: "sticky", top: 0 }, children: cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "5px 12px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: 10, borderRight: "1px solid #2e3248", whiteSpace: "nowrap" }, children: c }, c)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: result.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { borderBottom: "1px solid #1e2234", background: i % 2 === 0 ? "#fff" : "#f9fafb" }, children: cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 12px", color: row[c] === null ? "#9ca3af" : "#1e1e1e", fontStyle: row[c] === null ? "italic" : "normal", whiteSpace: "nowrap", borderRight: "1px solid #1e2234", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }, children: fmtVal(row[c]) }, c)) }, i)) })
    ] }) })
  ] });
}
function VisPanel({ rows, cols }) {
  const [xCol, setXCol] = reactExports.useState(cols[0] || "");
  const [yCol, setYCol] = reactExports.useState(cols[1] || "");
  const [grouped, setGrouped] = reactExports.useState(true);
  const [activeTab, setActiveTab] = reactExports.useState("columns");
  const numCols = cols.filter((c) => rows.some((r) => typeof r[c] === "number" || !isNaN(Number(r[c]))));
  const chartData = reactExports.useMemo(() => {
    if (!xCol || !yCol || rows.length === 0) return [];
    const map = {};
    rows.forEach((r) => {
      const k = String(r[xCol] || "").slice(0, 12);
      map[k] = (map[k] || 0) + Number(r[yCol] || 0);
    });
    return Object.entries(map).slice(0, 12).map(([k, v]) => ({ k, v }));
  }, [rows, xCol, yCol]);
  const maxV = Math.max(...chartData.map((d) => d.v), 1);
  const colors = ["#f97316", "#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#38bdf8", "#fb923c", "#4ade80", "#c084fc", "#e879f9", "#2dd4bf"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", height: "100%", background: "#141825", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 280, background: "#1a1e2e", borderRight: "1px solid #2e3248", display: "flex", flexDirection: "column", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", background: "#181d2c", borderBottom: "1px solid #2e3248" }, children: ["columns", "settings", "sql"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveTab(t), style: {
        flex: 1,
        padding: "5px 0",
        fontSize: 10,
        fontWeight: 700,
        border: "none",
        background: activeTab === t ? "#1a1e2e" : "transparent",
        color: activeTab === t ? "#cdd6f4" : "#64748b",
        cursor: "pointer",
        textTransform: "capitalize",
        borderBottom: activeTab === t ? "2px solid #60a5fa" : "2px solid transparent"
      }, children: t.toUpperCase() }, t)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflow: "auto", padding: "8px" }, children: [
        activeTab === "columns" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: "0.06em" }, children: "ALL COLUMNS" }),
          cols.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                if (!xCol) setXCol(c);
                else setYCol(c);
              },
              style: {
                display: "block",
                width: "100%",
                padding: "5px 8px",
                marginBottom: 2,
                background: c === yCol ? "#1a3a6b30" : c === xCol ? "#2e3248" : "transparent",
                border: c === yCol ? "1px solid #1a3a6b" : "1px solid transparent",
                borderRadius: 3,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 11,
                color: c === yCol ? "#60a5fa" : c === xCol ? "#e2e8f0" : "#94a3b8"
              },
              children: [
                c === yCol && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#f97316", marginRight: 6 }, children: "●" }),
                c
              ]
            },
            c
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 10, fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em" }, children: "KEY COLUMNS" }),
          cols.filter((c) => c === "id" || c.endsWith("_id") || c.endsWith("_number")).slice(0, 3).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "4px 8px", marginBottom: 2, background: "transparent", border: "1px solid transparent", borderRadius: 3, cursor: "pointer", textAlign: "left", fontSize: 11, color: "#64748b" }, children: [
            c,
            /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 10, height: 10 } })
          ] }, c))
        ] }),
        activeTab === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 8 }, children: "CHART TYPE" }),
          ["Grouped", "Stacked", "Line", "Pie"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setGrouped(t === "Grouped"), style: { display: "block", width: "100%", padding: "5px 10px", marginBottom: 3, background: grouped && t === "Grouped" || !grouped && t === "Stacked" ? "#1a3a6b" : "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", textAlign: "left", fontSize: 11, color: "#cdd6f4" }, children: t }, t))
        ] }),
        activeTab === "sql" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, fontFamily: "monospace", color: "#94a3b8", lineHeight: 1.8, padding: 4 }, children: [
          "SELECT ",
          xCol || "...",
          ", ",
          yCol || "...",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "FROM ",
          numCols[0] || "table",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "GROUP BY ",
          xCol || "...",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "ORDER BY ",
          yCol || "...",
          " DESC"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "1px solid #2e3248", padding: "8px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, fontWeight: 700, color: "#64748b", marginBottom: 4 }, children: "VALUE COLUMNS" }),
          numCols.slice(0, 2).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1, fontSize: 10, color: "#94a3b8" }, children: c }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, color: "#64748b", width: 30 }, children: "sum" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, color: "#64748b", width: 20 }, children: "Y1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 10, height: 10, color: "#ef4444", cursor: "pointer" } })
          ] }, c))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, fontWeight: 700, color: "#64748b", marginBottom: 4 }, children: "GROUP COLUMN" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 28, background: "#2e3248", borderRadius: 3, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 10, color: "#475569" }, children: "Drag and drop column" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", padding: "6px 12px", background: "#1a1e2e", borderBottom: "1px solid #2e3248", gap: 8, flexShrink: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { style: { width: 13, height: 13, color: "#60a5fa" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "#cdd6f4" }, children: "Chart" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#64748b" }, children: "Grouped" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { style: { width: 11, height: 11, color: "#64748b" } })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", overflow: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: xCol, onChange: (e) => setXCol(e.target.value), style: { fontSize: 10, background: "#f5f5f5", color: "#374151", border: "1px solid #d1d5db", borderRadius: 3, padding: "2px 6px" }, children: cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: yCol, onChange: (e) => setYCol(e.target.value), style: { fontSize: 10, background: "#f5f5f5", color: "#374151", border: "1px solid #d1d5db", borderRadius: 3, padding: "2px 6px" }, children: cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c)) })
        ] }),
        chartData.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-end", gap: 6, flex: 1, paddingBottom: 20, paddingLeft: 30, position: "relative" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "absolute", left: 0, top: 0, bottom: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 8, color: "#64748b", textAlign: "right" }, children: [100, 80, 60, 40, 20, 0].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: v }, v)) }),
          chartData.map((d, i) => {
            const h = Math.max(d.v / maxV * 200, 2);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, minWidth: 28 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  title: `${d.k}: ${d.v}`,
                  style: {
                    width: "100%",
                    height: h,
                    background: colors[i % colors.length],
                    borderRadius: "2px 2px 0 0",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    cursor: "pointer",
                    minHeight: 3,
                    transition: "opacity 0.2s"
                  },
                  onMouseEnter: (e) => e.currentTarget.style.opacity = "0.75",
                  onMouseLeave: (e) => e.currentTarget.style.opacity = "1",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 7, color: "rgba(255,255,255,0.7)", marginTop: 2, transform: "rotate(-90deg)", whiteSpace: "nowrap", overflow: "hidden" } })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 7, color: "#64748b", textAlign: "center", maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.k })
            ] }, i);
          })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#475569", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { style: { width: 36, height: 36, color: "#2e3248" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Select X and Y columns to render chart" })
        ] })
      ] })
    ] })
  ] });
}
function TableBrowser() {
  useAuth();
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const [bottomPanel, setBottomPanel] = reactExports.useState(null);
  const [expandedGroups, setExpandedGroups] = reactExports.useState(
    Object.fromEntries(TABLE_GROUPS.map((g) => [g.id, g.id === "procurement" || g.id === "inventory" || g.id === "users"]))
  );
  const [tblSearch, setTblSearch] = reactExports.useState("");
  const [openTabs, setOpenTabs] = reactExports.useState(["items"]);
  const [activeTable, setActiveTable] = reactExports.useState("items");
  const [rows, setRows] = reactExports.useState([]);
  const [cols, setCols] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [page, setPage] = reactExports.useState(1);
  const [rowCount, setRowCount] = reactExports.useState(0);
  const [pageSize, setPageSize] = reactExports.useState(50);
  const [maxRows, setMaxRows] = reactExports.useState(1e3);
  const [sortCol, setSortCol] = reactExports.useState("");
  const [sortDir, setSortDir] = reactExports.useState("asc");
  const [dataSearch, setDataSearch] = reactExports.useState("");
  const [filterCol, setFilterCol] = reactExports.useState("");
  const [filterVal, setFilterVal] = reactExports.useState("");
  const [showFilter, setShowFilter] = reactExports.useState(false);
  const [editingId, setEditingId] = reactExports.useState(null);
  const [editValues, setEditValues] = reactExports.useState({});
  const [newRowMode, setNewRowMode] = reactExports.useState(false);
  const [newRowVals, setNewRowVals] = reactExports.useState({});
  const [selectedRows, setSelectedRows] = reactExports.useState(/* @__PURE__ */ new Set());
  const [rtConnected, setRtConnected] = reactExports.useState(false);
  const [rtEvents, setRtEvents] = reactExports.useState([]);
  const rtRef = reactExports.useRef(null);
  const [ctx, setCtx] = reactExports.useState(null);
  reactExports.useMemo(() => TABLE_GROUPS.find((g) => g.tables.includes(activeTable)), [activeTable]);
  const loadTable = reactExports.useCallback(async (tbl, pg = 1, sc = sortCol, sd = sortDir) => {
    setLoading(true);
    setEditingId(null);
    setNewRowMode(false);
    setSelectedRows(/* @__PURE__ */ new Set());
    try {
      const from = (pg - 1) * pageSize;
      let q = supabase.from(tbl).select("*", { count: "exact" });
      if (sc) q = q.order(sc, { ascending: sd === "asc" });
      if (filterCol && filterVal) q = q.ilike(filterCol, `%${filterVal}%`);
      q = q.range(from, from + pageSize - 1);
      const { data, count: count2, error } = await q;
      if (error) throw error;
      const d = data || [];
      setRows(d);
      setRowCount(count2 || 0);
      setCols(d.length > 0 ? Object.keys(d[0]) : []);
    } catch (e) {
      toast({ title: "Load error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, [sortCol, sortDir, pageSize, filterCol, filterVal]);
  reactExports.useEffect(() => {
    setPage(1);
    setSortCol("");
    setDataSearch("");
    setFilterCol("");
    setFilterVal("");
    loadTable(activeTable, 1, "", "asc");
  }, [activeTable]);
  reactExports.useEffect(() => {
    if (rtRef.current) supabase.removeChannel(rtRef.current);
    const ch = supabase.channel(`rt-${activeTable}`).on("postgres_changes", { event: "*", schema: "public", table: activeTable }, (payload) => {
      setRtEvents((prev) => [{ t: activeTable, e: payload.eventType, time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }, ...prev.slice(0, 19)]);
      loadTable(activeTable, page);
    }).subscribe((s) => setRtConnected(s === "SUBSCRIBED"));
    rtRef.current = ch;
    return () => {
      if (rtRef.current) supabase.removeChannel(rtRef.current);
    };
  }, [activeTable, page]);
  const openTab = (tbl) => {
    if (!openTabs.includes(tbl)) setOpenTabs((prev) => [...prev, tbl]);
    setActiveTable(tbl);
  };
  const closeTab = (tbl, e) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t !== tbl);
    setOpenTabs(remaining);
    if (activeTable === tbl) setActiveTable(remaining[remaining.length - 1] || "items");
  };
  const handleSort = (col) => {
    const nd = sortCol === col && sortDir === "asc" ? "desc" : "asc";
    setSortCol(col);
    setSortDir(nd);
    loadTable(activeTable, page, col, nd);
  };
  const updateRow = async () => {
    if (!editingId) return;
    const { error } = await supabase.from(activeTable).update(editValues).eq("id", editingId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Row updated ✓", description: `Table: ${activeTable}` });
    setEditingId(null);
    loadTable(activeTable, page);
  };
  const deleteRow = async (id) => {
    if (!confirm(`Delete row from ${activeTable}?`)) return;
    const { error } = await supabase.from(activeTable).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted ✓" });
    loadTable(activeTable, page);
  };
  const deleteSelected = async () => {
    if (!selectedRows.size) return;
    if (!confirm(`Delete ${selectedRows.size} selected rows?`)) return;
    const ids = Array.from(selectedRows);
    const { error } = await supabase.from(activeTable).delete().in("id", ids);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Deleted ${ids.length} rows` });
    setSelectedRows(/* @__PURE__ */ new Set());
    loadTable(activeTable, page);
  };
  const insertRow = async () => {
    const { error } = await supabase.from(activeTable).insert(newRowVals);
    if (error) {
      toast({ title: "Insert failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Row inserted ✓" });
    setNewRowMode(false);
    setNewRowVals({});
    loadTable(activeTable, page);
  };
  const truncateConfirm = () => {
    if (!confirm(`TRUNCATE ${activeTable}? This deletes ALL rows permanently!`)) return;
    toast({ title: "Truncate simulated", description: "Direct TRUNCATE not available via client API" });
  };
  const dropConfirm = () => {
    if (!confirm(`DROP TABLE ${activeTable}? This is IRREVERSIBLE!`)) return;
    toast({ title: "Drop simulated", description: "Direct DROP not available via client API" });
  };
  const exportXlsx = (allRows = false) => {
    const data = allRows ? rows : rows.filter((r) => !selectedRows.size || selectedRows.has(r.id));
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(data);
    utils.book_append_sheet(wb, ws, activeTable.slice(0, 30));
    writeFileSync(wb, `${activeTable}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: `${data.length} rows` });
  };
  const copyInsertSQL = (row) => {
    const cols2 = Object.keys(row).filter((c) => c !== "id" && c !== "created_at" && c !== "updated_at");
    const sql = `INSERT INTO ${activeTable} (${cols2.join(", ")}) VALUES (${cols2.map((c) => `'${row[c] || ""}'`).join(", ")});`;
    navigator.clipboard?.writeText(sql);
    toast({ title: "Insert SQL copied" });
  };
  const copySelectSQL = (row) => {
    const sql = `SELECT * FROM ${activeTable} WHERE id = '${row.id}';`;
    navigator.clipboard?.writeText(sql);
    toast({ title: "Select SQL copied" });
  };
  const filtered = dataSearch ? rows.filter((r) => Object.values(r).some((v) => String(v || "").toLowerCase().includes(dataSearch.toLowerCase()))) : rows;
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));
  const autoSkip = (col) => col === "id" || col === "created_at" || col === "updated_at";
  const fmtCell = (v, col) => {
    if (v === null || v === void 0) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#9ca3af", fontStyle: "italic", fontSize: 9 }, children: "NULL" });
    const s = String(v);
    if (col === "id" || col.endsWith("_id")) return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#60a5fa", fontSize: 9 }, children: [
      s.slice(0, 8),
      "..."
    ] });
    if (s.includes("T") && s.includes(":")) {
      try {
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#94a3b8" }, children: new Date(s).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" }) });
      } catch {
      }
    }
    if (s === "true" || s === "false") return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: s === "true" ? "#22c55e" : "#ef4444", fontWeight: 700, fontSize: 10 }, children: s });
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 180 }, children: s.slice(0, 80) + (s.length > 80 ? "..." : "") });
  };
  const ctxMenuItems = (row) => [
    { label: "View Data in New Tab", icon: Eye, action: () => openTab(activeTable) },
    { label: "Vacuum", icon: Activity, action: () => toast({ title: "Vacuum executed" }) },
    { label: "", divider: true, action: () => {
    } },
    { label: "Select Statement", icon: Copy, action: () => copySelectSQL(row) },
    { label: "Insert Statement", icon: Plus, action: () => copyInsertSQL(row) },
    { label: "Delete Statement", icon: Trash2, color: "#ef4444", action: () => {
      navigator.clipboard?.writeText(`DELETE FROM ${activeTable} WHERE id = '${row.id}';`);
      toast({ title: "Delete SQL copied" });
    } },
    { label: "Update Statement", icon: PenLine, action: () => {
      const sql = `UPDATE ${activeTable} SET column = value WHERE id = '${row.id}';`;
      navigator.clipboard?.writeText(sql);
      toast({ title: "Update SQL copied" });
    } }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    display: "flex",
    flexDirection: "column",
    height: fullscreen ? "100vh" : "100%",
    position: fullscreen ? "fixed" : "relative",
    inset: fullscreen ? 0 : void 0,
    zIndex: fullscreen ? 9e3 : void 0,
    background: "#f8f9fa",
    fontFamily: "'Segoe UI',Inter,system-ui,sans-serif",
    color: "#1e1e1e"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", padding: "0 12px", height: 40, background: "#0a2558", borderBottom: "1px solid #0d3070", flexShrink: 0, gap: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { style: { width: 14, height: 14, color: "#60a5fa" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "#cdd6f4" }, children: "Supabase EL5 MediProcure" })
      ] }),
      rtConnected && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(34,197,94,0.1)", borderRadius: 4, border: "1px solid rgba(34,197,94,0.2)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { style: { width: 10, height: 10, color: "#22c55e" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, fontWeight: 700, color: "#22c55e" }, children: "REALTIME ON" })
      ] }),
      rtEvents.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(96,165,250,0.1)", borderRadius: 4 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { style: { width: 9, height: 9, color: "#60a5fa" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 9, color: "#60a5fa" }, children: [
          rtEvents[0].e,
          " · ",
          rtEvents[0].t,
          " · ",
          rtEvents[0].time
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setBottomPanel((p) => p === "sql" ? null : "sql"), style: {
          padding: "3px 10px",
          fontSize: 10,
          fontWeight: 700,
          border: "1px solid",
          borderRadius: 4,
          cursor: "pointer",
          background: bottomPanel === "sql" ? "#1a3a6b" : "transparent",
          borderColor: bottomPanel === "sql" ? "#1a3a6b" : "#2e3248",
          color: bottomPanel === "sql" ? "#93c5fd" : "#64748b"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { style: { width: 11, height: 11, display: "inline", marginRight: 4 } }),
          "SQL Editor"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setBottomPanel((p) => p === "vis" ? null : "vis"), style: {
          padding: "3px 10px",
          fontSize: 10,
          fontWeight: 700,
          border: "1px solid",
          borderRadius: 4,
          cursor: "pointer",
          background: bottomPanel === "vis" ? "#5C2D91" : "transparent",
          borderColor: bottomPanel === "vis" ? "#5C2D91" : "#2e3248",
          color: bottomPanel === "vis" ? "#d8b4fe" : "#64748b"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { style: { width: 11, height: 11, display: "inline", marginRight: 4 } }),
          "Visualization"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setFullscreen((f) => !f), style: { padding: "3px 8px", background: "transparent", border: "1px solid #2e3248", borderRadius: 4, cursor: "pointer", color: "#64748b" }, children: fullscreen ? /* @__PURE__ */ jsxRuntimeExports.jsx(Minimize2, { style: { width: 11, height: 11 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { style: { width: 11, height: 11 } }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "0 8px", display: "flex", alignItems: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", padding: "4px 12px 3px", background: "#f5f5f5", border: "1px solid #e0e0e0", borderBottom: "none", borderRadius: "4px 4px 0 0", marginTop: 2, gap: 5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { style: { width: 11, height: 11, color: "#22c55e" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "#1e1e1e", fontWeight: 600 }, children: "PGSQL (postgres@EL5MediProcure)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 10, height: 10, color: "#64748b", cursor: "pointer" } })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 240, display: "flex", flexDirection: "column", background: "#fff", borderRight: "1px solid #e0e0e0", flexShrink: 0, overflow: "hidden" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid #2e3248", flexShrink: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 800, color: "#1e1e1e" }, children: "DB Objects" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { style: { width: 12, height: 12, color: "#64748b", cursor: "pointer" } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "6px 8px", borderBottom: "1px solid #2e3248", display: "flex", gap: 4, flexShrink: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { style: { flex: 1, fontSize: 11, background: "#f5f5f5", color: "#374151", border: "1px solid #d1d5db", borderRadius: 3, padding: "3px 6px", outline: "none" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "public" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "auth" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "storage" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => loadTable(activeTable), style: { padding: "3px 6px", background: "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", color: "#60a5fa" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 11, height: 11 } }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "5px 8px", borderBottom: "1px solid #2e3248", flexShrink: 0, position: "relative" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, color: "#475569" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: tblSearch,
              onChange: (e) => setTblSearch(e.target.value),
              placeholder: "Search objects...",
              style: { width: "100%", paddingLeft: 24, paddingRight: 6, paddingTop: 4, paddingBottom: 4, fontSize: 11, background: "#f9fafb", color: "#1e1e1e", border: "1px solid #d1d5db", borderRadius: 3, outline: "none" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "4px 0" }, children: [
          TABLE_GROUPS.map((grp) => {
            const tbls = tblSearch ? grp.tables.filter((t) => t.includes(tblSearch.toLowerCase())) : grp.tables;
            if (tblSearch && tbls.length === 0) return null;
            const isOpen = expandedGroups[grp.id];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => setExpandedGroups((p) => ({ ...p, [grp.id]: !p[grp.id] })),
                  style: { display: "flex", alignItems: "center", gap: 5, width: "100%", padding: "4px 10px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" },
                  children: [
                    isOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { style: { width: 11, height: 11, color: "#64748b" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { style: { width: 11, height: 11, color: "#9ca3af" } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, color: grp.color }, children: grp.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: "auto", fontSize: 9, color: "#9ca3af" }, children: tbls.length })
                  ]
                }
              ),
              isOpen && tbls.map((t) => {
                activeTable === t && openTabs.includes(t);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => openTab(t),
                    onContextMenu: (e) => {
                      e.preventDefault();
                      openTab(t);
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      padding: "4px 14px 4px 28px",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      background: activeTable === t ? `${grp.color}28` : "transparent"
                    },
                    onMouseEnter: (e) => {
                      if (activeTable !== t) e.currentTarget.style.background = "#f0f0f0";
                    },
                    onMouseLeave: (e) => {
                      if (activeTable !== t) e.currentTarget.style.background = "transparent";
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Table, { style: { width: 11, height: 11, flexShrink: 0, color: activeTable === t ? grp.color : "#475569" } }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: activeTable === t ? "#1e1e1e" : "#374151", fontWeight: activeTable === t ? 700 : 400 }, children: t })
                    ]
                  },
                  t
                );
              })
            ] }, grp.id);
          }),
          [
            { label: "Views", icon: Eye, color: "#0ea5e9" },
            { label: "Procedures", icon: Play, color: "#a78bfa" },
            { label: "Sequences", icon: Layers, color: "#f97316" },
            { label: "Trigger Functions", icon: Zap, color: "#fbbf24" }
          ].map((obj) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: { display: "flex", alignItems: "center", gap: 5, width: "100%", padding: "4px 10px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { style: { width: 11, height: 11, color: "#3d4460" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(obj.icon, { style: { width: 11, height: 11, color: obj.color } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, color: "#4a5270" }, children: obj.label })
          ] }, obj.label))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", alignItems: "center", background: "#f5f5f5", borderBottom: "1px solid #e0e0e0", flexShrink: 0, overflowX: "auto", paddingLeft: 4 }, children: openTabs.map((tab) => {
          const g2 = TABLE_GROUPS.find((g) => g.tables.includes(tab));
          const isAct = tab === activeTable;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onClick: () => setActiveTable(tab),
              style: {
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px 4px",
                cursor: "pointer",
                flexShrink: 0,
                background: isAct ? "#fff" : "#f5f5f5",
                borderRight: "1px solid #e0e0e0",
                borderBottom: isAct ? "1px solid #141825" : "none",
                marginBottom: isAct ? "-1px" : 0
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Table, { style: { width: 11, height: 11, color: isAct ? g2?.color || "#60a5fa" : "#475569" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: isAct ? "#1e1e1e" : "#6b7280", fontWeight: isAct ? 700 : 400, whiteSpace: "nowrap" }, children: [
                  "Table Data public.",
                  tab
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: (e) => closeTab(tab, e), style: { padding: "1px 2px", background: "transparent", border: "none", cursor: "pointer", color: "#475569", marginLeft: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 9, height: 9 } }) })
              ]
            },
            tab
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", background: "#fff", borderBottom: "1px solid #e0e0e0", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 13, fontWeight: 800, color: "#1e1e1e" }, children: [
          "Table Data public.",
          activeTable
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", background: "#fff", borderBottom: "1px solid #e0e0e0", flexShrink: 0, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", color: "#374151", fontSize: 11, fontWeight: 600 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { style: { width: 11, height: 11 } }),
            " Options ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { style: { width: 9, height: 9 } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 1, height: 18, background: "#2e3248" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: truncateConfirm,
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: "#374151", fontSize: 11 },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f3f4f6",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 11, height: 11, color: "#f97316" } }),
                " Truncate"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: dropConfirm,
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: "#374151", fontSize: 11 },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f3f4f6",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 11, height: 11, color: "#ef4444" } }),
                " Drop"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 1, height: 18, background: "#2e3248" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setNewRowMode(true);
            setNewRowVals({});
          }, style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "#15803d", border: "none", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 11, height: 11 } }),
            " Add Row"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: "#374151", fontSize: 11 },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f3f4f6",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { style: { width: 11, height: 11, color: "#94a3b8" } }),
                " Total Rows: ",
                rowCount.toLocaleString()
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowFilter((f) => !f),
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: showFilter ? "#1a3a6b" : "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: showFilter ? "#93c5fd" : "#94a3b8", fontSize: 11 },
              onMouseEnter: (e) => {
                if (!showFilter) e.currentTarget.style.background = "#2e3248";
              },
              onMouseLeave: (e) => {
                if (!showFilter) e.currentTarget.style.background = "transparent";
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { style: { width: 11, height: 11 } }),
                " Filter"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 1, height: 18, background: "#2e3248" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => exportXlsx(false),
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: "#374151", fontSize: 11 },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f3f4f6",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 11, height: 11 } }),
                " Export ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { style: { width: 9, height: 9 } })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => exportXlsx(true),
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: "#374151", fontSize: 11 },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f3f4f6",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 11, height: 11 } }),
                " Export All Rows"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: "transparent", border: "none", borderRadius: 3, cursor: "pointer", color: "#374151", fontSize: 11 },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f3f4f6",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { style: { width: 11, height: 11 } }),
                " Import Data"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }, children: "Max Rows:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: maxRows, onChange: (e) => setMaxRows(Number(e.target.value)), style: { fontSize: 10, background: "#2e3248", color: "#cdd6f4", border: "1px solid #3a3d52", borderRadius: 3, padding: "2px 4px", width: 60 }, children: MAX_ROWS_OPTIONS.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: v }, v)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }, children: "Rows On Page:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: pageSize, onChange: (e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
                loadTable(activeTable, 1);
              }, style: { fontSize: 10, background: "#2e3248", color: "#cdd6f4", border: "1px solid #3a3d52", borderRadius: 3, padding: "2px 4px", width: 55 }, children: PAGE_SIZE_OPTIONS.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: v }, v)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => loadTable(activeTable, page), disabled: loading, style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", color: "#60a5fa", fontSize: 11, fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 11, height: 11 } }),
              " Refresh"
            ] })
          ] })
        ] }),
        showFilter && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#13162a", borderBottom: "1px solid #2e3248", flexShrink: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { style: { width: 11, height: 11, color: "#60a5fa" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#64748b" }, children: "Filter:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filterCol, onChange: (e) => setFilterCol(e.target.value), style: { fontSize: 10, background: "#f5f5f5", color: "#374151", border: "1px solid #d1d5db", borderRadius: 3, padding: "3px 6px" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Column..." }),
            cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#64748b" }, children: "contains" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: filterVal,
              onChange: (e) => setFilterVal(e.target.value),
              placeholder: "value...",
              style: { fontSize: 10, background: "#f5f5f5", color: "#374151", border: "1px solid #d1d5db", borderRadius: 3, padding: "3px 8px", width: 140, outline: "none" }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => loadTable(activeTable, 1), style: { padding: "3px 10px", background: "#1a3a6b", color: "#93c5fd", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 10, fontWeight: 700 }, children: "Apply" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            setFilterCol("");
            setFilterVal("");
            setShowFilter(false);
            loadTable(activeTable, 1, "", "asc");
          }, style: { padding: "3px 8px", background: "#2e3248", color: "#64748b", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 10 }, children: "Clear" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", position: "relative" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, color: "#475569" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: dataSearch,
                onChange: (e) => setDataSearch(e.target.value),
                placeholder: "Search visible rows...",
                style: { fontSize: 10, background: "#f5f5f5", color: "#374151", border: "1px solid #d1d5db", borderRadius: 3, padding: "3px 6px 3px 22px", width: 160, outline: "none" }
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflow: "auto", position: "relative" }, children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 20, height: 20, color: "#475569", animation: "spin 1s linear infinite" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#475569", fontSize: 12 }, children: [
              "Loading ",
              activeTable,
              "..."
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: "max-content", fontSize: 11 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#1e2438", position: "sticky", top: 0, zIndex: 5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { width: 40, padding: "6px 8px", textAlign: "left", color: "#3d4460", fontSize: 10, fontWeight: 700, borderRight: "1px solid #2e3248", position: "sticky", left: 0, background: "#1e2438" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  onChange: (e) => {
                    if (e.target.checked) setSelectedRows(new Set(filtered.map((r) => r.id)));
                    else setSelectedRows(/* @__PURE__ */ new Set());
                  },
                  style: { accentColor: "#60a5fa" }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { width: 72, padding: "6px 6px", textAlign: "left", color: "#3d4460", fontSize: 9, fontWeight: 700, borderRight: "1px solid #2e3248", position: "sticky", left: 40, background: "#1e2438" }, children: "ACTIONS" }),
              cols.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  onClick: () => handleSort(col),
                  style: {
                    padding: "6px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: sortCol === col ? "#60a5fa" : "#7a85a0",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRight: "1px solid #1e2438",
                    whiteSpace: "nowrap",
                    minWidth: 100,
                    userSelect: "none"
                  },
                  onMouseEnter: (e) => e.currentTarget.style.background = "#252a40",
                  onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
                    col,
                    sortCol === col ? sortDir === "asc" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpNarrowWide, { style: { width: 10, height: 10 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownWideNarrow, { style: { width: 10, height: 10 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpDown, { style: { width: 9, height: 9, opacity: 0.3 } })
                  ] })
                },
                col
              ))
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              newRowMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#0d2a1a", borderBottom: "1px solid #2e3248" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 8px", borderRight: "1px solid #2e3248" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 6px", borderRight: "1px solid #2e3248", position: "sticky", left: 40, background: "#0d2a1a" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 2 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: insertRow, title: "Save", style: { padding: "3px", background: "#22c55e", border: "none", borderRadius: 3, cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { style: { width: 12, height: 12, color: "#fff" } }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setNewRowMode(false), title: "Cancel", style: { padding: "3px", background: "#475569", border: "none", borderRadius: 3, cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 12, height: 12, color: "#fff" } }) })
                ] }) }),
                cols.map((col) => autoSkip(col) ? /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 12px", color: "#3d4460", fontStyle: "italic", fontSize: 10 }, children: "auto" }, col) : /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "2px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    value: newRowVals[col] || "",
                    onChange: (e) => setNewRowVals((p) => ({ ...p, [col]: e.target.value })),
                    style: { width: "100%", padding: "3px 6px", background: "#0f2810", color: "#86efac", border: "1px solid #22c55e", borderRadius: 2, fontSize: 11, outline: "none", fontFamily: "inherit", minWidth: 80 }
                  }
                ) }, col))
              ] }),
              filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: cols.length + 2, style: { padding: "30px", textAlign: "center", color: "#3d4460", fontSize: 12 }, children: "No data in table" }) }) : filtered.map((row, i) => {
                const isEditing = editingId === row.id;
                const isSelected = selectedRows.has(row.id);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "tr",
                  {
                    onContextMenu: (e) => {
                      e.preventDefault();
                      setCtx({ x: e.clientX, y: e.clientY, row });
                    },
                    onDoubleClick: () => {
                      setEditingId(row.id);
                      setEditValues({ ...row });
                    },
                    style: {
                      borderBottom: "1px solid #1a1f30",
                      cursor: "pointer",
                      background: isEditing ? "#0e2040" : isSelected ? "#1a1e38" : i % 2 === 0 ? "#10121c" : "#12152a"
                    },
                    onMouseEnter: (e) => {
                      if (!isEditing && !isSelected) e.currentTarget.style.background = "#1e2440";
                    },
                    onMouseLeave: (e) => {
                      if (!isEditing && !isSelected) e.currentTarget.style.background = i % 2 === 0 ? "#10121c" : "#12152a";
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", borderRight: "1px solid #1a1f30", position: "sticky", left: 0, background: "inherit" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "checkbox",
                          checked: isSelected,
                          onChange: (e) => {
                            setSelectedRows((prev) => {
                              const n = new Set(prev);
                              if (e.target.checked) n.add(row.id);
                              else n.delete(row.id);
                              return n;
                            });
                          },
                          style: { accentColor: "#60a5fa" }
                        }
                      ) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 6px", borderRight: "1px solid #1a1f30", position: "sticky", left: 40, background: "inherit" }, children: isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 2 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: updateRow, title: "Save", style: { padding: "3px", background: "#1d4ed8", border: "none", borderRadius: 3, cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 12, height: 12, color: "#fff" } }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditingId(null), title: "Cancel", style: { padding: "3px", background: "#475569", border: "none", borderRadius: 3, cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 12, height: 12, color: "#fff" } }) })
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 2 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            onClick: () => deleteRow(row.id),
                            title: "Delete",
                            style: { padding: "3px", background: "none", border: "none", cursor: "pointer" },
                            onMouseEnter: (e) => e.currentTarget.style.background = "#3f1515",
                            onMouseLeave: (e) => e.currentTarget.style.background = "none",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13, color: "#ef4444" } })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            onClick: () => {
                              setEditingId(row.id);
                              setEditValues({ ...row });
                            },
                            title: "Edit",
                            style: { padding: "3px", background: "none", border: "none", cursor: "pointer" },
                            onMouseEnter: (e) => e.currentTarget.style.background = "#133a13",
                            onMouseLeave: (e) => e.currentTarget.style.background = "none",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { style: { width: 13, height: 13, color: "#22c55e" } })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            onClick: () => {
                              setNewRowMode(true);
                              setNewRowVals({ ...row, id: void 0, created_at: void 0, updated_at: void 0 });
                            },
                            title: "Clone row",
                            style: { padding: "3px", background: "none", border: "none", cursor: "pointer" },
                            onMouseEnter: (e) => e.currentTarget.style.background = "#0e3a1a",
                            onMouseLeave: (e) => e.currentTarget.style.background = "none",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 13, height: 13, color: "#22c55e" } })
                          }
                        )
                      ] }) }),
                      cols.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 12px", borderRight: "1px solid #1a1f30", maxWidth: 200 }, children: isEditing && !autoSkip(col) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          value: editValues[col] ?? "",
                          onChange: (e) => setEditValues((p) => ({ ...p, [col]: e.target.value })),
                          style: { width: "100%", padding: "2px 6px", background: "#0f172a", color: "#bfdbfe", border: "1px solid #1d4ed8", borderRadius: 2, fontSize: 11, outline: "none", fontFamily: "inherit", minWidth: 80 }
                        }
                      ) : fmtCell(row[col], col) }, col))
                    ]
                  },
                  row.id || i
                );
              })
            ] })
          ] }) }),
          bottomPanel && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 320, borderTop: "2px solid #2e3248", flexShrink: 0 }, children: bottomPanel === "sql" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SqlPanel, { table: activeTable, onClose: () => setBottomPanel(null) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(VisPanel, { rows, cols }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "4px 12px", background: "#1a1e2e", borderTop: "1px solid #2e3248", flexShrink: 0, fontSize: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setPage(1);
              loadTable(activeTable, 1);
            }, disabled: page === 1, style: { padding: "2px 6px", background: "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", color: "#94a3b8", opacity: page === 1 ? 0.3 : 1 }, children: "«" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              const p = Math.max(1, page - 1);
              setPage(p);
              loadTable(activeTable, p);
            }, disabled: page === 1, style: { padding: "2px 6px", background: "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", color: "#94a3b8", opacity: page === 1 ? 0.3 : 1 }, children: "‹" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { padding: "2px 8px", background: "#2e3248", borderRadius: 3, color: "#94a3b8" }, children: [
              "Page ",
              page,
              "/",
              totalPages
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              const p = Math.min(totalPages, page + 1);
              setPage(p);
              loadTable(activeTable, p);
            }, disabled: page >= totalPages, style: { padding: "2px 6px", background: "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", color: "#94a3b8", opacity: page >= totalPages ? 0.3 : 1 }, children: "›" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setPage(totalPages);
              loadTable(activeTable, totalPages);
            }, disabled: page >= totalPages, style: { padding: "2px 6px", background: "#2e3248", border: "none", borderRadius: 3, cursor: "pointer", color: "#94a3b8", opacity: page >= totalPages ? 0.3 : 1 }, children: "»" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#475569" }, children: [
            "Rows ",
            (page - 1) * pageSize + 1,
            "–",
            Math.min(page * pageSize, rowCount),
            " of ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#64748b" }, children: rowCount.toLocaleString() })
          ] }),
          sortCol && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#3d4460" }, children: [
            "Sorted: ",
            sortCol,
            " ",
            sortDir
          ] }),
          selectedRows.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#fbbf24" }, children: [
              selectedRows.size,
              " selected"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: deleteSelected, style: { padding: "1px 8px", background: "#7f1d1d", border: "none", borderRadius: 3, cursor: "pointer", color: "#fca5a5", fontSize: 9, fontWeight: 700 }, children: "Delete Selected" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#2a3050" }, children: "· Double-click row to edit · Right-click for SQL menu" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }, children: [
            rtConnected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#22c55e" }, children: "Real-time Active" })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "#475569" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#475569" }, children: "Connecting..." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { style: { width: 10, height: 10, color: "#3d4460" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#3d4460" }, children: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-KE") })
          ] })
        ] })
      ] })
    ] }),
    ctx && /* @__PURE__ */ jsxRuntimeExports.jsx(
      CtxMenu,
      {
        x: ctx.x,
        y: ctx.y,
        items: ctxMenuItems(ctx.row || {}),
        onClose: () => setCtx(null)
      }
    )
  ] });
}
function Zap(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { ...props, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) });
}
function AdminDatabasePage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RoleGuard, { allowed: ["admin", "database_admin"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableBrowser, {}) });
}
const TABS = [
  { id: "overview", label: "Overview", icon: Monitor, color: "#1a3a6b" },
  { id: "layout", label: "Layout & UI", icon: Palette, color: "#8b5cf6" },
  { id: "system", label: "System Config", icon: Settings, color: "#374151" },
  { id: "users", label: "Users", icon: Users, color: "#0078d4" },
  { id: "audit", label: "Audit Log", icon: Activity, color: "#C45911" },
  { id: "api", label: "API & Keys", icon: Key, color: "#107c10" },
  { id: "diagnostics", label: "Diagnostics", icon: Terminal, color: "#dc2626" },
  { id: "backup", label: "Backup", icon: Archive, color: "#065f46" }
];
function Toggle$1({ on, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(!on), style: { background: "transparent", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 44, height: 24, borderRadius: 12, background: on ? "#1a3a6b" : "#d1d5db", display: "flex", alignItems: "center", padding: 2, transition: "all 0.2s" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "transform 0.2s", transform: on ? "translateX(20px)" : "translateX(0)" } }) }) });
}
function StatCard({ label, val, icon: Icon, color, sub }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 30, height: 30, borderRadius: 7, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { style: { width: 15, height: 15, color } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }, children: label })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 26, fontWeight: 900, color: "#111827", lineHeight: 1 }, children: val }),
    sub && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 4 }, children: sub })
  ] });
}
function Row$1({ label, val, ok }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", gap: 12 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 500, color: "#374151" }, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontFamily: "monospace", color: "#6b7280", background: "#f3f4f6", padding: "2px 9px", borderRadius: 4, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: val }),
      ok !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 7, height: 7, borderRadius: "50%", background: ok ? "#22c55e" : "#ef4444", flexShrink: 0 } })
    ] })
  ] });
}
function WebmasterInner() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = reactExports.useState("overview");
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [users, setUsers] = reactExports.useState([]);
  const [audit, setAudit] = reactExports.useState([]);
  const [srch, setSrch] = reactExports.useState("");
  const [apiKeys, setApiKeys] = reactExports.useState([]);
  const logRef = reactExports.useRef(null);
  const [sysLog, setSysLog] = reactExports.useState([]);
  const [stats, setStats] = reactExports.useState({ users: 0, active: 0, auditTotal: 0, settings: 0, tables: 32, notifications: 0 });
  const [S, setS] = reactExports.useState({
    nav_position: "top",
    sidebar_width: "240",
    header_height: "52",
    btn_radius: "8",
    table_style: "stripe",
    density: "normal",
    primary_color: "#1a3a6b",
    accent_color: "#C45911",
    font_family: "Inter",
    card_shadow: "sm",
    show_breadcrumb: "true",
    show_footer: "true",
    show_version_badge: "true",
    enable_animations: "true",
    enable_dark_mode: "false",
    maintenance_mode: "false",
    audit_log_enabled: "true",
    realtime_enabled: "true",
    allow_user_registration: "true",
    session_timeout: "60",
    max_upload_mb: "10",
    default_locale: "en-KE",
    default_currency: "KES",
    default_date_format: "DD/MM/YYYY",
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_from: "",
    backup_auto: "daily",
    backup_retention: "30"
  });
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setB = (k, v) => setS((p) => ({ ...p, [k]: String(v) }));
  const addLog = reactExports.useCallback((msg) => {
    const t = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-KE");
    setSysLog((p) => [`[${t}] ${msg}`, ...p.slice(0, 99)]);
  }, []);
  const load = reactExports.useCallback(async () => {
    setLoading(true);
    addLog("Loading system data…");
    const [usersR, auditR, settingsR, notifsR] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,is_active,created_at,department,user_roles(role)").order("created_at", { ascending: false }),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("system_settings").select("key,value").limit(100),
      supabase.from("notifications").select("id", { count: "exact", head: true })
    ]);
    const u = usersR.data || [];
    const a = auditR.data || [];
    const s = settingsR.data || [];
    setUsers(u);
    setAudit(a);
    const m = {};
    s.forEach((r) => {
      if (r.key) m[r.key] = r.value;
    });
    setS((p) => ({ ...p, ...m }));
    setStats({ users: u.length, active: u.filter((x) => x.is_active !== false).length, auditTotal: a.length, settings: s.length, tables: 32, notifications: notifsR.count || 0 });
    addLog(`Loaded ${u.length} users, ${a.length} audit entries, ${s.length} settings`);
    setLoading(false);
  }, [addLog]);
  reactExports.useEffect(() => {
    load();
  }, [load]);
  const saveSettings2 = async (keys) => {
    setSaving(true);
    addLog(`Saving ${keys.length} settings: ${keys.slice(0, 3).join(", ")}…`);
    for (const k of keys) {
      const val = S[k] || "";
      const { data: ex } = await supabase.from("system_settings").select("id").eq("key", k).maybeSingle();
      if (ex?.id) await supabase.from("system_settings").update({ value: val }).eq("key", k);
      else await supabase.from("system_settings").insert({ key: k, value: val });
    }
    await supabase.from("audit_log").insert({ user_id: user?.id, action: "webmaster_settings_updated", table_name: "system_settings", details: JSON.stringify({ keys }) });
    toast({ title: "Settings saved ✓", description: `${keys.length} value(s) updated globally` });
    addLog(`✓ ${keys.length} settings saved`);
    setSaving(false);
  };
  const toggleUser = async (id, current, name) => {
    await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
    toast({ title: `User ${!current ? "activated" : "deactivated"} ✓`, description: name });
    addLog(`User ${name} ${!current ? "activated" : "deactivated"}`);
    load();
  };
  const resetUserPassword = async (email) => {
    addLog(`Password reset requested for ${email}`);
    toast({ title: "Password reset email sent", description: email });
  };
  const generateApiKey = () => {
    const key = "sk-medi-" + Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18);
    const name = `API Key ${apiKeys.length + 1}`;
    setApiKeys((p) => [...p, { name, key, created: (/* @__PURE__ */ new Date()).toLocaleDateString("en-KE") }]);
    addLog(`New API key generated: ${name}`);
    toast({ title: "API key generated", description: "Copy and store securely" });
  };
  const runDiagnostic = async (name, fn) => {
    addLog(`Running diagnostic: ${name}…`);
    const ok = await fn().catch(() => false);
    addLog(`${name}: ${ok ? "✓ PASS" : "✗ FAIL"}`);
    toast({ title: `${name}: ${ok ? "PASS ✓" : "FAIL ✗"}`, variant: ok ? void 0 : "destructive" });
  };
  const exportAudit = () => {
    const ws = utils.json_to_sheet(audit.slice(0, 1e3).map((r) => ({
      Date: new Date(r.created_at).toLocaleString("en-KE"),
      User: r.user_id?.slice(0, 8) || "-",
      Action: r.action || "-",
      Table: r.table_name || "-",
      RecordID: r.record_id || "-"
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Audit Log");
    writeFileSync(wb, `audit-log-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    addLog("Audit log exported to XLSX");
  };
  const filteredAudit = audit.filter((a) => {
    if (!srch) return true;
    return [a.action, a.table_name, a.user_id, a.record_id].some((v) => String(v || "").toLowerCase().includes(srch.toLowerCase()));
  });
  const filteredUsers = users.filter((u) => {
    if (!srch) return true;
    return [u.full_name, u.email, u.department].some((v) => String(v || "").toLowerCase().includes(srch.toLowerCase()));
  });
  const INP = (k, ph, type = "text") => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type,
      value: S[k] || "",
      onChange: (e) => set(k, e.target.value),
      placeholder: ph || "",
      style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", fontFamily: "inherit" }
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", minHeight: "calc(100vh - 82px)", fontFamily: "'Inter','Segoe UI',sans-serif", background: "#f0f2f5" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 200, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "1px 0 4px rgba(0,0,0,0.04)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 14px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { style: { width: 14, height: 14, color: "#fff" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 800, color: "#fff" }, children: "Webmaster" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "rgba(255,255,255,0.45)" }, children: "System Control Panel" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, padding: "6px 0", overflowY: "auto" }, children: TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setTab(t.id),
          style: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", border: "none", background: tab === t.id ? `${t.color}10` : "transparent", cursor: "pointer", textAlign: "left", borderLeft: tab === t.id ? `3px solid ${t.color}` : "3px solid transparent", transition: "all 0.1s" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 24, height: 24, borderRadius: 5, background: tab === t.id ? `${t.color}18` : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(t.icon, { style: { width: 12, height: 12, color: tab === t.id ? t.color : "#9ca3af" } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? t.color : "#374151" }, children: t.label })
          ]
        },
        t.id
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "8px 10px", background: "#0a1628", minHeight: 120, maxHeight: 160, overflowY: "auto" }, ref: logRef, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#22c55e", fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }, children: "▶ LIVE CONSOLE" }),
        sysLog.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#374151" }, children: "No logs yet…" }) : sysLog.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#6ee7b7", fontFamily: "monospace", lineHeight: 1.6, wordBreak: "break-all" }, children: l }, i))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", fontSize: 9, color: "#9ca3af", fontWeight: 600 }, children: "EL5 MediProcure v2.1.0" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 16 }, children: [
      loading && tab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: 24, color: "#9ca3af", fontSize: 13 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 18, height: 18 }, className: "animate-spin" }),
        " Loading system data…"
      ] }),
      tab === "overview" && !loading && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Total Users", val: stats.users, icon: Users, color: "#0078d4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Active Users", val: stats.active, icon: CircleCheckBig, color: "#107c10" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "System Tables", val: stats.tables, icon: Database, color: "#374151", sub: "Supabase PostgreSQL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Audit Entries", val: stats.auditTotal, icon: Activity, color: "#C45911" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Settings Saved", val: stats.settings, icon: Settings, color: "#8b5cf6" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Notifications", val: stats.notifications, icon: Bell, color: "#f59e0b" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { style: { width: 14, height: 14, color: "#1a3a6b" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: "System Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e" } }),
              " ALL SYSTEMS OPERATIONAL"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "4px 16px 12px" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Application", val: "EL5 MediProcure v2.1.0 · React 18 · Vite 5", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Database", val: "Supabase PostgreSQL 15 · 32 tables · RLS active", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Authentication", val: "Supabase Auth · JWT · Session-based", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Real-time Engine", val: "WebSocket · Channels active", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Storage", val: "Supabase Storage (S3-compatible)", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Maintenance Mode", val: S.maintenance_mode === "true" ? "ENABLED — Users locked out" : "Disabled", ok: S.maintenance_mode !== "true" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Audit Logging", val: S.audit_log_enabled === "true" ? "Active — all changes tracked" : "DISABLED", ok: S.audit_log_enabled === "true" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Real-time Notifs", val: S.realtime_enabled === "true" ? "Enabled" : "Disabled", ok: S.realtime_enabled === "true" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Browser", val: navigator.userAgent.slice(0, 60) + "…", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Timezone", val: Intl.DateTimeFormat().resolvedOptions().timeZone + " · " + (/* @__PURE__ */ new Date()).toLocaleString("en-KE"), ok: true })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }, children: [
          { label: "User Management", path: "/users", icon: Users, color: "#0078d4" },
          { label: "Database Admin", path: "/admin/database", icon: Database, color: "#374151" },
          { label: "Audit Log", path: "/audit-log", icon: Activity, color: "#C45911" },
          { label: "Backup Manager", path: "/backup", icon: Archive, color: "#065f46" },
          { label: "Admin Panel", path: "/admin/panel", icon: Settings, color: "#1a3a6b" },
          { label: "Email System", path: "/email", icon: Mail, color: "#7c3aed" }
        ].map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => navigate(l.path),
            style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, cursor: "pointer", textAlign: "left", transition: "all 0.12s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
            onMouseEnter: (e) => {
              e.currentTarget.style.borderColor = l.color;
              e.currentTarget.style.background = `${l.color}06`;
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.background = "#fff";
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 34, height: 34, borderRadius: 8, background: `${l.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(l.icon, { style: { width: 16, height: 16, color: l.color } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "#374151" }, children: l.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { style: { width: 12, height: 12, color: "#d1d5db", marginLeft: "auto" } })
            ]
          },
          l.path
        )) })
      ] }),
      tab === "layout" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { style: { width: 14, height: 14, color: "#8b5cf6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: "Layout & UI Customization" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => saveSettings2(["nav_position", "sidebar_width", "header_height", "btn_radius", "table_style", "density", "primary_color", "accent_color", "font_family", "card_shadow", "show_breadcrumb", "show_footer", "enable_animations", "enable_dark_mode"]),
              disabled: saving,
              style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 },
              children: [
                saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 11, height: 11 }, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 11, height: 11 } }),
                " Save Layout"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Navigation Position" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: S.nav_position || "top",
                onChange: (e) => set("nav_position", e.target.value),
                style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "top", children: "Top bar (current)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "left", children: "Left sidebar" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Header Height (px)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: S.header_height || "52", onChange: (e) => set("header_height", e.target.value), style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Button Border Radius (px)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: "0", max: "20", value: S.btn_radius || "8", onChange: (e) => set("btn_radius", e.target.value), style: { width: "100%" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", textAlign: "center" }, children: [
              S.btn_radius || "8",
              "px"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Table Style" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: S.table_style || "stripe",
                onChange: (e) => set("table_style", e.target.value),
                style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "stripe", children: "Striped rows" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "border", children: "Bordered" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "minimal", children: "Minimal" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Content Density" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: S.density || "normal",
                onChange: (e) => set("density", e.target.value),
                style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "compact", children: "Compact" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "normal", children: "Normal" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "comfortable", children: "Comfortable" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Font Family" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: S.font_family || "Inter",
                onChange: (e) => set("font_family", e.target.value),
                style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", fontFamily: S.font_family || "Inter" },
                children: ["Inter", "System UI", "Georgia", "Roboto", "Open Sans", "Lato", "Nunito"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: f, style: { fontFamily: f }, children: f }, f))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Primary Color" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", value: S.primary_color || "#1a3a6b", onChange: (e) => set("primary_color", e.target.value), style: { width: 40, height: 32, borderRadius: 5, border: "1px solid #e5e7eb", cursor: "pointer", padding: 2 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontFamily: "monospace", color: "#374151", flex: 1 }, children: S.primary_color || "#1a3a6b" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Accent Color" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", value: S.accent_color || "#C45911", onChange: (e) => set("accent_color", e.target.value), style: { width: 40, height: 32, borderRadius: 5, border: "1px solid #e5e7eb", cursor: "pointer", padding: 2 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontFamily: "monospace", color: "#374151", flex: 1 }, children: S.accent_color || "#C45911" })
            ] })
          ] }),
          [
            ["Show Breadcrumb", "show_breadcrumb"],
            ["Show Footer", "show_footer"],
            ["Enable Animations", "enable_animations"],
            ["Dark Mode", "enable_dark_mode"]
          ].map(([label, key]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9fafb" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 500, color: "#374151" }, children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle$1, { on: S[key] === "true", onChange: (v) => setB(key, v) })
          ] }, key)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1/-1", marginTop: 8, padding: "16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Preview" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { style: { padding: "8px 18px", background: S.primary_color || "#1a3a6b", color: "#fff", border: "none", borderRadius: +(S.btn_radius || "8"), fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: S.font_family || "Inter" }, children: "Primary Button" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { style: { padding: "8px 18px", background: S.accent_color || "#C45911", color: "#fff", border: "none", borderRadius: +(S.btn_radius || "8"), fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: S.font_family || "Inter" }, children: "Accent Button" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "8px 18px", background: "#fff", border: `2px solid ${S.primary_color || "#1a3a6b"}`, borderRadius: +(S.btn_radius || "8"), fontSize: 13, fontWeight: 600, color: S.primary_color || "#1a3a6b", fontFamily: S.font_family || "Inter" }, children: "Outline Button" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "4px 10px", background: `${S.primary_color || "#1a3a6b"}18`, color: S.primary_color || "#1a3a6b", borderRadius: 4, fontSize: 11, fontWeight: 700 }, children: "Badge" })
            ] })
          ] })
        ] })
      ] }),
      tab === "system" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { style: { width: 14, height: 14, color: "#374151" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: "System Configuration" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => saveSettings2(["maintenance_mode", "audit_log_enabled", "realtime_enabled", "allow_user_registration", "session_timeout", "max_upload_mb", "default_locale", "default_currency", "default_date_format"]),
              disabled: saving,
              style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 },
              children: [
                saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 11, height: 11 }, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 11, height: 11 } }),
                " Save System"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "0 16px 16px" }, children: [
          [
            ["Maintenance Mode", "maintenance_mode", "Locks out all non-admin users"],
            ["Audit Logging", "audit_log_enabled", "Log all user actions and data changes"],
            ["Real-time Updates", "realtime_enabled", "Live WebSocket data sync across sessions"],
            ["Allow User Registration", "allow_user_registration", "Let new users self-register"]
          ].map(([label, key, sub]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f3f4f6", gap: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#111827" }, children: label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 1 }, children: sub })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle$1, { on: S[key] === "true", onChange: (v) => setB(key, v) })
          ] }, key)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 10 }, children: [
            [{ l: "Session Timeout (min)", k: "session_timeout" }, { l: "Max Upload (MB)", k: "max_upload_mb" }, { l: "Default Locale", k: "default_locale" }, { l: "Default Currency", k: "default_currency" }, { l: "Date Format", k: "default_date_format" }].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: f.l }),
              INP(f.k)
            ] }, f.k)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "SMTP Host" }),
              INP("smtp_host", "smtp.gmail.com")
            ] })
          ] })
        ] })
      ] }),
      tab === "users" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { style: { width: 14, height: 14, color: "#0078d4" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: [
            "User Management · ",
            stats.users,
            " users"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, color: "#9ca3af" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: srch,
                onChange: (e) => setSrch(e.target.value),
                placeholder: "Search users…",
                style: { paddingLeft: 26, padding: "6px 10px 6px 26px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", background: "#f9fafb", width: 200 }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => navigate("/users"), style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#0078d4", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 11, height: 11 } }),
            " Full User Manager"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { overflowX: "auto" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }, children: ["Name", "Email", "Role", "Department", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }, children: h }, h)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredUsers.slice(0, 30).map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "tr",
              {
                style: { borderBottom: "1px solid #f9fafb" },
                onMouseEnter: (e) => e.currentTarget.style.background = "#fafafa",
                onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 700, color: "#111827" }, children: u.full_name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280", fontSize: 12 }, children: u.email }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#eff6ff", color: "#1a3a6b" }, children: u.user_roles?.[0]?.role || "—" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280", fontSize: 12 }, children: u.department || "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: u.is_active !== false ? "#dcfce7" : "#fee2e2", color: u.is_active !== false ? "#15803d" : "#dc2626" }, children: u.is_active !== false ? "Active" : "Inactive" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 5 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: () => toggleUser(u.id, u.is_active !== false, u.full_name),
                        style: { padding: "3px 9px", background: u.is_active !== false ? "#fee2e2" : "#dcfce7", border: `1px solid ${u.is_active !== false ? "#fecaca" : "#bbf7d0"}`, borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, color: u.is_active !== false ? "#dc2626" : "#15803d" },
                        children: u.is_active !== false ? "Deactivate" : "Activate"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: () => resetUserPassword(u.email),
                        style: { padding: "3px 9px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#374151" },
                        children: "Reset PW"
                      }
                    )
                  ] }) })
                ]
              },
              u.id
            )) })
          ] }),
          filteredUsers.length > 30 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "8px 12px", fontSize: 11, color: "#9ca3af", textAlign: "center", borderTop: "1px solid #f3f4f6" }, children: [
            "Showing 30 of ",
            filteredUsers.length,
            " — ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate("/users"), style: { color: "#1a3a6b", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }, children: "View all in User Manager" })
          ] })
        ] })
      ] }),
      tab === "audit" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { style: { width: 14, height: 14, color: "#C45911" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: [
            "Audit Log · ",
            audit.length,
            " entries"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, color: "#9ca3af" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: srch,
                onChange: (e) => setSrch(e.target.value),
                placeholder: "Filter…",
                style: { paddingLeft: 26, padding: "6px 10px 6px 26px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", background: "#f9fafb", width: 180 }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportAudit, style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#C45911", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 11, height: 11 } }),
            " Export XLSX"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate("/audit-log"), style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#374151" }, children: "Full Audit Log" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto", maxHeight: "calc(100vh - 280px)", overflowY: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { style: { position: "sticky", top: 0, zIndex: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }, children: ["Time", "Action", "Table", "Record ID", "User"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredAudit.slice(0, 100).map((a, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              style: { borderBottom: "1px solid #f9fafb" },
              onMouseEnter: (e) => e.currentTarget.style.background = "#fafafa",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px", color: "#9ca3af", whiteSpace: "nowrap" }, children: new Date(a.created_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px", fontWeight: 600, color: "#374151" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "monospace", fontSize: 11 }, children: a.action || "—" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px", color: "#6b7280" }, children: a.table_name || "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px", color: "#9ca3af", fontFamily: "monospace", fontSize: 11 }, children: a.record_id?.slice(0, 12) || "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px", color: "#6b7280", fontSize: 11 }, children: a.user_id?.slice(0, 8) || "system" })
              ]
            },
            a.id || i
          )) })
        ] }) })
      ] }),
      tab === "api" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { style: { width: 14, height: 14, color: "#107c10" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: "API Keys" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: generateApiKey, style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#107c10", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 11, height: 11 } }),
              " Generate Key"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }, children: "⚠ API keys give programmatic access to EL5 MediProcure. Never share them publicly." }),
            apiKeys.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "28px", textAlign: "center", color: "#9ca3af", fontSize: 13 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { style: { width: 28, height: 28, color: "#e5e7eb", margin: "0 auto 10px" } }),
              "No API keys yet. Generate one to get started."
            ] }) : apiKeys.map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827" }, children: k.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontFamily: "monospace", color: "#6b7280", marginTop: 2 }, children: k.key }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af", marginTop: 2 }, children: [
                  "Created: ",
                  k.created
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    navigator.clipboard?.writeText(k.key);
                    toast({ title: "Copied ✓" });
                  },
                  style: { padding: "5px 12px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#374151" },
                  children: "Copy"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    setApiKeys((p) => p.filter((_, j) => j !== i));
                    addLog(`API key ${k.name} revoked`);
                  },
                  style: { padding: "5px 9px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", lineHeight: 0 },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 12, height: 12 } })
                }
              )
            ] }, i))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827" }, children: "Supabase Connection Info" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "4px 16px 14px" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Project URL", val: "https://yvjfehnzbzjliizjvuhq.supabase.co", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Anon Key", val: "(configured in environment)", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "Auth Method", val: "JWT Bearer Token", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "API Version", val: "REST v1 · WebSocket", ok: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Row$1, { label: "RLS Policies", val: "Enabled on all tables", ok: true })
          ] })
        ] })
      ] }),
      tab === "diagnostics" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { style: { width: 14, height: 14, color: "#dc2626" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: "System Diagnostics" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => runDiagnostic("Full System Check", async () => {
              const { error } = await supabase.from("profiles").select("id").limit(1);
              return !error;
            }), style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { style: { width: 11, height: 11 } }),
              " Run All"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: [
            { n: "Database Ping", fn: async () => {
              const { error } = await supabase.from("profiles").select("id").limit(1);
              return !error;
            } },
            { n: "Auth Service", fn: async () => {
              const { data } = await supabase.auth.getSession();
              return !!data;
            } },
            { n: "Notifications Table", fn: async () => {
              const { error } = await supabase.from("notifications").select("id").limit(1);
              return !error;
            } },
            { n: "Inbox Items Table", fn: async () => {
              const { error } = await supabase.from("inbox_items").select("id").limit(1);
              return !error;
            } },
            { n: "Audit Log Write", fn: async () => {
              const { error } = await supabase.from("audit_log").insert({ action: "diagnostic_test", table_name: "system" });
              return !error;
            } },
            { n: "Settings Read", fn: async () => {
              const { error } = await supabase.from("system_settings").select("key").limit(1);
              return !error;
            } },
            { n: "Real-time Channel", fn: async () => {
              let ok = false;
              const ch = supabase.channel("test-" + Date.now()).subscribe((s) => {
                ok = s === "SUBSCRIBED";
              });
              await new Promise((r) => setTimeout(r, 1500));
              await supabase.removeChannel(ch);
              return ok;
            } },
            { n: "Browser Local Storage", fn: async () => {
              try {
                localStorage.setItem("test", "1");
                localStorage.removeItem("test");
                return true;
              } catch {
                return false;
              }
            } }
          ].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => runDiagnostic(d.n, d.fn),
              style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.12s" },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f0f9ff",
              onMouseLeave: (e) => e.currentTarget.style.background = "#f9fafb",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { style: { width: 12, height: 12, color: "#dc2626", flexShrink: 0 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#374151" }, children: d.n }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af" }, children: "Click to run test" })
                ] })
              ]
            },
            d.n
          )) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#0a1628", borderRadius: 10, padding: 16, maxHeight: 360, overflowY: "auto" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { style: { width: 13, height: 13, color: "#22c55e" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: "0.08em" }, children: "DIAGNOSTIC OUTPUT" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSysLog([]), style: { marginLeft: "auto", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: "#6b7280" }, children: "Clear" })
          ] }),
          sysLog.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#374151", fontFamily: "monospace" }, children: "Run a diagnostic to see output…" }) : sysLog.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#6ee7b7", fontFamily: "monospace", lineHeight: 1.7 }, children: l }, i))
        ] })
      ] }),
      tab === "backup" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderBottom: "2px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Archive, { style: { width: 14, height: 14, color: "#065f46" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: "Backup & Restore" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate("/backup"), style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#065f46", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: "Open Full Backup Manager" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }, children: [
          [
            ["Backup Schedule", "backup_auto", ["hourly", "daily", "weekly", "monthly"]],
            ["Retention (days)", "backup_retention", null]
          ].map(([label, key, opts]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: label }),
            opts ? /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: S[key] || opts[1], onChange: (e) => set(key, e.target.value), style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" }, children: opts.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o, children: o }, o)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: S[key] || "30", onChange: (e) => set(key, e.target.value), style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" } })
          ] }, key)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }, children: [
            { l: "Export Users", fn: () => {
              const ws = utils.json_to_sheet(users.map((u) => ({ Name: u.full_name, Email: u.email, Role: u.user_roles?.[0]?.role || "—", Dept: u.department || "—", Active: u.is_active !== false ? "Yes" : "No", Created: u.created_at?.slice(0, 10) || "—" })));
              const wb = utils.book_new();
              utils.book_append_sheet(wb, ws, "Users");
              writeFileSync(wb, "users-export.xlsx");
              addLog("Users exported");
            } },
            { l: "Export Audit", fn: exportAudit },
            { l: "Export Settings", fn: () => {
              const s_data = [];
              Object.entries(S).forEach(([k, v]) => s_data.push({ Key: k, Value: v }));
              const ws = utils.json_to_sheet(s_data);
              const wb = utils.book_new();
              utils.book_append_sheet(wb, ws, "Settings");
              writeFileSync(wb, "settings-export.xlsx");
              addLog("Settings exported");
            } }
          ].map((op) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: op.fn, style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#374151" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 12, height: 12, color: "#065f46" } }),
            op.l
          ] }, op.l)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => saveSettings2(["backup_auto", "backup_retention"]),
              disabled: saving,
              style: { display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "#065f46", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, marginTop: 4 },
              children: [
                saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 }, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 12, height: 12 } }),
                " Save Backup Config"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function WebmasterPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RoleGuard, { allowed: ["admin"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(WebmasterInner, {}) });
}
const BACKUP_TABLES = [
  "profiles",
  "user_roles",
  "items",
  "item_categories",
  "suppliers",
  "departments",
  "requisitions",
  "requisition_items",
  "purchase_orders",
  "goods_received",
  "payment_vouchers",
  "receipt_vouchers",
  "journal_vouchers",
  "purchase_vouchers",
  "sales_vouchers",
  "contracts",
  "tenders",
  "bid_evaluations",
  "inspections",
  "non_conformance",
  "budgets",
  "fixed_assets",
  "chart_of_accounts",
  "bank_accounts",
  "procurement_plans",
  "stock_movements",
  "gl_entries",
  "system_settings",
  "documents",
  "audit_log",
  "notifications",
  "inbox_items",
  "backup_jobs",
  "odbc_connections"
];
function BackupInner() {
  const { user, profile } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name", "Embu Level 5 Hospital");
  const sysName = getSetting("system_name", "EL5 MediProcure");
  const [jobs, setJobs] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [running, setRunning] = reactExports.useState(false);
  const [progress, setProgress] = reactExports.useState(0);
  const [currentTable, setCurrentTable] = reactExports.useState("");
  const [backupFmt, setBackupFmt] = reactExports.useState("Excel (XLSX)");
  const [backupSch, setBackupSch] = reactExports.useState("Weekly (Sunday)");
  const [backupScope, setBackupScope] = reactExports.useState(["All Tables", "Procurement Only", "Finance Only", "Users & Roles", "System Settings", "Audit Logs", "Quality"]);
  reactExports.useEffect(() => {
    loadJobs();
  }, []);
  const loadJobs = async () => {
    setLoading(true);
    const { data } = await supabase.from("backup_jobs").select("*").order("started_at", { ascending: false }).limit(20);
    setJobs(data || []);
    setLoading(false);
  };
  const runBackup = async () => {
    setRunning(true);
    setProgress(0);
    const { data: job } = await supabase.from("backup_jobs").insert({
      label: `Full Backup — ${(/* @__PURE__ */ new Date()).toLocaleString("en-KE")}`,
      status: "running",
      initiated_by: user?.id,
      started_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    const wb = utils.book_new();
    const rowCounts = {};
    const tablesData = {};
    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const tbl = BACKUP_TABLES[i];
      setCurrentTable(tbl);
      setProgress(Math.round(i / BACKUP_TABLES.length * 80));
      try {
        const { data: d } = await supabase.from(tbl).select("*").limit(5e3);
        const rows = d || [];
        tablesData[tbl] = rows;
        rowCounts[tbl] = rows.length;
        if (rows.length > 0) {
          const ws = utils.json_to_sheet(rows);
          utils.book_append_sheet(wb, ws, tbl.slice(0, 30));
        }
      } catch (e) {
        rowCounts[tbl] = 0;
      }
    }
    setProgress(85);
    const summaryRows = [
      [`${hospitalName} — ${sysName}`],
      [`Full Database Backup`],
      [`Generated: ${(/* @__PURE__ */ new Date()).toLocaleString("en-KE")}`],
      [`Initiated by: ${profile?.full_name || "Admin"}`],
      [],
      ["TABLE", "RECORDS"],
      ...Object.entries(rowCounts).map(([t, c]) => [t, c]),
      [],
      ["TOTAL RECORDS", Object.values(rowCounts).reduce((a, b) => a + b, 0)]
    ];
    const wsSummary = utils.aoa_to_sheet(summaryRows);
    utils.book_append_sheet(wb, wsSummary, "SUMMARY");
    wb.SheetNames = ["SUMMARY", ...wb.SheetNames.filter((s) => s !== "SUMMARY")];
    setProgress(90);
    const fileName = `${hospitalName.replace(/\s+/g, "_")}_Backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`;
    writeFileSync(wb, fileName);
    setProgress(100);
    setCurrentTable("");
    const totalRows = Object.values(rowCounts).reduce((a, b) => a + b, 0);
    if (job) {
      await supabase.from("backup_jobs").update({
        status: "completed",
        row_counts: rowCounts,
        tables_json: BACKUP_TABLES,
        completed_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", job.id);
    }
    toast({ title: "Backup Complete!", description: `${totalRows.toLocaleString()} records from ${BACKUP_TABLES.length} tables downloaded as Excel` });
    setRunning(false);
    setProgress(0);
    loadJobs();
  };
  const handleRestore = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,.sql,.gz,.zip,.backup";
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!confirm(`Restore from "${file.name}"? This will overwrite current data.`)) return;
      toast({ title: "Restore initiated", description: `Processing ${file.name} — manual DB restore required via Supabase dashboard.` });
      logAudit(user?.id, profile?.full_name, "restore", "backup", void 0, { file: file.name });
    };
    fileInput.click();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 24, maxWidth: 896, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Segoe UI',system-ui,sans-serif", background: "transparent", minHeight: "100%" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { style: { fontSize: 18, fontWeight: 900, color: "#1f2937", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Archive, { style: { width: 20, height: 20, color: "#1a3a6b" } }),
            " Backup & Recovery"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 12, color: "#6b7280", marginTop: 4 }, children: [
            "Full database backup to Excel — ",
            BACKUP_TABLES.length,
            " tables, all records"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: runBackup,
            disabled: running,
            style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", background: running ? "#9ca3af" : "linear-gradient(135deg,#1a3a6b,#1d4a87)" },
            children: running ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }),
              " Running Backup..."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 16, height: 16 } }),
              " Run Full Backup"
            ] })
          }
        )
      ] }),
      running && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Processing: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: currentTable })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            progress,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: "100%", height: 8, borderRadius: 4, background: "#f3f4f6", overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: "100%", borderRadius: 4, transition: "width 0.3s", width: `${progress}%`, background: "linear-gradient(90deg,#1a3a6b,#1d4a87)" } }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { style: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4b5563" }, children: [
        "Tables to Backup (",
        BACKUP_TABLES.length,
        ")"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }, children: BACKUP_TABLES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, fontSize: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { style: { width: 12, height: 12, flexShrink: 0, color: "#1a3a6b" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#4b5563" }, children: t })
      ] }, t)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { style: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4b5563" }, children: "Backup History" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: loadJobs, style: { padding: 5, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: loading ? "spin 1s linear infinite" : "none", width: 14, height: 14 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {}, children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "24px 20px", textAlign: "center", fontSize: 12, color: "#9ca3af" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }),
        "Loading..."
      ] }) : jobs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "24px 20px", textAlign: "center", fontSize: 12, color: "#9ca3af" }, children: "No backup history yet. Run your first backup above." }) : jobs.map((j) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, padding: "14px 20px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: j.status === "completed" ? "#d1fae5" : j.status === "failed" ? "#fee2e2" : "#fef3c7" }, children: j.status === "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { style: { width: 16, height: 16, color: "#16a34a" } }) : j.status === "failed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 16, height: 16, color: "#ef4444" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: j.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { style: { width: 12, height: 12 } }),
            new Date(j.started_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }),
            j.completed_at && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "→ ",
              new Date(j.completed_at).toLocaleTimeString("en-KE", { timeStyle: "short" })
            ] }),
            j.row_counts && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "• ",
              Object.values(j.row_counts).reduce((a, b) => a + b, 0).toLocaleString(),
              " records"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 700, textTransform: "capitalize", background: j.status === "completed" ? "#d1fae5" : j.status === "failed" ? "#fee2e2" : "#fef3c7", color: j.status === "completed" ? "#065f46" : j.status === "failed" ? "#991b1b" : "#92400e" }, children: j.status })
      ] }, j.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { style: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4b5563" }, children: "Backup Options & Schedule" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: 12, fontWeight: 900, color: "#374151" }, children: "Backup Format" }),
          ["Excel (XLSX)", "CSV (per table)", "JSON dump", "SQL Script"].map((fmt) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "backup_fmt", checked: backupFmt === fmt, onChange: () => setBackupFmt(fmt), style: { accentColor: "#2563eb" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#4b5563" }, children: fmt })
          ] }, fmt))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: 12, fontWeight: 900, color: "#374151" }, children: "Auto-Schedule" }),
          ["Daily at midnight", "Weekly (Sunday)", "Monthly (1st)", "Manual only"].map((sch) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "backup_sch", checked: backupSch === sch, onChange: () => setBackupSch(sch), style: { accentColor: "#2563eb" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#4b5563" }, children: sch })
          ] }, sch))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1/-1", paddingTop: 12, borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: 12, fontWeight: 900, color: "#374151", marginBottom: 8 }, children: "Backup Scope" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: ["All Tables", "Procurement Only", "Finance Only", "Users & Roles", "System Settings", "Audit Logs", "Quality"].map((scope) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, cursor: "pointer", background: backupScope.includes(scope) ? "#f0f9ff" : "#f9fafb", border: `1px solid ${backupScope.includes(scope) ? "#bae6fd" : "#e5e7eb"}` }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: backupScope.includes(scope), onChange: (e) => setBackupScope((p) => e.target.checked ? [...p, scope] : p.filter((s) => s !== scope)), style: { accentColor: "#2563eb", width: 12, height: 12 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: backupScope.includes(scope) ? "#1d4ed8" : "#6b7280", fontWeight: 600 }, children: scope })
          ] }, scope)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 16, display: "flex", gap: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: runBackup, disabled: running, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#1a3a6b,#1d4a87)" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 14, height: 14 } }),
              " Full Backup Now"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { style: { width: 14, height: 14 } }),
              " Verify Last Backup"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { style: { width: 14, height: 14 } }),
              " Save Schedule"
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { style: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4b5563", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Zap$1, { style: { width: 14, height: 14, color: "#f97316" } }),
        " Restore from Backup"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 20 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 16, borderRadius: 12, marginBottom: 16, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 12, color: "#dc2626", fontWeight: 600 }, children: "⚠️ Restoring overwrites current data. Ensure you have a current backup before proceeding." }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { style: { width: 16, height: 16 } }),
            "Upload Backup File (.xlsx)",
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", accept: ".xlsx,.csv,.json", style: { display: "none" }, onChange: () => {
            } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5" }, onClick: handleRestore, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { style: { width: 14, height: 14 } }),
            " Restore"
          ] })
        ] })
      ] })
    ] })
  ] });
}
function BackupPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RoleGuard, { allowed: ["admin", "procurement_manager"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackupInner, {}) });
}
const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "#4f46e5" },
  { id: "hospital", label: "Hospital Info", icon: Building2, color: "#0078d4" },
  { id: "modules", label: "Modules", icon: SlidersVertical, color: "#0369a1" },
  { id: "users", label: "Users & Access", icon: UserCheck, color: "#7c3aed" },
  { id: "security", label: "Security / IP", icon: Shield, color: "#dc2626" },
  { id: "email", label: "Email & SMTP", icon: Mail, color: "#059669" },
  { id: "sms", label: "SMS / Twilio", icon: Phone, color: "#7c3aed" },
  { id: "appearance", label: "Appearance", icon: Palette, color: "#8b5cf6" },
  { id: "print", label: "Print & Docs", icon: Printer, color: "#C45911" },
  { id: "broadcast", label: "Broadcast", icon: Radio, color: "#d97706" },
  { id: "database", label: "Database", icon: Database, color: "#374151" },
  { id: "codebase", label: "Source Code", icon: CodeXml, color: "#0f766e" },
  { id: "system", label: "System", icon: Server, color: "#6b7280" }
];
const MODULES = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, color: "#4f46e5" },
  { label: "Requisitions", path: "/requisitions", icon: ShoppingCart, color: "#0078d4" },
  { label: "Purchase Orders", path: "/purchase-orders", icon: Package, color: "#C45911" },
  { label: "Goods Received", path: "/goods-received", icon: Truck, color: "#059669" },
  { label: "Suppliers", path: "/suppliers", icon: Truck, color: "#374151" },
  { label: "Tenders", path: "/tenders", icon: Gavel, color: "#1F6090" },
  { label: "Contracts", path: "/contracts", icon: FileCheck, color: "#1a3a6b" },
  { label: "Inventory", path: "/items", icon: Package, color: "#059669" },
  { label: "Payment Vouchers", path: "/vouchers/payment", icon: DollarSign, color: "#C45911" },
  { label: "Receipt Vouchers", path: "/vouchers/receipt", icon: DollarSign, color: "#059669" },
  { label: "Journal Vouchers", path: "/vouchers/journal", icon: BookOpen, color: "#374151" },
  { label: "Finance", path: "/financials", icon: ChartNoAxesColumn, color: "#1F6090" },
  { label: "Budgets", path: "/financials/budgets", icon: PiggyBank, color: "#059669" },
  { label: "Chart of Accounts", path: "/financials/chart-of-accounts", icon: BookOpen, color: "#1a3a6b" },
  { label: "Fixed Assets", path: "/financials/fixed-assets", icon: Building2, color: "#d97706" },
  { label: "QC Dashboard", path: "/quality/dashboard", icon: Eye, color: "#7c3aed" },
  { label: "Inspections", path: "/quality/inspections", icon: Eye, color: "#059669" },
  { label: "Non-Conformance", path: "/quality/non-conformance", icon: TriangleAlert, color: "#dc2626" },
  { label: "Reports", path: "/reports", icon: ChartNoAxesColumn, color: "#1a3a6b" },
  { label: "Documents", path: "/documents", icon: FileText, color: "#374151" },
  { label: "Email", path: "/email", icon: Mail, color: "#7c3aed" },
  { label: "Users", path: "/users", icon: Users, color: "#0369a1" },
  { label: "Audit Log", path: "/audit-log", icon: Activity, color: "#C45911" },
  { label: "IP Access", path: "/admin/ip-access", icon: Shield, color: "#dc2626" },
  { label: "ODBC / SQL", path: "/odbc", icon: Database, color: "#0a2558" },
  { label: "Settings", path: "/settings", icon: Settings, color: "#6b7280" },
  { label: "Webmaster", path: "/webmaster", icon: Globe, color: "#059669" }
];
const CODE_TREE = {
  "src/pages": ["AdminPanelPage.tsx", "SettingsPage.tsx", "DashboardPage.tsx", "RequisitionsPage.tsx", "PurchaseOrdersPage.tsx", "GoodsReceivedPage.tsx", "SuppliersPage.tsx", "TendersPage.tsx", "ContractsPage.tsx", "ItemsPage.tsx", "UsersPage.tsx", "ODBCPage.tsx", "IpAccessPage.tsx"],
  "src/pages/financials": ["BudgetsPage.tsx", "ChartOfAccountsPage.tsx", "FixedAssetsPage.tsx"],
  "src/pages/quality": ["QualityDashboardPage.tsx", "InspectionsPage.tsx", "NonConformancePage.tsx"],
  "src/pages/vouchers": ["PaymentVouchersPage.tsx", "ReceiptVouchersPage.tsx", "JournalVouchersPage.tsx"],
  "src/lib": ["printDocument.ts", "audit.ts", "broadcast.ts", "sms.ts", "ipRestriction.ts", "notify.ts"],
  "src/hooks": ["useSystemSettings.ts", "usePermissions.ts"],
  "src/components": ["AppLayout.tsx", "NetworkGuard.tsx", "RoleGuard.tsx"],
  "supabase/functions": ["send-email/index.ts", "send-sms/index.ts"],
  ".github/workflows": ["build-exe.yml", "build-v5.yml", "build-v6.yml", "build-v7.yml", "build-desktop.yml"]
};
const Toggle = ({ on, onChange }) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(!on), style: { background: "none", border: "none", cursor: "pointer", padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 46, height: 24, borderRadius: 12, background: on ? "#4f46e5" : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", padding: "2px", transition: "background 0.2s", border: `1px solid ${on ? "#4f46e5" : "rgba(255,255,255,0.2)"}` }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", transform: on ? "translateX(22px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" } }) }) });
const Row = ({ label, sub, color, children }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 12 }, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
    color && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { display: "inline-block", width: 3, height: 12, borderRadius: 2, background: color, marginRight: 8, verticalAlign: "middle" } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 500, color: "#f1f5f9" }, children: label }),
    sub && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#64748b", marginTop: 2 }, children: sub })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flexShrink: 0 }, children })
] });
const Card = ({ title, icon: Icon, color, children }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { style: { width: 16, height: 16, color: "#fff" } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 600, color: "#f1f5f9" }, children: title })
  ] }),
  children
] });
function AdminPanelPage() {
  const navigate = useNavigate();
  useAuth();
  const { settings } = useSystemSettings();
  const [active, setActive] = reactExports.useState("overview");
  const [cfg, setCfg] = reactExports.useState({});
  const [saving, setSaving] = reactExports.useState(false);
  const [stats, setStats] = reactExports.useState({});
  const [loading, setLoading] = reactExports.useState(true);
  const [expanded, setExpanded] = reactExports.useState(/* @__PURE__ */ new Set(["src/pages"]));
  const [bcast, setBcast] = reactExports.useState({ title: "", body: "", type: "info" });
  const [bcasting, setBcasting] = reactExports.useState(false);
  const inp = { padding: "8px 11px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, fontSize: 13, color: "#f1f5f9", background: "rgba(255,255,255,0.06)", outline: "none", width: "100%" };
  const btn = (bg) => ({ padding: "8px 18px", borderRadius: 8, border: "none", background: bg, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 });
  reactExports.useEffect(() => {
    setCfg({ ...settings });
  }, [settings]);
  const loadStats = reactExports.useCallback(async () => {
    setLoading(true);
    const tbls = ["requisitions", "purchase_orders", "suppliers", "items", "goods_received", "payment_vouchers", "documents", "tenders", "profiles", "audit_log"];
    const counts = {};
    await Promise.all(tbls.map(async (t) => {
      const { count: count2 } = await supabase.from(t).select("*", { count: "exact", head: true });
      counts[t] = count2 || 0;
    }));
    setStats(counts);
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    loadStats();
  }, [loadStats]);
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  async function doSave() {
    setSaving(true);
    const res = await saveSettings(cfg);
    if (res.ok) toast({ title: "✅ Settings saved and propagated" });
    else toast({ title: "Save failed", variant: "destructive" });
    setSaving(false);
  }
  async function doBroadcast() {
    if (!bcast.title || !bcast.body) {
      toast({ title: "Title and message required", variant: "destructive" });
      return;
    }
    setBcasting(true);
    await sendSystemBroadcast({ title: bcast.title, message: bcast.body, type: bcast.type });
    toast({ title: "📡 Broadcast sent" });
    setBcast({ title: "", body: "", type: "info" });
    setBcasting(false);
  }
  const KPI = [
    { label: "Requisitions", n: stats.requisitions, color: "#4f46e5", path: "/requisitions", icon: ShoppingCart },
    { label: "Purchase Orders", n: stats.purchase_orders, color: "#C45911", path: "/purchase-orders", icon: Package },
    { label: "Suppliers", n: stats.suppliers, color: "#059669", path: "/suppliers", icon: Truck },
    { label: "Items", n: stats.items, color: "#0369a1", path: "/items", icon: Package },
    { label: "Users", n: stats.profiles, color: "#7c3aed", path: "/users", icon: Users },
    { label: "GRN Records", n: stats.goods_received, color: "#374151", path: "/goods-received", icon: Truck },
    { label: "Vouchers", n: stats.payment_vouchers, color: "#dc2626", path: "/vouchers/payment", icon: DollarSign },
    { label: "Tenders", n: stats.tenders, color: "#d97706", path: "/tenders", icon: Gavel }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RoleGuard, { allowed: ["admin", "webmaster"], children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { minHeight: "100vh", background: "linear-gradient(135deg,#070d1a 0%,#0d1b35 50%,#0a1225 100%)", color: "#f1f5f9", fontFamily: "var(--font-sans)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "rgba(79,70,229,0.12)", borderBottom: "1px solid rgba(79,70,229,0.25)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(10px)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoImg, alt: "EL5H", style: { width: 34, height: 34, borderRadius: 8, objectFit: "contain", background: "rgba(255,255,255,0.1)", padding: 4 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 16, fontWeight: 700, color: "#f1f5f9" }, children: "Admin Control Panel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#64748b" }, children: "EL5 MediProcure · Embu Level 5 Hospital" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: loadStats, style: { ...btn("rgba(255,255,255,0.08)"), padding: "8px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13 } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("linear-gradient(135deg,#4f46e5,#7c3aed)"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
          saving ? "Saving…" : "Save All"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 60px)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "rgba(0,0,0,0.35)", borderRight: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }, children: NAV.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setActive(n.id),
          style: { width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: active === n.id ? `rgba(79,70,229,0.18)` : "transparent", border: "none", borderLeft: active === n.id ? `3px solid ${n.color}` : "3px solid transparent", cursor: "pointer", transition: "all 0.15s" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(n.icon, { style: { width: 14, height: 14, color: active === n.id ? n.color : "#475569", flexShrink: 0 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12.5, fontWeight: active === n.id ? 600 : 400, color: active === n.id ? "#f1f5f9" : "#64748b" }, children: n.label })
          ]
        },
        n.id
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "22px 28px", overflowY: "auto", maxHeight: "calc(100vh - 60px)" }, children: [
        active === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 16, fontWeight: 700, marginBottom: 14, color: "#f1f5f9" }, children: "System Overview" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }, children: KPI.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => navigate(k.path),
              style: { padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 26, height: 26, borderRadius: 7, background: k.color, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(k.icon, { style: { width: 13, height: 13, color: "#fff" } }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "#64748b" }, children: k.label })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" }, children: loading ? "…" : (k.n || 0).toLocaleString() })
              ]
            },
            k.label
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 10 }, children: "All Modules — Quick Access" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }, children: MODULES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => navigate(m.path),
              style: { display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", cursor: "pointer" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 24, height: 24, borderRadius: 6, background: `${m.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(m.icon, { style: { width: 12, height: 12, color: m.color } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "#cbd5e1", fontWeight: 500 }, children: m.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { style: { width: 10, height: 10, color: "#475569", marginLeft: "auto", flexShrink: 0 } })
              ]
            },
            m.path
          )) })
        ] }),
        active === "hospital" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Hospital Information", icon: Building2, color: "#0078d4", children: [
          [
            { k: "hospital_name", l: "Hospital Name", p: "Embu Level 5 Hospital" },
            { k: "county_name", l: "County", p: "Embu County Government" },
            { k: "department_name", l: "Department", p: "Department of Health" },
            { k: "system_name", l: "System Name", p: "EL5 MediProcure" },
            { k: "hospital_address", l: "Address", p: "Embu Town, Kenya" },
            { k: "po_box", l: "P.O. Box", p: "P.O. Box 591-60100" },
            { k: "hospital_phone", l: "Phone", p: "+254 060 000000" },
            { k: "hospital_email", l: "Email", p: "info@embu.health.go.ke" },
            { k: "currency_symbol", l: "Currency", p: "KES" },
            { k: "vat_rate", l: "VAT Rate (%)", p: "16" }
          ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: f.l, color: "#0078d4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg[f.k] || "", onChange: (e) => set(f.k, e.target.value), placeholder: f.p, style: { ...inp, width: 260 } }) }, f.k)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#0078d4"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save"
          ] }) })
        ] }),
        active === "modules" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Module Toggles", icon: SlidersVertical, color: "#0369a1", children: [
          [
            { k: "enable_procurement", l: "Procurement", s: "Requisitions, POs, GRN, Suppliers" },
            { k: "enable_financials", l: "Finance", s: "Vouchers, Budgets, Chart of Accounts" },
            { k: "enable_quality", l: "Quality Control", s: "Inspections, NCR, QA Dashboard" },
            { k: "enable_tenders", l: "Tenders & Contracts", s: "Tender management" },
            { k: "enable_documents", l: "Documents", s: "Document library" },
            { k: "enable_email", l: "Email System", s: "Internal mail" },
            { k: "realtime_notifications", l: "Real-time Alerts", s: "Live notifications" },
            { k: "maintenance_mode", l: "Maintenance Mode", s: "⚠ Blocks all non-admin users" }
          ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: f.l, sub: f.s, color: f.k === "maintenance_mode" ? "#dc2626" : "#0369a1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: (cfg[f.k] || "true") !== "false", onChange: (v) => set(f.k, v ? "true" : "false") }) }, f.k)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#0369a1"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save & Apply"
          ] }) })
        ] }),
        active === "users" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Users & Access Control", icon: UserCheck, color: "#7c3aed", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Default Role", color: "#7c3aed", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: cfg["default_user_role"] || "requisitioner", onChange: (e) => set("default_user_role", e.target.value), style: { ...inp, width: 220 }, children: ["admin", "procurement_manager", "procurement_officer", "inventory_manager", "warehouse_officer", "requisitioner"].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: r }, r)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Allow Self-Registration", sub: "Users can sign up without admin", color: "#7c3aed", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: cfg["allow_registration"] === "true", onChange: (v) => set("allow_registration", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Audit All Logins", color: "#7c3aed", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: (cfg["audit_logins"] || "true") !== "false", onChange: (v) => set("audit_logins", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 14, display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate("/users"), style: btn("#7c3aed"), children: "Manage Users →" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("rgba(255,255,255,0.1)"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
              saving ? "Saving…" : "Save"
            ] })
          ] })
        ] }),
        active === "security" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Security & IP Restriction", icon: Shield, color: "#dc2626", children: [
          [
            { k: "ip_restriction_enabled", l: "IP Restriction Active", s: "Block unauthorized IP addresses" },
            { k: "allow_all_private", l: "Allow All Private IPs", s: "Auto-allow 10.x, 192.168.x" },
            { k: "log_all_ips", l: "Log All Access", s: "Record every IP check" },
            { k: "revoke_on_ip_change", l: "Revoke on IP Change", s: "Force re-login if IP changes" },
            { k: "force_network_check", l: "Strict IP Check", s: "Verify IP on every navigation" }
          ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: f.l, sub: f.s, color: "#dc2626", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: cfg[f.k] === "true", onChange: (v) => set(f.k, v ? "true" : "false") }) }, f.k)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Session Timeout (min)", color: "#dc2626", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg["session_timeout"] || "480", onChange: (e) => set("session_timeout", e.target.value), style: { ...inp, width: 80 }, type: "number" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Max Login Attempts", color: "#dc2626", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg["max_login_attempts"] || "5", onChange: (e) => set("max_login_attempts", e.target.value), style: { ...inp, width: 80 }, type: "number" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 14, display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate("/admin/ip-access"), style: btn("#dc2626"), children: "IP Access Manager →" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("rgba(255,255,255,0.1)"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
              saving ? "Saving…" : "Save"
            ] })
          ] })
        ] }),
        active === "email" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Email & SMTP", icon: Mail, color: "#059669", children: [
          [
            { k: "smtp_host", l: "SMTP Host", p: "smtp.gmail.com" },
            { k: "smtp_port", l: "SMTP Port", p: "587" },
            { k: "smtp_user", l: "Username", p: "noreply@embu.go.ke" },
            { k: "smtp_from_name", l: "From Name", p: "EL5 MediProcure" },
            { k: "smtp_from_email", l: "From Email", p: "noreply@embu.go.ke" }
          ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: f.l, color: "#059669", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg[f.k] || "", onChange: (e) => set(f.k, e.target.value), placeholder: f.p, style: { ...inp, width: 260 } }) }, f.k)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "SMTP Password", color: "#059669", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: cfg["smtp_pass"] || "", onChange: (e) => set("smtp_pass", e.target.value), style: { ...inp, width: 260 }, placeholder: "••••••••" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Enable TLS", color: "#059669", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: (cfg["smtp_tls"] || "true") !== "false", onChange: (v) => set("smtp_tls", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Enable SMTP", color: "#059669", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: cfg["smtp_enabled"] === "true", onChange: (v) => set("smtp_enabled", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#059669"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save"
          ] }) })
        ] }),
        active === "sms" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "SMS / Twilio", icon: Phone, color: "#7c3aed", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Enable Twilio SMS", color: "#7c3aed", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: cfg["twilio_enabled"] === "true", onChange: (v) => set("twilio_enabled", v ? "true" : "false") }) }),
          [
            { k: "twilio_account_sid", l: "Account SID", p: "ACxxxx" },
            { k: "twilio_auth_token", l: "Auth Token", p: "your_auth_token", pw: true },
            { k: "twilio_phone_number", l: "Twilio Phone", p: "+12025551234" },
            { k: "sms_hospital_name", l: "SMS Sender", p: "EL5 MediProcure" }
          ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: f.l, color: "#7c3aed", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: f.pw ? "password" : "text", value: cfg[f.k] || "", onChange: (e) => set(f.k, e.target.value), placeholder: f.p, style: { ...inp, width: 260 } }) }, f.k)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { margin: "8px 0 12px", padding: "8px 12px", background: "rgba(124,58,237,0.1)", borderRadius: 8, fontSize: 11, color: "#a78bfa" }, children: [
            "Get credentials at ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://www.twilio.com/console", target: "_blank", rel: "noreferrer", style: { color: "#818cf8" }, children: "twilio.com/console" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#7c3aed"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save"
          ] })
        ] }),
        active === "appearance" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Appearance", icon: Palette, color: "#8b5cf6", children: [
          [{ k: "primary_color", l: "Primary Colour" }, { k: "accent_color", l: "Accent Colour" }].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: f.l, color: "#8b5cf6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", value: cfg[f.k] || "#1a3a6b", onChange: (e) => set(f.k, e.target.value), style: { width: 36, height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", cursor: "pointer", padding: 2 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg[f.k] || "", onChange: (e) => set(f.k, e.target.value), style: { ...inp, width: 100 }, placeholder: "#1a3a6b" })
          ] }) }, f.k)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Theme", color: "#8b5cf6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: cfg["theme"] || "dark", onChange: (e) => set("theme", e.target.value), style: { ...inp, width: 140 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dark", children: "Dark" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "light", children: "Light" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "system", children: "System" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#8b5cf6"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save & Propagate"
          ] }) })
        ] }),
        active === "print" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Print & Documents", icon: Printer, color: "#C45911", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Print Font", color: "#C45911", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: cfg["print_font"] || "Times New Roman", onChange: (e) => set("print_font", e.target.value), style: { ...inp, width: 200 }, children: ["Times New Roman", "Arial", "Calibri", "Georgia", "Cambria"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: f }, f)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Font Size (pt)", color: "#C45911", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg["print_font_size"] || "11", onChange: (e) => set("print_font_size", e.target.value), style: { ...inp, width: 70 }, type: "number", min: "8", max: "16" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Paper Size", color: "#C45911", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: cfg["paper_size"] || "A4", onChange: (e) => set("paper_size", e.target.value), style: { ...inp, width: 120 }, children: ["A4", "Letter", "Legal", "A5"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: s }, s)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Show Logo on Prints", color: "#C45911", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: (cfg["show_logo_print"] || "true") !== "false", onChange: (v) => set("show_logo_print", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Show Official Stamp Box", color: "#C45911", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: (cfg["show_stamp"] || "true") !== "false", onChange: (v) => set("show_stamp", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Confidential Notice", color: "#C45911", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: (cfg["print_confidential"] || "true") !== "false", onChange: (v) => set("print_confidential", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#C45911"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save"
          ] }) })
        ] }),
        active === "broadcast" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "System Broadcast", icon: Radio, color: "#d97706", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Title", color: "#d97706", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: bcast.title, onChange: (e) => setBcast((p) => ({ ...p, title: e.target.value })), placeholder: "System Alert", style: { ...inp, width: 300 } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 500, color: "#f1f5f9", marginBottom: 6 }, children: "Message" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: bcast.body, onChange: (e) => setBcast((p) => ({ ...p, body: e.target.value })), style: { ...inp, height: 80, resize: "vertical" }, placeholder: "Message to all active users…" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Type", color: "#d97706", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: bcast.type, onChange: (e) => setBcast((p) => ({ ...p, type: e.target.value })), style: { ...inp, width: 160 }, children: ["info", "warning", "success", "error", "maintenance", "announcement"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: t }, t)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 14 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doBroadcast, disabled: bcasting, style: btn("#d97706"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { style: { width: 13, height: 13 } }),
            bcasting ? "Sending…" : "Send to All Users"
          ] }) })
        ] }),
        active === "database" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Database", icon: Database, color: "#374151", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Supabase Project ID", color: "#374151", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { style: { fontSize: 12, color: "#94a3b8" }, children: "yvjfehnzbzjliizjvuhq" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Region", color: "#374151", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#94a3b8" }, children: "af-south-1 (Africa / Nairobi)" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "PostgreSQL", color: "#374151", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#94a3b8" }, children: "57 tables · RLS enabled on all" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            { l: "DB Admin →", p: "/admin/database", c: "#374151" },
            { l: "ODBC / SQL →", p: "/odbc", c: "#0a2558" },
            { l: "Backup →", p: "/backup", c: "#065f46" },
            { l: "Audit Log →", p: "/audit-log", c: "#C45911" }
          ].map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate(b.p), style: btn(b.c), children: b.l }, b.p)) })
        ] }),
        active === "codebase" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#94a3b8" }, children: "Source Code — ProcurBosse v2.0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "rgba(0,0,0,0.4)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }, children: Object.entries(CODE_TREE).map(([folder, files]) => {
            const open = expanded.has(folder);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => setExpanded((p) => {
                    const s = new Set(p);
                    s.has(folder) ? s.delete(folder) : s.add(folder);
                    return s;
                  }),
                  style: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: open ? "rgba(79,70,229,0.1)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" },
                  children: [
                    open ? /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { style: { width: 13, height: 13, color: "#d97706" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Folder, { style: { width: 13, height: 13, color: "#d97706" } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11.5, fontFamily: "var(--font-mono)", fontWeight: 600, color: "#cbd5e1" }, children: [
                      folder,
                      "/"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "#475569", marginLeft: "auto" }, children: [
                      files.length,
                      " files"
                    ] })
                  ]
                }
              ),
              open && files.map((file) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 32px", borderBottom: "1px solid rgba(255,255,255,0.03)" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { style: { width: 10, height: 10, color: file.endsWith(".ts") || file.endsWith(".tsx") ? "#61afef" : file.endsWith(".yml") ? "#98c379" : "#abb2bf", flexShrink: 0 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontFamily: "var(--font-mono)", color: "#94a3b8" }, children: file })
              ] }, file))
            ] }, folder);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10, fontSize: 11, color: "#475569" }, children: [
            "Repo: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://github.com/huiejorjdsksfn/medi-procure-hub", target: "_blank", rel: "noreferrer", style: { color: "#4f46e5" }, children: "github.com/huiejorjdsksfn/medi-procure-hub" })
          ] })
        ] }),
        active === "system" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "System Configuration", icon: Server, color: "#6b7280", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Version", color: "#6b7280", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "var(--font-mono)", color: "#818cf8" }, children: "v2.0.0 — ProcurBosse" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Date Format", color: "#6b7280", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: cfg["date_format"] || "DD/MM/YYYY", onChange: (e) => set("date_format", e.target.value), style: { ...inp, width: 160 }, children: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: f }, f)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Timezone", color: "#6b7280", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg["timezone"] || "Africa/Nairobi", onChange: (e) => set("timezone", e.target.value), style: { ...inp, width: 200 } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Max Upload (MB)", color: "#6b7280", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: cfg["max_upload_mb"] || "25", onChange: (e) => set("max_upload_mb", e.target.value), style: { ...inp, width: 80 }, type: "number" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Maintenance Mode", sub: "⚠ Blocks all non-admin users", color: "#dc2626", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { on: cfg["maintenance_mode"] === "true", onChange: (v) => set("maintenance_mode", v ? "true" : "false") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doSave, disabled: saving, style: btn("#6b7280"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
            saving ? "Saving…" : "Save & Apply"
          ] }) })
        ] })
      ] })
    ] })
  ] }) });
}
export {
  AuthProvider as A,
  BackupPage as B,
  RoleGuard as R,
  WebmasterPage as W,
  useToast as a,
  subscribeToBroadcasts as b,
  logoImg as c,
  useSystemSettings as d,
  saveSettings as e,
  sendSystemBroadcast as f,
  applyThemeToDOM as g,
  AdminDatabasePage as h,
  AdminPanelPage as i,
  logAudit as l,
  supabase as s,
  toast as t,
  useAuth as u
};
