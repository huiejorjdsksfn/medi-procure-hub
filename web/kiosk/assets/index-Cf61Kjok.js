import { r as reactExports, j as jsxRuntimeExports, V as Viewport, R as Root2, A as Action, C as Close, X, T as Title, D as Description, P as Provider, a as Content2, b as Provider$1, S as ScanBarcode, c as Camera, d as Search, e as RefreshCw, f as CircleCheckBig, G as Globe, g as TriangleAlert, h as Package, i as Plus, k as Database, l as Clock, m as Save, n as Phone, o as Send, L as LogIn, p as LogOut, E as Eye, q as Printer, s as Trash2, t as Check, Q as QueryClientProvider, B as BrowserRouter, u as Routes, v as Route, N as Navigate, w as useNavigate, M as MonitorSmartphone, x as EyeOff, y as Scan, U as Users, z as Bell, F as createRoot } from "./react-vendor-BA7eqly6.js";
import { u as twMerge, v as clsx, w as cva } from "./vendor-CqgT1PRs.js";
import { Q as QueryClient } from "./query-vendor-h2HP3qi4.js";
import { c as createClient } from "./supabase-vendor-BiKldBLe.js";
import "./ui-vendor-B-mNdDrH.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
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
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const ToastProvider = Provider;
const ToastViewport = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Viewport,
  {
    ref,
    className: cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    ),
    ...props
  }
));
ToastViewport.displayName = Viewport.displayName;
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
const Toast = reactExports.forwardRef(({ className, variant, ...props }, ref) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2, { ref, className: cn(toastVariants({ variant }), className), ...props });
});
Toast.displayName = Root2.displayName;
const ToastAction = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Action,
  {
    ref,
    className: cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors group-[.destructive]:border-muted/40 hover:bg-secondary group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:focus:ring-destructive disabled:pointer-events-none disabled:opacity-50",
      className
    ),
    ...props
  }
));
ToastAction.displayName = Action.displayName;
const ToastClose = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Close,
  {
    ref,
    className: cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 hover:text-foreground group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    ),
    "toast-close": "",
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" })
  }
));
ToastClose.displayName = Close.displayName;
const ToastTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { ref, className: cn("text-sm font-semibold", className), ...props }));
ToastTitle.displayName = Title.displayName;
const ToastDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { ref, className: cn("text-sm opacity-90", className), ...props }));
ToastDescription.displayName = Description.displayName;
function Toaster() {
  const { toasts } = useToast();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ToastProvider, { children: [
    toasts.map(function({ id, title, description, action, ...props }) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Toast, { ...props, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-1", children: [
          title && /* @__PURE__ */ jsxRuntimeExports.jsx(ToastTitle, { children: title }),
          description && /* @__PURE__ */ jsxRuntimeExports.jsx(ToastDescription, { children: description })
        ] }),
        action,
        /* @__PURE__ */ jsxRuntimeExports.jsx(ToastClose, {})
      ] }, id);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ToastViewport, {})
  ] });
}
const TooltipProvider = Provider$1;
const TooltipContent = reactExports.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Content2,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
));
TooltipContent.displayName = Content2.displayName;
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
      const { data, error: error2 } = await supabase.auth.signInWithPassword({ email, password });
      if (!error2 && data.user) {
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
      if (error2) {
        const offline = await verifyOfflineLogin(email, await hashPassword(password).catch(() => password));
        if (offline?.ok) {
          setOfflineMode(true);
          setUser(makeOfflineUser(email));
          setRoles(offline.roles);
          setProfile(offline.profile);
          return {};
        }
        return { error: error2.message };
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
async function lookupOnline(barcode) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product) {
      const p = d.product;
      return {
        name: p.product_name || p.product_name_en || "Unknown Product",
        description: [p.brands, p.quantity, p.packaging].filter(Boolean).join(" · "),
        brand: p.brands,
        category: p.categories?.split(",")[0]?.trim(),
        imageUrl: p.image_front_url,
        source: "Open Food Facts"
      };
    }
  } catch {
  }
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (r.ok) {
      const d = await r.json();
      if (d.items?.length > 0) {
        const item = d.items[0];
        return {
          name: item.title || "Unknown",
          description: item.description,
          brand: item.brand,
          category: item.category,
          imageUrl: item.images?.[0],
          source: "UPC Item DB"
        };
      }
    }
  } catch {
  }
  try {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product?.product_name) {
      return {
        name: d.product.product_name,
        brand: d.product.brands,
        category: "Beauty/Medical",
        source: "Open Beauty Facts"
      };
    }
  } catch {
  }
  return null;
}
function ScannerPage() {
  const { user, profile } = useAuth();
  const [scanning, setScanning] = reactExports.useState(false);
  const [barcode, setBarcode] = reactExports.useState("");
  const [manualInput, setManualInput] = reactExports.useState("");
  const [foundItem, setFoundItem] = reactExports.useState(null);
  const [onlineInfo, setOnlineInfo] = reactExports.useState(null);
  const [lookingUp, setLookingUp] = reactExports.useState(false);
  reactExports.useState([]);
  const [categories, setCategories] = reactExports.useState([]);
  const [departments, setDepartments] = reactExports.useState([]);
  const [showAdd, setShowAdd] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [editMode, setEditMode] = reactExports.useState(false);
  const [editValues, setEditValues] = reactExports.useState({});
  const [recentScans, setRecentScans] = reactExports.useState([]);
  const [activeTab, setActiveTab] = reactExports.useState("scanner");
  const [allItems, setAllItems] = reactExports.useState([]);
  const [itemSearch, setItemSearch] = reactExports.useState("");
  const [addForm, setAddForm] = reactExports.useState({
    name: "",
    barcode: "",
    category_id: "",
    department_id: "",
    unit_of_measure: "piece",
    unit_price: "",
    quantity_in_stock: "1",
    reorder_level: "10",
    item_type: "consumable",
    batch_number: "",
    expiry_date: "",
    description: "",
    location: ""
  });
  const scannerRef = reactExports.useRef(null);
  const scanDivId = "qr-reader";
  reactExports.useEffect(() => {
    if (!document.getElementById("h5q-script")) {
      const s = document.createElement("script");
      s.id = "h5q-script";
      s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      document.head.appendChild(s);
    }
    fetchCategories();
    fetchDepartments();
    fetchHistory();
    fetchAllItems();
    return () => {
      stopScanner();
    };
  }, []);
  const fetchCategories = async () => {
    const { data } = await supabase.from("item_categories").select("*").order("name");
    setCategories(data || []);
  };
  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    setDepartments(data || []);
  };
  const fetchHistory = async () => {
    const { data } = await supabase.from("stock_movements").select("*,items(name,barcode)").order("created_at", { ascending: false }).limit(20);
    setRecentScans(data || []);
  };
  const fetchAllItems = async () => {
    const { data } = await supabase.from("items").select("*,item_categories(name),departments(name)").order("name").limit(200);
    setAllItems(data || []);
  };
  const startScanner = async () => {
    if (!window.Html5Qrcode) {
      toast({ title: "Scanner loading, try again in 1s", variant: "destructive" });
      return;
    }
    setScanning(true);
    try {
      scannerRef.current = new window.Html5Qrcode(scanDivId);
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 120 } },
        (code) => {
          stopScanner();
          handleBarcode(code);
        },
        (_err) => {
        }
      );
    } catch (e) {
      toast({ title: "Camera error", description: e.message, variant: "destructive" });
      setScanning(false);
    }
  };
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };
  const handleBarcode = reactExports.useCallback(async (code) => {
    setBarcode(code);
    setFoundItem(null);
    setOnlineInfo(null);
    setLookingUp(true);
    toast({ title: "Barcode scanned", description: code });
    const { data } = await supabase.from("items").select("*,item_categories(name),departments(name)").eq("barcode", code).maybeSingle();
    if (data) {
      setFoundItem(data);
      setLookingUp(false);
      return;
    }
    const info = await lookupOnline(code);
    setOnlineInfo(info);
    setLookingUp(false);
    if (info) {
      const cat = categories.find((c) => c.name.toLowerCase().includes((info.category || "").toLowerCase().split(" ")[0]));
      setAddForm((p) => ({ ...p, barcode: code, name: info.name, description: info.description || "", category_id: cat?.id || "" }));
      setShowAdd(true);
    } else {
      setAddForm((p) => ({ ...p, barcode: code }));
    }
  }, [categories]);
  const saveItem = async () => {
    if (!addForm.name.trim()) {
      toast({ title: "Enter item name", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error: error2 } = await supabase.from("items").insert({
      name: addForm.name,
      barcode: addForm.barcode || barcode,
      category_id: addForm.category_id || null,
      department_id: addForm.department_id || null,
      unit_of_measure: addForm.unit_of_measure,
      unit_price: Number(addForm.unit_price) || 0,
      quantity_in_stock: Number(addForm.quantity_in_stock) || 0,
      reorder_level: Number(addForm.reorder_level) || 10,
      item_type: addForm.item_type,
      batch_number: addForm.batch_number || null,
      expiry_date: addForm.expiry_date || null,
      description: addForm.description || null,
      location: addForm.location || null,
      added_by: user?.id,
      status: "active"
    });
    if (error2) {
      toast({ title: "Save failed", description: error2.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    toast({ title: "Item saved ✓", description: addForm.name });
    setShowAdd(false);
    setAddForm({ name: "", barcode: "", category_id: "", department_id: "", unit_of_measure: "piece", unit_price: "", quantity_in_stock: "1", reorder_level: "10", item_type: "consumable", batch_number: "", expiry_date: "", description: "", location: "" });
    setOnlineInfo(null);
    setSaving(false);
    await supabase.from("stock_movements").insert({ item_id: null, movement_type: "initial_stock", quantity: Number(addForm.quantity_in_stock) || 0, notes: `Added via scanner: ${addForm.barcode || barcode}`, performed_by: user?.id });
    await supabase.from("audit_log").insert({ user_id: user?.id, action: "item_added_via_scanner", table_name: "items", details: JSON.stringify({ name: addForm.name, barcode: addForm.barcode || barcode }) });
    fetchAllItems();
    fetchHistory();
  };
  const updateStock = async (itemId, delta, type) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = Math.max(0, (item.quantity_in_stock || 0) + delta);
    await supabase.from("items").update({ quantity_in_stock: newQty }).eq("id", itemId);
    await supabase.from("stock_movements").insert({ item_id: itemId, movement_type: type, quantity: Math.abs(delta), notes: `Scanner ${type}: by ${profile?.full_name}`, performed_by: user?.id });
    toast({ title: `Stock ${delta > 0 ? "added" : "deducted"}: ${Math.abs(delta)} unit(s)` });
    fetchAllItems();
    fetchHistory();
  };
  const filteredItems = itemSearch ? allItems.filter((i) => [i.name, i.barcode, i.item_categories?.name || ""].some((v) => String(v || "").toLowerCase().includes(itemSearch.toLowerCase()))) : allItems;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f4f6f9", minHeight: "calc(100vh - 57px)", fontFamily: "'Inter','Segoe UI',sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "linear-gradient(135deg,#0a2558,#1a3a6b)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(26,58,107,0.3)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ScanBarcode, { style: { width: 20, height: 20, color: "#fff" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 15, fontWeight: 800, color: "#fff" }, children: "Inventory Scanner" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "rgba(255,255,255,0.55)" }, children: "Barcode scanning · Real-time lookup · Stock management" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginLeft: "auto", display: "flex", gap: 8 }, children: ["scanner", "history", "inventory"].map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveTab(tab), style: { padding: "5px 14px", background: activeTab === tab ? "rgba(255,255,255,0.2)" : "transparent", border: "1px solid", borderColor: activeTab === tab ? "rgba(255,255,255,0.3)" : "transparent", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "capitalize" }, children: tab }, tab)) })
    ] }),
    activeTab === "scanner" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "16px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 14, maxWidth: 1200, margin: "0 auto" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { style: { width: 14, height: 14, color: "#6b7280" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 700, color: "#111827" }, children: "Camera Scanner" }),
            scanning && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", fontSize: 10, color: "#22c55e", fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }, className: "animate-pulse" }),
              "LIVE"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: scanDivId, style: { width: "100%", minHeight: scanning ? 260 : 0, background: "#000" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8 }, children: !scanning ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: startScanner, style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(26,58,107,0.25)" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { style: { width: 16, height: 16 } }),
              " Start Camera"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: stopScanner, style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 16, height: 16 } }),
              " Stop Scanner"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, position: "relative" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#9ca3af" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    value: manualInput,
                    onChange: (e) => setManualInput(e.target.value),
                    onKeyDown: (e) => e.key === "Enter" && manualInput && handleBarcode(manualInput),
                    placeholder: "Enter barcode or item name manually…",
                    style: { width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none" }
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => manualInput && handleBarcode(manualInput), style: { padding: "8px 16px", background: "#0078d4", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: "Lookup" })
            ] })
          ] })
        ] }),
        (lookingUp || foundItem || onlineInfo || barcode) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
            lookingUp ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13, color: "#6b7280" }, className: "animate-spin" }) : foundItem ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { style: { width: 13, height: 13, color: "#22c55e" } }) : onlineInfo ? /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { style: { width: 13, height: 13, color: "#0078d4" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 13, height: 13, color: "#f59e0b" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 700, color: "#111827" }, children: lookingUp ? "Looking up…" : foundItem ? "Found in Inventory" : onlineInfo ? "Found Online" : "Not Found" }),
            barcode && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: "auto", fontSize: 10, background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, color: "#6b7280", fontWeight: 700, fontFamily: "monospace" }, children: barcode })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "14px 16px" }, children: lookingUp ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: ["Checking local inventory…", "Searching Open Food Facts…", "Searching UPC database…"].map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6b7280" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 10, height: 10 }, className: "animate-spin" }),
            " ",
            s
          ] }, i)) }) : foundItem ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 50, height: 50, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { style: { width: 24, height: 24, color: "#0078d4" } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 15, fontWeight: 800, color: "#111827" }, children: foundItem.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 2 }, children: [
                  foundItem.item_categories?.name && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginRight: 8 }, children: foundItem.item_categories.name }),
                  foundItem.item_type && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }, children: foundItem.item_type })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "right" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 800, color: foundItem.quantity_in_stock <= foundItem.reorder_level ? "#dc2626" : "#15803d" }, children: foundItem.quantity_in_stock || 0 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#9ca3af" }, children: "in stock" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }, children: [["Unit Price", "KES " + (foundItem.unit_price || 0), "#374151"], ["Unit", "" + foundItem.unit_of_measure, "#374151"], ["Reorder At", "" + foundItem.reorder_level, "#374151"]].map(([l, v, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f9fafb", borderRadius: 6, padding: "8px 10px" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }, children: l }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 700, color: c }, children: v })
            ] }, l)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, marginTop: 12 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => updateStock(foundItem.id, 1, "stock_in"), style: { flex: 1, padding: "8px", background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: "+ Add Stock" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => updateStock(foundItem.id, -1, "stock_out"), style: { flex: 1, padding: "8px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: "- Issue Stock" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
                setEditMode(true);
                setEditValues({ ...foundItem });
              }, style: { flex: 1, padding: "8px", background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: "✏ Edit" })
            ] }),
            foundItem.expiry_date && new Date(foundItem.expiry_date) < new Date(Date.now() + 30 * 864e5) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8, padding: "8px 10px", background: "#fef3c7", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 12, height: 12, color: "#f59e0b" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "#92400e", fontWeight: 600 }, children: [
                "Expiring soon: ",
                new Date(foundItem.expiry_date).toLocaleDateString("en-KE")
              ] })
            ] })
          ] }) : onlineInfo ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12 }, children: [
              onlineInfo.imageUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: onlineInfo.imageUrl, alt: "", style: { width: 60, height: 60, objectFit: "contain", borderRadius: 6, border: "1px solid #e5e7eb" }, onError: (e) => e.target.style.display = "none" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 14, fontWeight: 800, color: "#111827" }, children: onlineInfo.name }),
                onlineInfo.brand && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 1 }, children: onlineInfo.brand }),
                onlineInfo.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#9ca3af", marginTop: 2 }, children: onlineInfo.description }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 9, color: "#0078d4", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { style: { width: 9, height: 9 } }),
                  " Source: ",
                  onlineInfo.source
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowAdd(true), style: { width: "100%", marginTop: 12, padding: "9px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 13, height: 13, display: "inline", marginRight: 6 } }),
              "Add to Inventory"
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: "8px 0" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 28, height: 28, color: "#f59e0b", margin: "0 auto 8px" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#374151" }, children: "Item not found anywhere" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", marginBottom: 12 }, children: [
              "Barcode: ",
              barcode
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowAdd(true), style: { padding: "8px 20px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 13, height: 13, display: "inline", marginRight: 6 } }),
              "Add as New Item"
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [{ label: "Total Items", value: allItems.length, color: "#0078d4", icon: Package }, { label: "Low Stock", value: allItems.filter((i) => (i.quantity_in_stock || 0) <= (i.reorder_level || 10)).length, color: "#f59e0b", icon: TriangleAlert }, { label: "Out of Stock", value: allItems.filter((i) => (i.quantity_in_stock || 0) === 0).length, color: "#dc2626", icon: X }, { label: "Categories", value: categories.length, color: "#107c10", icon: Database }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 8, padding: "12px", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }, children: s.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 22, fontWeight: 800, color: s.color }, children: s.value })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { style: { width: 12, height: 12, color: "#6b7280" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 700, color: "#111827" }, children: "Recent Activity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: fetchHistory, style: { marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 11, height: 11 } }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowY: "auto", maxHeight: 300 }, children: recentScans.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 12 }, children: "No recent activity" }) : recentScans.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "9px 14px", borderBottom: "1px solid #f9fafb", display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 6, height: 6, borderRadius: "50%", background: m.movement_type === "stock_in" ? "#22c55e" : m.movement_type === "stock_out" ? "#ef4444" : "#0078d4", flexShrink: 0 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 600, color: "#374151" }, children: m.items?.name || "Item" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 9, color: "#9ca3af" }, children: [
                m.movement_type?.replace(/_/g, " "),
                " · ",
                m.quantity,
                " unit(s)"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#9ca3af" }, children: new Date(m.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) })
          ] }, i)) })
        ] })
      ] })
    ] }),
    activeTab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f9fafb", borderBottom: "2px solid #f3f4f6" }, children: ["Item", "Type", "Qty", "Notes", "Date", "By"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "9px 14px", textAlign: "left", fontWeight: 700, color: "#9ca3af", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }, children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: recentScans.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, style: { padding: "24px", textAlign: "center", color: "#9ca3af" }, children: "No history" }) }) : recentScans.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f9fafb" }, onMouseEnter: (e) => e.currentTarget.style.background = "#f9fafb", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 14px", fontWeight: 600, color: "#374151" }, children: m.items?.name || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 14px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { background: m.movement_type === "stock_in" ? "#dcfce7" : m.movement_type === "stock_out" ? "#fee2e2" : "#dbeafe", color: m.movement_type === "stock_in" ? "#15803d" : m.movement_type === "stock_out" ? "#dc2626" : "#1d4ed8", padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700 }, children: m.movement_type?.replace(/_/g, " ") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 14px", color: "#374151", fontWeight: 600 }, children: m.quantity }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 14px", color: "#6b7280" }, children: m.notes?.slice(0, 40) || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 14px", color: "#9ca3af" }, children: new Date(m.created_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 14px", color: "#6b7280" }, children: m.performed_by_name || "—" })
      ] }, i)) })
    ] }) }) }),
    activeTab === "inventory" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { width: 12, height: 12, color: "#9ca3af" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: itemSearch,
            onChange: (e) => setItemSearch(e.target.value),
            placeholder: "Search inventory…",
            style: { flex: 1, border: "none", outline: "none", fontSize: 12, color: "#374151" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setShowAdd(true);
          setBarcode("");
        }, style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 11, height: 11 } }),
          " Add Item"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: fetchAllItems, style: { background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f9fafb", borderBottom: "2px solid #f3f4f6" }, children: ["Name", "Barcode", "Category", "Department", "Stock", "Unit", "Price", "Status"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#9ca3af", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredItems.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            style: { borderBottom: "1px solid #f9fafb", cursor: "pointer" },
            onClick: () => {
              setBarcode(item.barcode || "");
              setFoundItem(item);
              setActiveTab("scanner");
            },
            onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
            onMouseLeave: (e) => e.currentTarget.style.background = "",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 600, color: "#374151" }, children: item.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontFamily: "monospace", fontSize: 10, color: "#6b7280" }, children: item.barcode || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280" }, children: item.item_categories?.name || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280" }, children: item.departments?.name || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 800, color: (item.quantity_in_stock || 0) <= (item.reorder_level || 10) ? item.quantity_in_stock === 0 ? "#dc2626" : "#f59e0b" : "#15803d" }, children: item.quantity_in_stock || 0 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280" }, children: item.unit_of_measure }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { padding: "9px 12px", color: "#374151" }, children: [
                "KES ",
                Number(item.unit_price || 0).toLocaleString()
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { background: item.status === "active" ? "#dcfce7" : "#f3f4f6", color: item.status === "active" ? "#15803d" : "#6b7280", padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700 }, children: item.status || "active" }) })
            ]
          },
          item.id
        )) })
      ] }) })
    ] }) }),
    showAdd && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, width: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 14, height: 14, color: "#fff" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#fff", flex: 1 }, children: "Add Item to Inventory" }),
        onlineInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 4, color: "#fff" }, children: [
          "Pre-filled from ",
          onlineInfo.source
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowAdd(false), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#fff" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: [
        [
          { label: "Item Name *", key: "name", type: "text", full: true },
          { label: "Barcode", key: "barcode", type: "text", full: true },
          { label: "Description", key: "description", type: "text", full: true },
          { label: "Qty in Stock", key: "quantity_in_stock", type: "number" },
          { label: "Reorder Level", key: "reorder_level", type: "number" },
          { label: "Unit Price (KES)", key: "unit_price", type: "number" },
          { label: "Batch Number", key: "batch_number", type: "text" },
          { label: "Expiry Date", key: "expiry_date", type: "date" },
          { label: "Storage Location", key: "location", type: "text" }
        ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: f.full ? "1 / -1" : "auto" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }, children: f.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: f.type,
              value: addForm[f.key] || "",
              onChange: (e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value })),
              style: { width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }
            }
          )
        ] }, f.key)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }, children: "Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: addForm.category_id,
              onChange: (e) => setAddForm((p) => ({ ...p, category_id: e.target.value })),
              style: { width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select…" }),
                categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.name }, c.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }, children: "Department" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: addForm.department_id,
              onChange: (e) => setAddForm((p) => ({ ...p, department_id: e.target.value })),
              style: { width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select…" }),
                departments.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }, children: "Unit of Measure" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: addForm.unit_of_measure,
              onChange: (e) => setAddForm((p) => ({ ...p, unit_of_measure: e.target.value })),
              style: { width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" },
              children: ["piece", "box", "carton", "litre", "kg", "pack", "vial", "ampoule", "tablet", "capsule"].map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u, children: u }, u))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }, children: "Item Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: addForm.item_type,
              onChange: (e) => setAddForm((p) => ({ ...p, item_type: e.target.value })),
              style: { width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" },
              children: ["consumable", "medical_supply", "equipment", "drug", "stationery", "ppe", "other"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: saveItem, disabled: saving, style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: [
          saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13 }, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
          saving ? "Saving…" : "Save to Inventory"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowAdd(false), style: { padding: "9px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 12 }, children: "Cancel" })
      ] })
    ] }) })
  ] });
}
const DEPTS = [
  "Pharmacy",
  "Maternity",
  "Casualty",
  "Laboratory",
  "X-Ray",
  "Paediatrics",
  "Surgery",
  "Medical",
  "Outpatient",
  "Administration",
  "ICU",
  "Procurement",
  "HR",
  "Finance"
];
const TWILIO_PHONE = "+16812972643";
const WHATSAPP_NO = "+14155238886";
const WHATSAPP_SANDBOX_CODE = "bad-machine";
const WHATSAPP_LINK = `https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine&type=phone_number&app_absent=0`;
const TWILIO_MSG_SID = "MGd547d8e3273fda2d21afdd6856acb245";
const TWILIO_VOICE_WEBHOOK = "https://demo.twilio.com/welcome/voice/";
const CALL_C = { incoming: "#0369a1", outgoing: "#059669", missed: "#dc2626", voicemail: "#9333ea" };
const VISIT_C = { checked_in: "#059669", checked_out: "#6b7280", waiting: "#d97706", denied: "#dc2626" };
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "-";
const BS = (bg) => ({ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" });
const INP = { padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#111", background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" };
function Chip({ label, color }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 9px", borderRadius: 12, background: color + "18", color, fontSize: 11, fontWeight: 700, border: "1px solid " + color + "44", textTransform: "capitalize" }, children: label.replace("_", " ") });
}
function getTabsForRole(role) {
  const allTabs = ["visitors", "calls", "messages", "whatsapp", "notify_all"];
  if (role === "admin" || role === "database_admin") return allTabs;
  if (role === "procurement_manager") return ["visitors", "calls", "messages", "whatsapp", "notify_all"];
  if (role === "procurement_officer") return ["visitors", "messages", "whatsapp"];
  if (role === "accountant") return ["visitors", "messages", "whatsapp"];
  if (role === "inventory_manager") return ["visitors", "messages", "calls"];
  if (role === "warehouse_officer") return ["visitors", "messages", "calls"];
  if (role === "requisitioner") return ["visitors", "messages"];
  return ["visitors", "messages"];
}
function getRoleWelcome(role) {
  const msgs = {
    admin: "Full reception - visitors, calls, SMS, WhatsApp, broadcast notifications",
    database_admin: "Full reception access",
    procurement_manager: "Procurement reception - all messaging and visitor functions",
    procurement_officer: "Procurement desk - visitor tracking and messaging",
    accountant: "Finance reception - visitor log, messages, and WhatsApp",
    inventory_manager: "Inventory desk - visitor log, messages, call tracking",
    warehouse_officer: "Warehouse reception - visitor log, messages, call tracking",
    requisitioner: "Reception - visitor log and messaging"
  };
  return msgs[role] || "Reception module";
}
function NotifyAllTab() {
  const [msg, setMsg] = reactExports.useState("");
  const [channel, setChannel] = reactExports.useState("sms");
  const [loading, setLoading] = reactExports.useState(false);
  const [users, setUsers] = reactExports.useState([]);
  const [selected, setSelected] = reactExports.useState([]);
  const [result, setResult] = reactExports.useState(null);
  const [dept, setDept] = reactExports.useState("All");
  const DEPTS_ALL = ["All", "Procurement", "Finance", "Inventory", "Pharmacy", "Maternity", "Casualty", "Laboratory", "Administration", "ICT", "HR"];
  reactExports.useEffect(() => {
    supabase.from("profiles").select("id,full_name,phone_number,email,department").not("phone_number", "is", null).then(({ data }) => {
      setUsers(data || []);
      setSelected((data || []).map((u) => u.id));
    });
  }, []);
  const filtered = dept === "All" ? users : users.filter((u) => u.department === dept);
  const targets = filtered.filter((u) => selected.includes(u.id));
  async function sendAll() {
    if (!msg.trim()) {
      return;
    }
    setLoading(true);
    setResult(null);
    const phones = targets.map((u) => u.phone_number).filter(Boolean);
    if (!phones.length) {
      setLoading(false);
      return;
    }
    const { data, error: error2 } = await supabase.functions.invoke("send-sms", {
      body: { to: phones, message: msg, channel, department: "broadcast", module: "notify_all" }
    });
    setLoading(false);
    setResult(data || { ok: false, error: error2?.message });
  }
  const s = {
    card: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
    label: { display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5 },
    inp: { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#374151" },
    ta: { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#374151", resize: "vertical", minHeight: 90 },
    btn: (bg) => ({ padding: "10px 20px", background: bg, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" })
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: s.card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Broadcast Message" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: s.label, children: "Channel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8 }, children: ["sms", "whatsapp"].map((ch) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setChannel(ch),
            style: { ...s.btn(channel === ch ? "#0e7490" : "#f1f5f9"), color: channel === ch ? "#fff" : "#374151", flex: 1, fontSize: 12 },
            children: ch === "sms" ? "- SMS" : "- WhatsApp"
          },
          ch
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: s.label, children: "Filter by Department" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: dept, onChange: (e) => setDept(e.target.value), style: { ...s.inp, background: "#fff" }, children: DEPTS_ALL.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: d }, d)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: s.label, children: "Message" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: msg, onChange: (e) => setMsg(e.target.value), placeholder: "Type your broadcast message...", style: s.ta }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af", marginTop: 3 }, children: [
          "[EL5 MediProcure] prefix added automatically - ",
          msg.length,
          "/1560 chars"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: sendAll,
          disabled: loading || !msg.trim() || targets.length === 0,
          style: { ...s.btn(loading || !msg.trim() || targets.length === 0 ? "#9ca3af" : "#0e7490"), width: "100%", justifyContent: "center" },
          children: loading ? `Sending to ${targets.length}-` : `- Send to ${targets.length} user${targets.length !== 1 ? "s" : ""}`
        }
      ),
      result && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 8,
        background: result.ok ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 700, color: result.ok ? "#166534" : "#dc2626" }, children: result.ok ? `- Sent: ${result.sent}/${result.total}` : `- ${result.error || "Send failed"}` }),
        result.failed > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#d97706", marginTop: 4 }, children: [
          "- ",
          result.failed,
          " failed"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: s.card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a" }, children: [
          "- Recipients (",
          targets.length,
          "/",
          filtered.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSelected(filtered.map((u) => u.id)), style: { ...s.btn("#0369a1"), fontSize: 11, padding: "5px 10px" }, children: "All" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSelected([]), style: { ...s.btn("#6b7280"), fontSize: 11, padding: "5px 10px" }, children: "None" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }, children: [
        filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", color: "#9ca3af", padding: 20, fontSize: 12 }, children: "No users with phone numbers" }),
        filtered.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            onClick: () => setSelected((s2) => s2.includes(u.id) ? s2.filter((x) => x !== u.id) : [...s2, u.id]),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              cursor: "pointer",
              background: selected.includes(u.id) ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${selected.includes(u.id) ? "#93c5fd" : "#f1f5f9"}`
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
                width: 14,
                height: 14,
                borderRadius: 3,
                border: `2px solid ${selected.includes(u.id) ? "#0369a1" : "#d1d5db"}`,
                background: selected.includes(u.id) ? "#0369a1" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }, children: selected.includes(u.id) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#fff", fontSize: 9, fontWeight: 900 }, children: "-" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: u.full_name || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#6b7280" }, children: u.phone_number })
              ] }),
              u.department && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 6, fontWeight: 600, flexShrink: 0 }, children: u.department })
            ]
          },
          u.id
        ))
      ] })
    ] })
  ] });
}
function ReceptionPage() {
  const { profile, roles } = useAuth();
  const primaryRole = roles[0] || "requisitioner";
  const hosName = "Embu Level 5 Hospital";
  const availTabs = getTabsForRole(primaryRole);
  const [tab, setTab] = reactExports.useState(availTabs[0]);
  const [visitors, setVisitors] = reactExports.useState([]);
  const [calls, setCalls] = reactExports.useState([]);
  const [messages, setMessages] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [showVF, setShowVF] = reactExports.useState(false);
  const [showCF, setShowCF] = reactExports.useState(false);
  const [showMF, setShowMF] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [rtOn, setRtOn] = reactExports.useState(false);
  const [whatsappMsg, setWhatsappMsg] = reactExports.useState("");
  const [whatsappTo, setWhatsappTo] = reactExports.useState("");
  const [waLoading, setWaLoading] = reactExports.useState(false);
  const EV = { full_name: "", id_number: "", phone: "", organization: "", purpose: "", host_name: "", host_department: "", notes: "" };
  const EC = { caller_name: "", caller_phone: "", purpose: "", department: "", staff_contacted: "", call_status: "incoming", notes: "" };
  const EM = { recipient_name: "", recipient_phone: "", message_body: "", message_type: "sms", department: "" };
  const [vF, setVF] = reactExports.useState({ ...EV });
  const [cF, setCF] = reactExports.useState({ ...EC });
  const [mF, setMF] = reactExports.useState({ ...EM });
  const load = reactExports.useCallback(async () => {
    setLoading(true);
    const [v, c, m] = await Promise.all([
      supabase.from("reception_visitors").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("reception_calls").select("*").order("called_at", { ascending: false }).limit(100),
      supabase.from("reception_messages").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    setVisitors(v.data || []);
    setCalls(c.data || []);
    setMessages(m.data || []);
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    load();
  }, [load]);
  reactExports.useEffect(() => {
    const ch = supabase.channel("rcpt-rt-v58").on("postgres_changes", { event: "*", schema: "public", table: "reception_visitors" }, load).on("postgres_changes", { event: "*", schema: "public", table: "reception_calls" }, load).on("postgres_changes", { event: "*", schema: "public", table: "reception_messages" }, load).subscribe((s) => setRtOn(s === "SUBSCRIBED"));
    return () => supabase.removeChannel(ch);
  }, [load]);
  async function sms(phone, body) {
    const p = phone.startsWith("+") ? phone : phone.replace(/^0/, "+254");
    const { data, error: error2 } = await supabase.functions.invoke("send-sms", { body: { to: p, message: body } });
    return !error2 && (data?.ok ?? true);
  }
  async function sendWhatsApp() {
    if (!whatsappTo.trim() || !whatsappMsg.trim()) {
      toast({ title: "Fill in recipient and message", variant: "destructive" });
      return;
    }
    setWaLoading(true);
    const p = whatsappTo.startsWith("+") ? whatsappTo : whatsappTo.replace(/^0/, "+254");
    const { error: error2 } = await supabase.functions.invoke("send-sms", { body: {
      to: p,
      message: whatsappMsg,
      hospitalName: hosName,
      channel: "whatsapp",
      fromNumber: `whatsapp:${WHATSAPP_NO}`
    } });
    setWaLoading(false);
    if (!error2) {
      toast({ title: "WhatsApp message sent!" });
      setWhatsappMsg("");
      setWhatsappTo("");
    } else {
      toast({ title: "Failed to send WhatsApp", description: error2.message, variant: "destructive" });
    }
  }
  async function checkIn(id) {
    await supabase.from("reception_visitors").update({ status: "checked_in", check_in_time: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    load();
  }
  async function checkOut(id) {
    await supabase.from("reception_visitors").update({ status: "checked_out", check_out_time: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    load();
  }
  async function saveVisitor() {
    if (!vF.full_name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error: error2 } = await supabase.from("reception_visitors").insert({ ...vF, status: "waiting", check_in_time: (/* @__PURE__ */ new Date()).toISOString() });
    if (!error2) {
      setShowVF(false);
      setVF({ ...EV });
      if (vF.phone) await sms(vF.phone, `Welcome to ${hosName}. You are registered to visit ${vF.host_name || "staff"} in ${vF.host_department || "the hospital"}. Please proceed to the reception desk.`);
      toast({ title: "- Visitor registered" });
    } else toast({ title: "Error", description: error2.message, variant: "destructive" });
    setSaving(false);
  }
  async function saveCall() {
    if (!cF.caller_phone.trim()) {
      toast({ title: "Phone required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error: error2 } = await supabase.from("reception_calls").insert({ ...cF, called_at: (/* @__PURE__ */ new Date()).toISOString() });
    if (!error2) {
      setShowCF(false);
      setCF({ ...EC });
      toast({ title: "- Call logged" });
    } else toast({ title: "Error", description: error2.message, variant: "destructive" });
    setSaving(false);
  }
  async function sendMsg() {
    if (!mF.recipient_phone.trim() || !mF.message_body.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = await sms(mF.recipient_phone, mF.message_body);
    if (ok) {
      await supabase.from("reception_messages").insert({ ...mF, status: "sent", sent_at: (/* @__PURE__ */ new Date()).toISOString() });
      setShowMF(false);
      setMF({ ...EM });
      toast({ title: "- SMS sent" });
    } else toast({ title: "SMS failed", variant: "destructive" });
    setSaving(false);
  }
  const filterVisitors = visitors.filter((v) => !search || v.full_name?.toLowerCase().includes(search.toLowerCase()) || v.organization?.toLowerCase().includes(search.toLowerCase()));
  const filterCalls = calls.filter((c) => !search || c.caller_name?.toLowerCase().includes(search.toLowerCase()) || c.caller_phone?.includes(search));
  const filterMsgs = messages.filter((m) => !search || m.recipient_name?.toLowerCase().includes(search.toLowerCase()) || m.recipient_phone?.includes(search));
  const tabLabels = { visitors: "- Visitors", calls: "- Calls", messages: "- SMS/Messages", whatsapp: "- WhatsApp", notify_all: "- Notify All" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1400, margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#0369a1,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }, children: "Reception Desk" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 2 }, children: [
            hosName,
            " - ProcurBosse v5.8 - ",
            getRoleWelcome(primaryRole)
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "4px 10px", borderRadius: 20, background: rtOn ? "#f0fdf4" : "#fef9c3", border: `1px solid ${rtOn ? "#bbf7d0" : "#fde68a"}`, fontSize: 11, fontWeight: 700, color: rtOn ? "#059669" : "#d97706" }, children: rtOn ? "- Live" : "- Connecting..." }),
        primaryRole === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: WHATSAPP_LINK,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { ...BS("#25D366"), textDecoration: "none", fontSize: 11 },
            children: "- Join WhatsApp Sandbox"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: load, style: BS("#64748b"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 } }),
          " Refresh"
        ] }),
        availTabs.includes("visitors") && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowVF(true), style: BS("#0369a1"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 12, height: 12 } }),
          " New Visitor"
        ] }),
        availTabs.includes("calls") && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowCF(true), style: BS("#059669"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { style: { width: 12, height: 12 } }),
          " Log Call"
        ] }),
        availTabs.includes("messages") && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowMF(true), style: BS("#7c3aed"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { style: { width: 12, height: 12 } }),
          " Send SMS"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "linear-gradient(135deg,#0369a1,#0284c7)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 700, color: "#fff" }, children: "- EL5H Messaging Service" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "rgba(255,255,255,0.75)" }, children: [
          "SMS: ",
          TWILIO_PHONE
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "rgba(255,255,255,0.75)" }, children: [
          "WhatsApp: ",
          WHATSAPP_NO
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "rgba(255,255,255,0.75)" }, children: [
          "Service SID: ",
          TWILIO_MSG_SID
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: WHATSAPP_LINK,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { padding: "5px 12px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" },
            children: "- WhatsApp Sandbox -"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: TWILIO_VOICE_WEBHOOK,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { padding: "5px 12px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" },
            children: "- Voice Webhook -"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }, children: [
      { label: "Total Visitors", value: visitors.length, icon: "-", color: "#0369a1" },
      { label: "Currently In", value: visitors.filter((v) => v.status === "checked_in").length, icon: "-", color: "#059669" },
      { label: "Waiting", value: visitors.filter((v) => v.status === "waiting").length, icon: "-", color: "#d97706" },
      { label: "Calls Today", value: calls.filter((c) => new Date(c.called_at).toDateString() === (/* @__PURE__ */ new Date()).toDateString()).length, icon: "-", color: "#7c3aed" },
      { label: "SMS Sent", value: messages.filter((m) => m.status === "sent").length, icon: "-", color: "#0891b2" }
    ].map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #f1f5f9", padding: "14px 16px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", borderLeft: `4px solid ${k.color}` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, marginBottom: 4 }, children: k.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 22, fontWeight: 800, color: "#0f172a" }, children: loading ? "-" : k.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 2 }, children: k.label })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", overflowX: "auto" }, children: availTabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), style: {
      padding: "9px 18px",
      borderRadius: "8px 8px 0 0",
      border: tab === t ? "1.5px solid #0369a1" : "1.5px solid transparent",
      background: tab === t ? "#0369a1" : "transparent",
      color: tab === t ? "#fff" : "#6b7280",
      fontSize: 13,
      fontWeight: tab === t ? 700 : 500,
      cursor: "pointer",
      whiteSpace: "nowrap"
    }, children: tabLabels[t] || t }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", marginBottom: 16, maxWidth: 360 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search-", style: { ...INP, paddingLeft: 32 } })
    ] }),
    tab === "visitors" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      showVF && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f8fafc", borderRadius: 12, padding: 20, marginBottom: 16, border: "1.5px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, color: "#0f172a" }, children: "- Register New Visitor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowVF(false), style: { background: "none", border: "none", cursor: "pointer", color: "#6b7280" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 16, height: 16 } }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }, children: [
          [["Full Name *", "full_name", "text"], ["ID/Passport", "id_number", "text"], ["Phone", "phone", "tel"], ["Organization", "organization", "text"], ["Purpose", "purpose", "text"], ["Host Name", "host_name", "text"]].map(([l, k, t]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t, value: vF[k], onChange: (e) => setVF((f) => ({ ...f, [k]: e.target.value })), style: INP, placeholder: l })
          ] }, k)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: "Department" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: vF.host_department, onChange: (e) => setVF((f) => ({ ...f, host_department: e.target.value })), style: INP, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "- Select -" }),
              DEPTS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d, children: d }, d))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: "Notes" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: vF.notes, onChange: (e) => setVF((f) => ({ ...f, notes: e.target.value })), style: INP, placeholder: "Any additional notes" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowVF(false), style: { padding: "9px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: saveVisitor, disabled: saving, style: BS(saving ? "#9ca3af" : "#0369a1"), children: saving ? "Saving-" : "- Register Visitor" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Name", "ID", "Phone", "Organization", "Purpose", "Host", "Department", "Status", "Check-in", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left", whiteSpace: "nowrap" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 10, style: { textAlign: "center", padding: "32px", color: "#9ca3af" }, children: "Loading-" }) }) : filterVisitors.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 10, style: { textAlign: "center", padding: "32px", color: "#9ca3af" }, children: "No visitors found" }) }) : filterVisitors.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f8fafc" }, children: v.full_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: v.id_number || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: v.phone || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: v.organization || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: v.purpose || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: v.host_name || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: v.host_department || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: v.status || "waiting", color: VISIT_C[v.status] || "#6b7280" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 11, color: "#9ca3af", borderBottom: "1px solid #f8fafc" }, children: fmtDate(v.check_in_time) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
            v.status === "waiting" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => checkIn(v.id), style: { ...BS("#059669"), padding: "4px 10px", fontSize: 11 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { style: { width: 10, height: 10 } }),
              "In"
            ] }),
            v.status === "checked_in" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => checkOut(v.id), style: { ...BS("#6b7280"), padding: "4px 10px", fontSize: 11 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { style: { width: 10, height: 10 } }),
              "Out"
            ] })
          ] }) })
        ] }, v.id)) })
      ] }) }) })
    ] }),
    tab === "calls" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      showCF && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f8fafc", borderRadius: 12, padding: 20, marginBottom: 16, border: "1.5px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14 }, children: "- Log Call" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowCF(false), style: { background: "none", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 16, height: 16 } }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }, children: [
          [["Caller Name", "caller_name", "text"], ["Caller Phone *", "caller_phone", "tel"], ["Purpose", "purpose", "text"], ["Staff Contacted", "staff_contacted", "text"]].map(([l, k, t]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t, value: cF[k], onChange: (e) => setCF((f) => ({ ...f, [k]: e.target.value })), style: INP, placeholder: l })
          ] }, k)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: "Call Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: cF.call_status, onChange: (e) => setCF((f) => ({ ...f, call_status: e.target.value })), style: INP, children: ["incoming", "outgoing", "missed", "voicemail"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s.charAt(0).toUpperCase() + s.slice(1) }, s)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: "Department" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: cF.department, onChange: (e) => setCF((f) => ({ ...f, department: e.target.value })), style: INP, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "- Select -" }),
              DEPTS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d, children: d }, d))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowCF(false), style: { padding: "9px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: saveCall, disabled: saving, style: BS(saving ? "#9ca3af" : "#059669"), children: saving ? "Saving-" : "- Log Call" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Type", "Caller", "Phone", "Purpose", "Department", "Staff", "Time"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, style: { textAlign: "center", padding: "32px", color: "#9ca3af" }, children: "Loading-" }) }) : filterCalls.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: c.call_status || "incoming", color: CALL_C[c.call_status] || "#0369a1" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f8fafc" }, children: c.caller_name || "Unknown" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: c.caller_phone }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: c.purpose || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: c.department || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: c.staff_contacted || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 11, color: "#9ca3af", borderBottom: "1px solid #f8fafc" }, children: fmtDate(c.called_at) })
        ] }, c.id)) })
      ] }) })
    ] }),
    tab === "messages" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      showMF && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f8fafc", borderRadius: 12, padding: 20, marginBottom: 16, border: "1.5px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14 }, children: "- Send SMS Message" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowMF(false), style: { background: "none", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 16, height: 16 } }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
          [["Recipient Name", "recipient_name", "text"], ["Phone *", "recipient_phone", "tel"]].map(([l, k, t]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t, value: mF[k], onChange: (e) => setMF((f) => ({ ...f, [k]: e.target.value })), style: INP, placeholder: l })
          ] }, k)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: "Department" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: mF.department, onChange: (e) => setMF((f) => ({ ...f, department: e.target.value })), style: INP, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "- Select -" }),
              DEPTS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d, children: d }, d))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }, children: "Message *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: mF.message_body, onChange: (e) => setMF((f) => ({ ...f, message_body: e.target.value })), style: { ...INP, height: 80, resize: "vertical" }, placeholder: "Type your SMS message here-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowMF(false), style: { padding: "9px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: sendMsg, disabled: saving, style: BS(saving ? "#9ca3af" : "#7c3aed"), children: saving ? "Sending-" : "- Send SMS" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Recipient", "Phone", "Department", "Message", "Status", "Sent At"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, style: { textAlign: "center", padding: "32px", color: "#9ca3af" }, children: "Loading-" }) }) : filterMsgs.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f8fafc" }, children: m.recipient_name || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: m.recipient_phone }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: m.department || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px solid #f8fafc" }, children: m.message_body }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: m.status || "pending", color: m.status === "sent" ? "#059669" : "#d97706" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 11, color: "#9ca3af", borderBottom: "1px solid #f8fafc" }, children: fmtDate(m.sent_at || m.created_at) })
        ] }, m.id)) })
      ] }) })
    ] }),
    tab === "notify_all" && /* @__PURE__ */ jsxRuntimeExports.jsx(NotifyAllTab, {}),
    tab === "whatsapp" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 4 }, children: "- WhatsApp Business Sandbox" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 20 }, children: "Twilio WhatsApp Sandbox - EL5H Messaging Service" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 8 }, children: "- To activate WhatsApp:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151", lineHeight: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Send ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
                "join ",
                WHATSAPP_SANDBOX_CODE
              ] }),
              " to ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: WHATSAPP_NO }),
              " on WhatsApp"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Or click the button below to open WhatsApp directly" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "You will be connected to the EL5H sandbox" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }, children: [
          { label: "WhatsApp Number", value: WHATSAPP_NO },
          { label: "Join Code", value: `join ${WHATSAPP_SANDBOX_CODE}` },
          { label: "SMS Number", value: TWILIO_PHONE },
          { label: "Messaging SID", value: TWILIO_MSG_SID },
          { label: "Service Name", value: "EL5H" },
          { label: "Voice Webhook", value: "Twilio Demo" }
        ].map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }, children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }, children: row.value })
        ] }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "a",
            {
              href: WHATSAPP_LINK,
              target: "_blank",
              rel: "noopener noreferrer",
              style: { ...BS("#25D366"), textDecoration: "none", flex: 1, justifyContent: "center" },
              children: "- Open WhatsApp -"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "a",
            {
              href: TWILIO_VOICE_WEBHOOK,
              target: "_blank",
              rel: "noopener noreferrer",
              style: { ...BS("#0369a1"), textDecoration: "none", flex: 1, justifyContent: "center" },
              children: "- Voice Webhook -"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 4 }, children: "- Send WhatsApp Message" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 20 }, children: "via Twilio WhatsApp API - EL5H Messaging Service" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }, children: "Recipient Phone (with country code)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "tel", value: whatsappTo, onChange: (e) => setWhatsappTo(e.target.value), style: INP, placeholder: "+254700000000" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }, children: "Message" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: whatsappMsg, onChange: (e) => setWhatsappMsg(e.target.value), style: { ...INP, height: 100, resize: "vertical" }, placeholder: "Type your WhatsApp message-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 4 }, children: [
            whatsappMsg.length,
            "/1600 characters"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff9ed", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e" }, children: [
          "- Recipient must first join the sandbox by sending ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
            "join ",
            WHATSAPP_SANDBOX_CODE
          ] }),
          " to ",
          WHATSAPP_NO
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: sendWhatsApp, disabled: waLoading, style: { ...BS(waLoading ? "#9ca3af" : "#25D366"), width: "100%", justifyContent: "center", fontSize: 14, padding: "12px" }, children: waLoading ? "Sending-" : "- Send WhatsApp Message" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2", background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Message History" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Recipient", "Phone", "Channel", "Message", "Status", "Sent At"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left" }, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            messages.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f8fafc" }, children: m.recipient_name || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f8fafc" }, children: m.recipient_phone }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: m.message_type || "sms", color: m.message_type === "whatsapp" ? "#25D366" : "#7c3aed" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 12, color: "#374151", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px solid #f8fafc" }, children: m.message_body }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: m.status || "pending", color: m.status === "sent" ? "#059669" : "#d97706" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontSize: 11, color: "#9ca3af", borderBottom: "1px solid #f8fafc" }, children: fmtDate(m.sent_at || m.created_at) })
            ] }, m.id)),
            messages.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, style: { textAlign: "center", padding: "32px", color: "#9ca3af", fontSize: 13 }, children: "No messages yet" }) })
          ] })
        ] })
      ] })
    ] })
  ] });
}
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
const DEF = {
  hospitalName: "Embu Level 5 Hospital",
  countyName: "Embu County Government",
  departmentName: "Department of Health",
  sysName: "EL5 MediProcure",
  docFooter: "Embu Level 5 Hospital · Embu County Government · Department of Health",
  currencySymbol: "KES",
  printFont: "Times New Roman",
  printFontSize: "11",
  showLogo: true,
  showStamp: true,
  showWatermark: false,
  logoUrl: "",
  sealUrl: "",
  hospitalAddress: "Embu Town, Embu County, Kenya",
  hospitalPhone: "+254 060 000000",
  hospitalEmail: "info@embu.health.go.ke",
  poBox: "P.O. Box 591-60100, Embu",
  confidential: true
};
function merge(s) {
  return { ...DEF, ...s };
}
function uniqueSerial(prefix, existingRef) {
  if (existingRef && existingRef !== "—" && existingRef !== "") return existingRef;
  const d = /* @__PURE__ */ new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1e3 + Math.random() * 9e3);
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}
function baseCss(s) {
  return `
    <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${s.printFont}', 'Times New Roman', Times, serif;
      font-size: ${s.printFontSize}pt;
      color: #000 !important;
      background: #fff;
      padding: 20px 30px;
    }
    @media print {
      body { padding: 8mm 12mm; }
      @page { size: A4; margin: 8mm 12mm; }
      .no-print { display: none !important; }
    }
    h1,h2,h3,p,td,th,div,span,label,input,textarea { color: #000 !important; }

    /* ── Official Letterhead ── */
    .letterhead {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 10px;
      margin-bottom: 6px;
      position: relative;
    }
    .lh-county  { font-size: 15pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; }
    .lh-dept    { font-size: 12pt; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
    .lh-seal    { margin: 6px auto; display: block; height: 72px; width: auto; }
    .lh-seal-placeholder {
      width: 72px; height: 72px; border: 2px solid #000; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 7.5pt; font-weight: 700; text-align: center; color: #000;
      margin: 6px 0;
    }
    .lh-hospital { font-size: 12pt; font-weight: 700; text-transform: uppercase; color: #1a3a6b !important; margin-top: 4px; }
    .lh-form    { font-size: 14pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; color: #000; }
    .lh-note    { font-size: 9pt; font-style: italic; margin-top: 3px; }
    .lh-contact { font-size: 8.5pt; margin-top: 3px; }
    .doc-ref-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      font-size: 9pt; border: 1px solid #000; padding: 5px 10px; margin-bottom: 8px;
      background: #f9f9f9;
    }

    /* ── Body ── */
    .section-header {
      background: #1a3a6b; color: #fff !important; padding: 4px 10px;
      font-size: 10pt; font-weight: 700; margin: 10px 0 0 0;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .section-header * { color: #fff !important; }
    .field-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .field-table td { padding: 4px 8px; font-size: 9.5pt; border: 1px solid #ccc; vertical-align: top; }
    .field-label { font-weight: 700; width: 160px; background: #f5f5f5; white-space: nowrap; }

    /* ── Items Table ── */
    table.items { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; }
    table.items th {
      background: #1a3a6b; color: #fff !important; text-align: center;
      padding: 5px 6px; font-weight: 700; border: 1px solid #000;
    }
    table.items td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
    table.items tr:nth-child(even) td { background: #f9f9f9; }
    table.items tfoot td { font-weight: 700; background: #e8edf5; border-top: 2px solid #000; }
    .amt-words { font-style: italic; font-size: 9pt; border: 1px solid #000; padding: 5px 10px; margin-top: 4px; }

    /* ── Signatures ── */
    .sig-grid   { display: grid; gap: 16px; margin-top: 20px; }
    .sig-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .sig-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .sig-grid-4 { grid-template-columns: repeat(4, 1fr); }
    .sig-box    { text-align: center; }
    .sig-line   { border-bottom: 1.5px solid #000; margin-bottom: 4px; margin-top: 35px; }
    .sig-lbl    { font-weight: 700; font-size: 8.5pt; text-transform: uppercase; }
    .sig-name   { font-size: 8pt; margin-top: 2px; }
    .sig-date   { font-size: 8pt; margin-top: 2px; }
    .stamp-box  { width: 75px; height: 75px; border: 2px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; margin-top: 6px; }

    /* ── Footer ── */
    .doc-footer {
      margin-top: 18px; border-top: 1.5px solid #000; padding-top: 6px;
      font-size: 8pt; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;
    }
    .watermark {
      position: fixed; top: 40%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg);
      font-size: 64pt; font-weight: 900; opacity: 0.04; pointer-events: none;
      white-space: nowrap; z-index: 0;
    }
    .divider { border: none; border-top: 1px solid #999; margin: 6px 0; }
    </style>
  `;
}
function docHeader(s, formTitle, subtitle) {
  const seal = s.showLogo && s.sealUrl ? `<img src="${s.sealUrl}" alt="Seal" class="lh-seal" onerror="this.style.display='none'"/>` : s.showLogo ? `<div class="lh-seal-placeholder">EMBU<br/>L5H<br/>SEAL</div>` : "";
  const watermark = s.showWatermark ? `<div class="watermark">OFFICIAL</div>` : "";
  return `
    ${watermark}
    <div class="letterhead">
      <div class="lh-county">${s.countyName}</div>
      <div class="lh-dept">${s.departmentName}</div>
      ${seal}
      <div class="lh-hospital">${s.hospitalName}</div>
      <div class="lh-form">${formTitle}</div>
      ${subtitle ? `<div class="lh-form" style="font-size:11pt;">${subtitle}</div>` : ""}
      ${s.confidential ? `<div class="lh-note">Note: Private and Confidential</div>` : ""}
      <div class="lh-contact">${s.poBox} &nbsp;·&nbsp; Tel: ${s.hospitalPhone} &nbsp;·&nbsp; ${s.hospitalEmail}</div>
    </div>
  `;
}
function refBar(left, right) {
  const leftHtml = Object.entries(left).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join("");
  const rightHtml = Object.entries(right).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join("");
  return `<div class="doc-ref-bar"><div>${leftHtml}</div><div style="text-align:right">${rightHtml}</div></div>`;
}
function sectionHeader(text) {
  return `<div class="section-header">${text}</div>`;
}
function fieldTable(rows) {
  const cells = rows.map(([l, v]) => `<tr><td class="field-label">${l}</td><td>${v || "&nbsp;"}</td></tr>`).join("");
  return `<table class="field-table">${cells}</table>`;
}
function docFooter(s) {
  return `
    <div class="doc-footer">
      <span>${s.docFooter}</span>
      <span>Printed: ${(/* @__PURE__ */ new Date()).toLocaleString("en-KE")} &nbsp;·&nbsp; OFFICIAL DOCUMENT &nbsp;·&nbsp; ${s.sysName}</span>
    </div>
  `;
}
function sigGrid(labels, cols = 4, showStamp = false) {
  return `
    <div class="sig-grid sig-grid-${cols}">
      ${labels.map((l, i) => `
        <div class="sig-box">
          ${showStamp && i === labels.length - 1 ? `<div class="stamp-box">OFFICIAL<br/>STAMP</div>` : ""}
          <div class="sig-line"></div>
          <div class="sig-lbl">${l}</div>
          <div class="sig-name">Name: ___________________</div>
          <div class="sig-date">Date: ___________________</div>
        </div>`).join("")}
    </div>
  `;
}
function openPrint(bodyHtml, title, cssHtml) {
  const win = window.open("", "_blank", "width=940,height=780,scrollbars=yes");
  if (!win) {
    alert("Please allow pop-ups to print documents.");
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>${cssHtml}</head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}
function printGRN(grn, cfg) {
  const s = merge(cfg);
  grn = { ...grn, grn_number: uniqueSerial("GRN", grn.grn_number) };
  const items = grn.items || grn.grn_items || [];
  const padded = [...items, ...Array(Math.max(0, 8 - items.length)).fill(null)];
  const rows = padded.map((i, idx) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${i ? i.item_name || i.description || "" : ""}</td>
      <td style="text-align:center">${i ? i.unit_of_measure || "" : ""}</td>
      <td style="text-align:center">${i ? i.quantity_ordered || "" : ""}</td>
      <td style="text-align:center">${i ? i.quantity_received || "" : ""}</td>
      <td style="text-align:center">${i ? i.quantity_accepted || i.quantity_received || "" : ""}</td>
      <td style="text-align:center">${i && i.quantity_ordered && i.quantity_received ? Math.max(0, i.quantity_ordered - i.quantity_received) : ""}</td>
      <td>${i ? i.condition || "Good" : ""}</td>
    </tr>`).join("");
  const body = `
    ${docHeader(s, "Goods Received Note (GRN)", grn.grn_number)}
    ${refBar(
    { "GRN No": grn.grn_number, "Date Received": formatDate(grn.received_date || grn.created_at), "LPO No": grn.po_number || grn.lpo_number || "—" },
    { "Supplier": grn.supplier_name || "—", "Received By": grn.received_by || "—", "Store": grn.store_location || grn.store || "Main Store" }
  )}
    ${sectionHeader("I. Delivery Details")}
    ${fieldTable([
    ["Supplier Name", grn.supplier_name || "—"],
    ["Delivery Note No.", grn.delivery_note_number || grn.waybill_number || "—"],
    ["Invoice No.", grn.invoice_number || "—"],
    ["Received By", grn.received_by || "—"],
    ["Date Received", formatDate(grn.received_date || grn.created_at)]
  ])}
    ${sectionHeader("II. Items Received")}
    <table class="items">
      <thead><tr>
        <th style="width:30px">#</th><th>Description</th><th>Unit</th>
        <th>Ordered</th><th>Received</th><th>Accepted</th><th>Variance</th><th>Condition</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${grn.remarks ? `${sectionHeader("III. Remarks")}<p style="padding:6px;font-size:9.5pt;border:1px solid #ccc;">${grn.remarks}</p>` : ""}
    ${sectionHeader("IV. Certification")}
    ${sigGrid(["Store Keeper", "Quality Inspector", "Procurement Officer", "HOD / Authorizing Officer"], 4, s.showStamp)}
    ${docFooter(s)}
  `;
  openPrint(body, `GRN ${grn.grn_number}`, baseCss(s));
}
const STATUS_CFG = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  received: { bg: "#dcfce7", color: "#15803d", label: "Received" },
  partial: { bg: "#dbeafe", color: "#1d4ed8", label: "Partial" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
  inspecting: { bg: "#e0f2fe", color: "#0369a1", label: "Inspecting" }
};
const EMPTY_ITEM = { item_name: "", description: "", unit_of_measure: "pcs", quantity_ordered: "", quantity_received: "", unit_price: "" };
function GoodsReceivedPage() {
  const { user, profile, roles } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canReceive = roles.includes("admin") || roles.includes("procurement_manager") || roles.includes("warehouse_officer") || roles.includes("inventory_manager");
  const [grns, setGrns] = reactExports.useState([]);
  const [suppliers, setSuppliers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [stFilter, setStFilter] = reactExports.useState("all");
  const [viewGrn, setViewGrn] = reactExports.useState(null);
  const [showForm, setShowForm] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ grn_number: "", po_reference: "", supplier_id: "", supplier_name: "", received_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), delivery_note_number: "", carrier_name: "", remarks: "", status: "received" });
  const [grnItems, setGrnItems] = reactExports.useState([{ ...EMPTY_ITEM }]);
  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from("goods_received").select("*,goods_received_items(*)").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").order("name")
    ]);
    setGrns(g || []);
    setSuppliers(s || []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  reactExports.useEffect(() => {
    const ch = supabase.channel("grn-rt").on("postgres_changes", { event: "*", schema: "public", table: "goods_received" }, () => load()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  const genGrn = () => `GRN/EL5H/${(/* @__PURE__ */ new Date()).getFullYear()}/${String(Math.floor(1e3 + Math.random() * 9e3))}`;
  const printGrn = (g) => {
    printGRN(g, {
      hospitalName: getSetting("hospital_name", "Embu Level 5 Hospital"),
      sysName: getSetting("system_name", "EL5 MediProcure"),
      docFooter: getSetting("doc_footer", "Embu Level 5 Hospital · Embu County Government"),
      currencySymbol: getSetting("currency_symbol", "KES"),
      printFont: getSetting("print_font", "Times New Roman"),
      printFontSize: getSetting("print_font_size", "11"),
      showStamp: getSetting("show_stamp", "true") === "true"
    });
  };
  const updateItem = (idx, field, val) => setGrnItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  const resetForm = () => {
    setForm({ grn_number: "", po_reference: "", supplier_id: "", supplier_name: "", received_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), delivery_note_number: "", carrier_name: "", remarks: "", status: "received" });
    setGrnItems([{ ...EMPTY_ITEM }]);
  };
  const save = async () => {
    if (!form.supplier_name && !form.supplier_id) {
      toast({ title: "Supplier required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const num = form.grn_number || genGrn();
    const supp = suppliers.find((s) => s.id === form.supplier_id);
    const { data, error: error2 } = await supabase.from("goods_received").insert({
      ...form,
      grn_number: num,
      supplier_name: supp?.name || form.supplier_name,
      created_by: user?.id,
      created_by_name: profile?.full_name
    }).select().single();
    if (error2) {
      toast({ title: "Error", description: error2.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const validItems = grnItems.filter((it) => it.item_name.trim());
    if (validItems.length > 0) {
      await supabase.from("goods_received_items").insert(
        validItems.map((it) => ({ grn_id: data.id, item_name: it.item_name, description: it.description, unit_of_measure: it.unit_of_measure, quantity_ordered: Number(it.quantity_ordered || 0), quantity_received: Number(it.quantity_received || 0), unit_price: Number(it.unit_price || 0), total_price: Number(it.quantity_received || 0) * Number(it.unit_price || 0) }))
      );
    }
    logAudit(user?.id, profile?.full_name, "create", "goods_received", data?.id, { grn: num });
    toast({ title: "GRN created ✓", description: num });
    setShowForm(false);
    resetForm();
    setSaving(false);
    load();
  };
  const filtered = grns.filter((g) => {
    if (stFilter !== "all" && g.status !== stFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (g.grn_number || "").toLowerCase().includes(q) || (g.supplier_name || "").toLowerCase().includes(q) || (g.po_reference || "").toLowerCase().includes(q);
    }
    return true;
  });
  const inp = { width: "100%", padding: "7px 10px", border: "1.5px solid #e5e7eb", borderRadius: 7, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const tinp = { padding: "5px 7px", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: 11, outline: "none", boxSizing: "border-box", fontFamily: "inherit", width: "100%" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "16px 20px", fontFamily: "'Segoe UI',system-ui", minHeight: "calc(100vh - 60px)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}" }),
    (() => {
      const fmtK = (n) => n >= 1e6 ? `KES ${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `KES ${(n / 1e3).toFixed(1)}K` : `KES ${n.toFixed(0)}`;
      const totalVal = grns.reduce((s, g) => s + Number(g.total_amount || 0), 0);
      const rcvCount = grns.filter((g) => g.status === "received").length;
      const pendCount = grns.filter((g) => g.status === "pending").length;
      const thisMonth = grns.filter((g) => g.created_at && new Date(g.created_at).getMonth() === (/* @__PURE__ */ new Date()).getMonth()).length;
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }, children: [
        { label: "Total GRN Value", val: fmtK(totalVal), bg: "#c0392b" },
        { label: "Total GRNs", val: grns.length, bg: "#7d6608" },
        { label: "Received", val: rcvCount, bg: "#0e6655" },
        { label: "Pending", val: pendCount, bg: "#6c3483" },
        { label: "This Month", val: thisMonth, bg: "#1a252f" }
      ].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 10, padding: "12px 16px", color: "#fff", textAlign: "center", background: k.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 900, lineHeight: 1 }, children: k.val }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 5, opacity: 0.9, letterSpacing: "0.04em" }, children: k.label })
      ] }, k.label)) });
    })(),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "linear-gradient(90deg,#065f46,#047857)", borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, boxShadow: "0 4px 16px rgba(6,95,70,0.3)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { style: { width: 20, height: 20, color: "#fff" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }, children: "Goods Received Notes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }, children: [
            filtered.length,
            " of ",
            grns.length,
            " records"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: load, disabled: loading, style: { padding: "6px 12px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13, ...loading ? { animation: "spin 1s linear infinite" } : {} } }) }),
        canReceive && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          resetForm();
          setShowForm(true);
        }, style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,255,255,0.92)", color: "#065f46", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 13, height: 13 } }),
          "New GRN"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }, children: [
      [{ id: "all", label: `All (${grns.length})` }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ id: k, label: `${v.label} (${grns.filter((g) => g.status === k).length})` }))].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStFilter(f.id), style: { padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${stFilter === f.id ? "#047857" : "#e5e7eb"}`, background: stFilter === f.id ? "#047857" : "#fff", color: stFilter === f.id ? "#fff" : "#374151", fontSize: 11, fontWeight: 700, cursor: "pointer" }, children: f.label }, f.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", marginLeft: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "#9ca3af" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search GRN, supplier, PO...", style: { padding: "6px 12px 6px 26px", border: "1.5px solid #e5e7eb", borderRadius: 20, fontSize: 12, outline: "none", width: 220 } })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "linear-gradient(90deg,#065f46,#047857)" }, children: ["GRN Number", "PO Reference", "Supplier", "Received Date", "Items", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }, children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, style: { padding: 24, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 16, height: 16, color: "#d1d5db", animation: "spin 1s linear infinite", display: "block", margin: "0 auto" } }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, style: { padding: 40, textAlign: "center", color: "#9ca3af" }, children: "No goods received records yet" }) }) : filtered.map((g, i) => {
        const s = STATUS_CFG[g.status] || { bg: "#f3f4f6", color: "#6b7280", label: g.status };
        const ic = (g.goods_received_items || []).length;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }, onMouseEnter: (e) => e.currentTarget.style.background = "#f0fdf4", onMouseLeave: (e) => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f9fafb", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontWeight: 800, color: "#047857", fontFamily: "monospace", cursor: "pointer" }, onClick: () => setViewGrn(g), children: g.grn_number }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", color: "#374151", cursor: "pointer" }, onClick: () => setViewGrn(g), children: g.po_reference || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", fontWeight: 600, color: "#1f2937", cursor: "pointer" }, onClick: () => setViewGrn(g), children: g.supplier_name || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", color: "#6b7280", cursor: "pointer" }, onClick: () => setViewGrn(g), children: g.received_date ? new Date(g.received_date).toLocaleDateString("en-KE") : g.created_at ? new Date(g.created_at).toLocaleDateString("en-KE") : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", textAlign: "center", color: ic > 0 ? "#065f46" : "#9ca3af", fontWeight: ic > 0 ? 700 : 400 }, children: ic > 0 ? ic : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", cursor: "pointer" }, onClick: () => setViewGrn(g), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }, children: s.label }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setViewGrn(g), title: "View", style: { padding: "4px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { style: { width: 12, height: 12, color: "#15803d" } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => printGrn(g), title: "Print GRN", style: { padding: "4px 8px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { style: { width: 12, height: 12, color: "#0369a1" } }) })
          ] }) })
        ] }, g.id);
      }) })
    ] }) }),
    viewGrn && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", justifyContent: "flex-end" }, onClick: () => setViewGrn(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "min(500px,100%)", background: "#fff", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }, onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", background: "linear-gradient(90deg,#065f46,#047857)", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { style: { width: 14, height: 14, color: "#fff" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 800, color: "#fff", flex: 1 }, children: viewGrn.grn_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => printGrn(viewGrn), style: { display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { style: { width: 11, height: 11 } }),
          "Print GRN"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setViewGrn(null), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 5, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 12, height: 12 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 10 }, children: [
        [["PO Reference", viewGrn.po_reference], ["Supplier", viewGrn.supplier_name], ["Received Date", viewGrn.received_date ? new Date(viewGrn.received_date).toLocaleDateString("en-KE") : "—"], ["Delivery Note", viewGrn.delivery_note_number || "—"], ["Carrier/Driver", viewGrn.carrier_name || "—"], ["Status", viewGrn.status], ["Created By", viewGrn.created_by_name || "—"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f3f4f6" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#9ca3af", fontWeight: 600 }, children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827" }, children: v || "—" })
        ] }, l)),
        viewGrn.remarks && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#374151" }, children: viewGrn.remarks }),
        (viewGrn.goods_received_items || []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }, children: [
            "Received Items (",
            viewGrn.goods_received_items.length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 11 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#065f46" }, children: ["Item", "UOM", "Qty Ord.", "Qty Rcvd", "Unit Price"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "6px 10px", textAlign: "left", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontSize: 9, textTransform: "uppercase" }, children: h }, h)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: viewGrn.goods_received_items.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "7px 10px", fontWeight: 600, color: "#1f2937" }, children: it.item_name || it.description || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "7px 10px", color: "#6b7280" }, children: it.unit_of_measure || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "7px 10px", textAlign: "center", color: "#374151" }, children: it.quantity_ordered || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "7px 10px", textAlign: "center", fontWeight: 700, color: "#047857" }, children: it.quantity_received || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { padding: "7px 10px", textAlign: "right", color: "#374151" }, children: [
                "KES ",
                Number(it.unit_price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })
              ] })
            ] }, i)) })
          ] }) })
        ] })
      ] })
    ] }) }),
    showForm && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 16, width: "min(760px,100%)", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", marginBottom: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 18px", background: "linear-gradient(90deg,#065f46,#047857)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { style: { width: 16, height: 16, color: "#fff", marginRight: 8 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 800, color: "#fff", flex: 1 }, children: "New Goods Received Note" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowForm(false), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 14, height: 14 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 18 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 800, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #d1fae5" }, children: "Header Information" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Supplier" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.supplier_id, onChange: (e) => setForm((p) => ({ ...p, supplier_id: e.target.value, supplier_name: suppliers.find((s) => s.id === e.target.value)?.name || p.supplier_name })), style: inp, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select Supplier —" }),
              suppliers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.name }, s.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Supplier Name (manual)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.supplier_name, onChange: (e) => setForm((p) => ({ ...p, supplier_name: e.target.value })), placeholder: "Or type supplier name...", style: inp })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "PO Reference" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.po_reference, onChange: (e) => setForm((p) => ({ ...p, po_reference: e.target.value })), placeholder: "PO/EL5H/...", style: inp })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Received Date *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: form.received_date, onChange: (e) => setForm((p) => ({ ...p, received_date: e.target.value })), style: inp })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Delivery Note No." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.delivery_note_number, onChange: (e) => setForm((p) => ({ ...p, delivery_note_number: e.target.value })), style: inp })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Carrier / Driver Name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.carrier_name, onChange: (e) => setForm((p) => ({ ...p, carrier_name: e.target.value })), style: inp })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.status, onChange: (e) => setForm((p) => ({ ...p, status: e.target.value })), style: inp, children: Object.entries(STATUS_CFG).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v.label }, k)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Remarks / Received Condition" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.remarks, onChange: (e) => setForm((p) => ({ ...p, remarks: e.target.value })), style: inp })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, fontWeight: 800, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #d1fae5", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Received Items" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setGrnItems((p) => [...p, { ...EMPTY_ITEM }]), style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#065f46", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 11, height: 11 } }),
            "Add Row"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto", marginBottom: 14 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 640 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#065f46" }, children: ["#", "Item Name *", "Description", "UOM", "Qty Ordered", "Qty Received", "Unit Price (KES)", ""].map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "7px 8px", textAlign: "left", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontSize: 9, textTransform: "uppercase", whiteSpace: "nowrap" }, children: h }, i)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: grnItems.map((it, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#f9fafb" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 6px", textAlign: "center", color: "#9ca3af", fontSize: 10, width: 24, fontWeight: 700 }, children: idx + 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: it.item_name, onChange: (e) => updateItem(idx, "item_name", e.target.value), placeholder: "Item name", style: { ...tinp, width: 140 } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: it.description, onChange: (e) => updateItem(idx, "description", e.target.value), placeholder: "Description", style: { ...tinp, width: 130 } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: it.unit_of_measure, onChange: (e) => updateItem(idx, "unit_of_measure", e.target.value), style: { ...tinp, width: 70 }, children: ["pcs", "box", "kg", "litres", "tablets", "vials", "ampoules", "sachets", "rolls", "sets", "strips", "bottles", "cartridges"].map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: u }, u)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 0, value: it.quantity_ordered, onChange: (e) => updateItem(idx, "quantity_ordered", e.target.value), placeholder: "0", style: { ...tinp, width: 65, textAlign: "center" } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 0, value: it.quantity_received, onChange: (e) => updateItem(idx, "quantity_received", e.target.value), placeholder: "0", style: { ...tinp, width: 65, textAlign: "center" } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 4px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 0, step: "0.01", value: it.unit_price, onChange: (e) => updateItem(idx, "unit_price", e.target.value), placeholder: "0.00", style: { ...tinp, width: 90, textAlign: "right" } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 6px", textAlign: "center" }, children: grnItems.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setGrnItems((p) => p.filter((_, i) => i !== idx)), style: { padding: "3px 5px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 5, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 11, height: 11, color: "#dc2626" } }) }) })
          ] }, idx)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tfoot", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#f0fdf4", borderTop: "2px solid #d1fae5" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, style: { padding: "7px 8px", textAlign: "right", fontSize: 11, fontWeight: 800, color: "#065f46" }, children: "TOTALS →" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "7px 8px", textAlign: "center", fontWeight: 800, color: "#065f46" }, children: grnItems.reduce((s, it) => s + Number(it.quantity_ordered || 0), 0) || 0 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "7px 8px", textAlign: "center", fontWeight: 800, color: "#047857" }, children: grnItems.reduce((s, it) => s + Number(it.quantity_received || 0), 0) || 0 }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { padding: "7px 8px", textAlign: "right", fontWeight: 800, color: "#065f46" }, children: [
              "KES ",
              grnItems.reduce((s, it) => s + Number(it.quantity_received || 0) * Number(it.unit_price || 0), 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
          ] }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 18px", borderTop: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowForm(false), style: { padding: "8px 16px", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: "#065f46", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }, children: [
          saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13, animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { style: { width: 13, height: 13 } }),
          saving ? "Saving..." : "Create GRN"
        ] })
      ] })
    ] }) })
  ] });
}
const PREFIX = "el5_page_cache_";
const DEFAULT_TTL = 5 * 60 * 1e3;
const pageCache = {
  /** Store data for a page */
  set(page, data, ttl = DEFAULT_TTL) {
    try {
      const entry = { data, ts: Date.now(), ttl };
      localStorage.setItem(PREFIX + page, JSON.stringify(entry));
    } catch {
    }
  },
  /** Get cached data if still fresh */
  get(page) {
    try {
      const raw = localStorage.getItem(PREFIX + page);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() - entry.ts > entry.ttl) {
        localStorage.removeItem(PREFIX + page);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },
  /** Clear a specific page cache */
  clear(page) {
    try {
      localStorage.removeItem(PREFIX + page);
    } catch {
    }
  },
  /** Clear all page caches */
  clearAll() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
    } catch {
    }
  },
  /** Check if fresh data exists */
  has(page) {
    return this.get(page) !== null;
  }
};
pageCache.clearAll.bind(pageCache);
pageCache.clear.bind(pageCache);
const PRIORITY_CFG = {
  low: { color: "#6b7280", bg: "#6b728015", label: "Low", emoji: "-" },
  normal: { color: "#3b82f6", bg: "#3b82f615", label: "Normal", emoji: "-" },
  high: { color: "#f97316", bg: "#f9731615", label: "High", emoji: "-" },
  critical: { color: "#ef4444", bg: "#ef444415", label: "Critical", emoji: "-" }
};
const CAT_COLORS = {
  system: "#6b7280",
  procurement: "#3b82f6",
  finance: "#22c55e",
  erp: "#8b5cf6",
  budget: "#f97316",
  invoice: "#f59e0b",
  approval: "#ec4899",
  alert: "#ef4444",
  sync: "#06b6d4",
  general: "#94a3b8"
};
const CAT_ICONS = {
  system: "-",
  procurement: "-",
  finance: "-",
  erp: "-",
  budget: "-",
  invoice: "-",
  approval: "-",
  alert: "-",
  sync: "-",
  general: "-"
};
function timeAgo(s) {
  const d = (Date.now() - new Date(s).getTime()) / 1e3;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
}
function NotificationsPage() {
  const [notifs, setNotifs] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [selected, setSelected] = reactExports.useState(/* @__PURE__ */ new Set());
  const [search, setSearch] = reactExports.useState("");
  const [priorityFilter, setPriorityFilter] = reactExports.useState("all");
  const [categoryFilter, setCategoryFilter] = reactExports.useState("all");
  const [readFilter, setReadFilter] = reactExports.useState("all");
  const [sortBy, setSortBy] = reactExports.useState("newest");
  const [page, setPage] = reactExports.useState(0);
  const [localToast, setLocalToast] = reactExports.useState("");
  const PER = 25;
  const showToast = (msg) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(""), 3e3);
  };
  const fetchNotifs = reactExports.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("notifications").select("*").is("dismissed_at", null).order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      const rows = data || [];
      setNotifs(rows);
      pageCache.set("notifications", rows);
    } catch (e) {
      const cached = pageCache.get("notifications");
      if (cached) setNotifs(cached);
      console.error("[Notifications]", e);
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);
  reactExports.useEffect(() => {
    const ch = supabase.channel("notif_page_v58").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotifs).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchNotifs]);
  async function markRead(ids) {
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotifs((p) => p.map((n) => ids.includes(n.id) ? { ...n, is_read: true } : n));
    setSelected(/* @__PURE__ */ new Set());
    showToast(`- ${ids.length} marked as read`);
  }
  async function dismiss(ids) {
    await supabase.from("notifications").update({ dismissed_at: (/* @__PURE__ */ new Date()).toISOString() }).in("id", ids);
    setNotifs((p) => p.filter((n) => !ids.includes(n.id)));
    setSelected(/* @__PURE__ */ new Set());
    showToast(`- ${ids.length} dismissed`);
  }
  async function markAllRead() {
    const unread = notifs.filter((n) => !n.is_read).map((n) => n.id);
    if (!unread.length) {
      showToast("All already read!");
      return;
    }
    await supabase.from("notifications").update({ is_read: true }).in("id", unread);
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
    showToast(`- All ${unread.length} marked as read`);
  }
  async function createTestNotif() {
    const cats = ["system", "procurement", "finance", "erp", "budget", "invoice", "approval"];
    const prios = ["low", "normal", "high", "critical"];
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const prio = prios[Math.floor(Math.random() * prios.length)];
    await supabase.from("notifications").insert({
      title: `Test: ${cat.charAt(0).toUpperCase() + cat.slice(1)} Notification`,
      message: `This is a v5.8 test notification for the ${cat} module. Priority: ${prio}.`,
      category: cat,
      priority: prio,
      is_read: false,
      action_url: "/dashboard",
      action_label: "View Details",
      icon: CAT_ICONS[cat]
    });
    showToast("- Test notification created!");
    fetchNotifs();
  }
  const categories = ["all", ...Array.from(new Set(notifs.map((n) => n.category || "general")))];
  const filtered = notifs.filter((n) => {
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    if (priorityFilter !== "all" && (n.priority || "normal") !== priorityFilter) return false;
    if (categoryFilter !== "all" && (n.category || "general") !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (n.title || n.subject || "").toLowerCase().includes(q) || (n.message || n.body || "").toLowerCase().includes(q) || (n.category || "").toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "priority") {
      const rank = { critical: 4, high: 3, normal: 2, low: 1 };
      return (rank[b.priority || "normal"] || 2) - (rank[a.priority || "normal"] || 2);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const paginated = filtered.slice(page * PER, (page + 1) * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const criticalCount = notifs.filter((n) => n.priority === "critical" && !n.is_read).length;
  const toggleSelect = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAll = () => setSelected(new Set(paginated.map((n) => n.id)));
  const clearSelect = () => setSelected(/* @__PURE__ */ new Set());
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1200, margin: "0 auto" }, children: [
    localToast && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", top: 20, right: 20, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }, children: localToast }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#1e293b,#0f172a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }, children: "Notifications Centre" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: [
            notifs.length,
            " total - ",
            unreadCount,
            " unread",
            criticalCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: 8, color: "#ef4444", fontWeight: 700 }, children: [
              "- ",
              criticalCount,
              " critical"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: createTestNotif, style: { padding: "8px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151", fontWeight: 600 }, children: "+ Test Notification" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: markAllRead, style: { padding: "8px 14px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#059669", fontWeight: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { style: { width: 12, height: 12, display: "inline", marginRight: 4 } }),
          "Mark All Read"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: fetchNotifs, style: { padding: "8px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151", fontWeight: 600 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12, display: "inline", marginRight: 4 } }),
          "Refresh"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }, children: [
      { label: "Total", value: notifs.length, color: "#6b7280", icon: "-" },
      { label: "Unread", value: unreadCount, color: "#3b82f6", icon: "-" },
      { label: "Critical", value: criticalCount, color: "#ef4444", icon: "-" },
      { label: "High", value: notifs.filter((n) => n.priority === "high" && !n.is_read).length, color: "#f97316", icon: "-" },
      { label: "Read", value: notifs.filter((n) => n.is_read).length, color: "#22c55e", icon: "-" }
    ].map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 10, border: "1px solid #f1f5f9", padding: "12px 14px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", borderLeft: `4px solid ${s.color}` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 800, color: "#0f172a" }, children: loading ? "-" : s.value }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 18 }, children: s.icon })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 3 }, children: s.label })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "16px 20px", marginBottom: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", flex: 1, minWidth: 200 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: search,
              onChange: (e) => {
                setSearch(e.target.value);
                setPage(0);
              },
              placeholder: "Search notifications-",
              style: { width: "100%", padding: "8px 12px 8px 32px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: priorityFilter,
            onChange: (e) => {
              setPriorityFilter(e.target.value);
              setPage(0);
            },
            style: { padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All Priorities" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "critical", children: "- Critical" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "high", children: "- High" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "normal", children: "- Normal" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "low", children: "- Low" })
            ]
          }
        ),
        ["all", "unread", "read"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setReadFilter(f);
          setPage(0);
        }, style: {
          padding: "7px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: readFilter === f ? 700 : 500,
          background: readFilter === f ? "#1e293b" : "#f8fafc",
          color: readFilter === f ? "#fff" : "#6b7280",
          border: readFilter === f ? "1.5px solid #1e293b" : "1.5px solid #e2e8f0",
          cursor: "pointer"
        }, children: [
          f.charAt(0).toUpperCase() + f.slice(1),
          f === "unread" && unreadCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: 6, background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }, children: unreadCount }),
          f === "unread" && criticalCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }, children: criticalCount })
        ] }, f)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: sortBy,
            onChange: (e) => setSortBy(e.target.value),
            style: { padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#374151" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "newest", children: "Newest First" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "oldest", children: "Oldest First" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "priority", children: "By Priority" })
            ]
          }
        )
      ] }),
      categories.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }, children: categories.map((cat) => {
        const c = CAT_COLORS[cat] || "#94a3b8";
        return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setCategoryFilter(cat);
          setPage(0);
        }, style: {
          padding: "3px 11px",
          borderRadius: 20,
          fontSize: 11,
          cursor: "pointer",
          background: categoryFilter === cat ? `${c}20` : "transparent",
          color: categoryFilter === cat ? c : "#9ca3af",
          border: `1px solid ${categoryFilter === cat ? c : "#e2e8f0"}`,
          fontWeight: categoryFilter === cat ? 700 : 400
        }, children: cat === "all" ? "All" : `${CAT_ICONS[cat] || "-"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}` }, cat);
      }) })
    ] }),
    selected.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#1e293b", borderRadius: 10, padding: "10px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#fff", fontSize: 13, fontWeight: 600 }, children: [
        selected.size,
        " selected"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => markRead([...selected]), style: { padding: "6px 14px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }, children: "- Mark Read" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => dismiss([...selected]), style: { padding: "6px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }, children: "- Dismiss" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: clearSelect, style: { padding: "6px 14px", background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontSize: 12, cursor: "pointer" }, children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: selectAll, style: { padding: "6px 14px", background: "transparent", color: "#60a5fa", border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 }, children: [
        "Select all ",
        paginated.length
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }, children: [
      loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: "60px 24px", color: "#9ca3af" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 36, marginBottom: 12 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading notifications-" })
      ] }) : paginated.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: "60px 24px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: readFilter === "unread" ? "-" : "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }, children: readFilter === "unread" ? "All caught up!" : "No notifications found" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, color: "#9ca3af" }, children: readFilter === "unread" ? "You've read everything." : "Try adjusting your filters." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: paginated.map((n, idx) => {
        const prio = PRIORITY_CFG[n.priority || "normal"];
        const cat = n.category || "general";
        const icon = n.icon || CAT_ICONS[cat] || "-";
        const catColor = CAT_COLORS[cat] || "#94a3b8";
        const title = n.title || n.subject || "";
        const body = n.message || n.body || "";
        const isSelected = selected.has(n.id);
        const isExpired = n.expires_at && new Date(n.expires_at) < /* @__PURE__ */ new Date();
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              gap: 14,
              padding: "14px 20px",
              borderBottom: idx < paginated.length - 1 ? "1px solid #f8fafc" : "none",
              background: isSelected ? "#eff6ff" : n.is_read ? "#fff" : "#fafcff",
              opacity: isExpired ? 0.5 : 1,
              transition: "background 0.15s",
              cursor: "pointer",
              position: "relative"
            },
            onMouseEnter: (e) => {
              if (!isSelected) e.currentTarget.style.background = "#f8fafc";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = isSelected ? "#eff6ff" : n.is_read ? "#fff" : "#fafcff";
            },
            onClick: () => toggleSelect(n.id),
            children: [
              n.priority === "critical" && !n.is_read && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#ef4444", borderRadius: "4px 0 0 4px" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: { display: "flex", alignItems: "flex-start", paddingTop: 2, flexShrink: 0 },
                  onClick: (e) => {
                    e.stopPropagation();
                    toggleSelect(n.id);
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? "#3b82f6" : "#d1d5db"}`, background: isSelected ? "#3b82f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", cursor: "pointer", flexShrink: 0 }, children: isSelected && /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "1.5 5 4 7.5 8.5 2.5", stroke: "#fff", strokeWidth: "1.5", fill: "none", strokeLinecap: "round" }) }) })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${catColor}18`, border: `1px solid ${catColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, position: "relative" }, children: [
                icon,
                !n.is_read && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: prio.color, border: "2px solid #fff" } })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
                    title && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: n.is_read ? 500 : 700, color: "#0f172a", fontSize: 13, marginBottom: 2 }, children: title }),
                    body && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: n.is_read ? "#9ca3af" : "#374151", fontSize: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }, children: body })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }, children: [
                    !n.is_read && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          markRead([n.id]);
                        },
                        title: "Mark read",
                        style: { padding: "3px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, color: "#059669", fontSize: 11, cursor: "pointer", fontWeight: 700 },
                        children: "-"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          dismiss([n.id]);
                        },
                        title: "Dismiss",
                        style: { padding: "3px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#ef4444", fontSize: 11, cursor: "pointer", fontWeight: 700 },
                        children: "-"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { padding: "1px 8px", borderRadius: 10, fontSize: 10, background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}33`, fontWeight: 700 }, children: [
                    CAT_ICONS[cat],
                    " ",
                    cat.toUpperCase()
                  ] }),
                  n.priority && n.priority !== "normal" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { padding: "1px 8px", borderRadius: 10, fontSize: 10, background: prio.bg, color: prio.color, border: `1px solid ${prio.color}33`, fontWeight: 700 }, children: [
                    prio.emoji,
                    " ",
                    prio.label.toUpperCase()
                  ] }),
                  n.module && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "1px 8px", borderRadius: 10, fontSize: 10, background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }, children: n.module }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#cbd5e1", fontSize: 11, marginLeft: "auto" }, children: timeAgo(n.created_at) })
                ] }),
                n.action_url && n.action_label && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "a",
                  {
                    href: n.action_url,
                    onClick: (e) => {
                      e.stopPropagation();
                      markRead([n.id]);
                    },
                    style: { display: "inline-block", marginTop: 8, padding: "4px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, color: "#3b82f6", fontSize: 11, textDecoration: "none", fontWeight: 600 },
                    children: [
                      n.action_label,
                      " -"
                    ]
                  }
                )
              ] })
            ]
          },
          n.id
        );
      }) }),
      totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 12, color: "#9ca3af" }, children: [
          page * PER + 1,
          "-",
          Math.min((page + 1) * PER, filtered.length),
          " of ",
          filtered.length
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setPage((p) => Math.max(0, p - 1)),
              disabled: page === 0,
              style: { padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: page === 0 ? "#f8fafc" : "#fff", fontSize: 12, cursor: page === 0 ? "default" : "pointer", color: "#374151" },
              children: "- Prev"
            }
          ),
          Array.from({ length: Math.min(totalPages, 5) }, (_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setPage(i), style: { padding: "5px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: page === i ? "#1e293b" : "#fff", color: page === i ? "#fff" : "#374151", fontSize: 12, cursor: "pointer", fontWeight: page === i ? 700 : 400 }, children: i + 1 }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
              disabled: page >= totalPages - 1,
              style: { padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: page >= totalPages - 1 ? "#f8fafc" : "#fff", fontSize: 12, cursor: page >= totalPages - 1 ? "default" : "pointer", color: "#374151" },
              children: "Next -"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", marginTop: 16, fontSize: 11, color: "#cbd5e1" }, children: "EL5 MediProcure v5.8 - ProcurBosse - Embu Level 5 Hospital - Notifications realtime-synced via Supabase" })
  ] });
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 6e4 } }
});
function KioskLogin() {
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [showPass, setShowPass] = reactExports.useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
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
  const s = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #022c22 0%, #064e3b 50%, #022c22 100%)",
      fontFamily: "'Inter', sans-serif",
      padding: 24
    },
    card: {
      width: "100%",
      maxWidth: 480,
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(20px)",
      border: "2px solid rgba(16,185,129,0.25)",
      borderRadius: 20,
      padding: 40,
      boxShadow: "0 30px 60px rgba(0,0,0,0.5)"
    },
    icon: {
      width: 72,
      height: 72,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #059669, #10b981)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 20px",
      boxShadow: "0 0 40px rgba(16,185,129,0.4)"
    },
    title: { color: "#d1fae5", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 6 },
    sub: { color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 32 },
    label: { color: "#a7f3d0", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 10 },
    input: {
      width: "100%",
      padding: "14px 18px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.07)",
      border: "1.5px solid rgba(16,185,129,0.2)",
      color: "#d1fae5",
      fontSize: 16,
      outline: "none",
      marginBottom: 20
    },
    btn: {
      width: "100%",
      padding: "16px 0",
      background: loading ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #059669, #10b981)",
      border: "none",
      borderRadius: 12,
      color: "white",
      fontSize: 17,
      fontWeight: 700,
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow: "0 4px 20px rgba(16,185,129,0.35)"
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: s.page, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: s.card, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: s.icon, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MonitorSmartphone, { size: 34, color: "white" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: s.title, children: "Kiosk Station" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: s.sub, children: "EL5 MediProcure · Embu Level 5 Hospital" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: s.label, children: "Staff Email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          style: s.input,
          type: "email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          placeholder: "staff@embu.go.ke"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: s.label, children: "Password" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", marginBottom: 24 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            style: { ...s.input, paddingRight: 48, marginBottom: 0 },
            type: showPass ? "text" : "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: "••••••••"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowPass(!showPass),
            style: { position: "absolute", right: 14, top: 14, background: "none", border: "none", cursor: "pointer", color: "#34d399" },
            children: showPass ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { size: 20 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 20 })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", style: s.btn, disabled: loading, children: loading ? "Signing in..." : "🔓 Enter Kiosk" })
    ] })
  ] }) });
}
function KioskShell({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const nav = [
    { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Scan, { size: 22 }), label: "Scanner", path: "/scanner" },
    { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 22 }), label: "Reception", path: "/reception" },
    { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { size: 22 }), label: "GRN", path: "/goods-received" },
    { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { size: 22 }), label: "Alerts", path: "/notifications" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { minHeight: "100vh", background: "#022c22", fontFamily: "'Inter', sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      background: "rgba(6,78,59,0.9)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(16,185,129,0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 24px",
      position: "sticky",
      top: 0,
      zIndex: 100
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "linear-gradient(135deg, #059669, #10b981)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MonitorSmartphone, { size: 20, color: "white" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#d1fae5", fontWeight: 700, fontSize: 15 }, children: "ProcurBosse Kiosk" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: user?.email })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => signOut().then(() => navigate("/login")),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { size: 16 }),
            " Sign Out"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(2,44,34,0.95)",
      backdropFilter: "blur(10px)",
      borderTop: "1px solid rgba(16,185,129,0.2)",
      display: "flex",
      zIndex: 100
    }, children: nav.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => navigate(n.path),
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 0",
          background: "none",
          border: "none",
          color: window.location.pathname === n.path ? "#10b981" : "#6b7280",
          cursor: "pointer",
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          transition: "color 0.2s"
        },
        children: [
          n.icon,
          n.label
        ]
      },
      n.path
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { paddingBottom: 80 }, children })
  ] });
}
function KioskRoute({ children }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  reactExports.useEffect(() => {
    if (!loading && !session) navigate("/login");
  }, [session, loading, navigate]);
  if (loading) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(KioskShell, { children });
}
function KioskApp() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TooltipProvider, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AuthProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/login", element: /* @__PURE__ */ jsxRuntimeExports.jsx(KioskLogin, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/scanner", replace: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/scanner", element: /* @__PURE__ */ jsxRuntimeExports.jsx(KioskRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScannerPage, {}) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/reception", element: /* @__PURE__ */ jsxRuntimeExports.jsx(KioskRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceptionPage, {}) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/goods-received", element: /* @__PURE__ */ jsxRuntimeExports.jsx(KioskRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(GoodsReceivedPage, {}) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/notifications", element: /* @__PURE__ */ jsxRuntimeExports.jsx(KioskRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(NotificationsPage, {}) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "*", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/scanner", replace: true }) })
    ] }) }) })
  ] }) });
}
const loader = document.getElementById("app-loader");
if (loader) {
  setTimeout(() => {
    loader.style.transition = "opacity 0.4s";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }, 300);
}
createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsxRuntimeExports.jsx(KioskApp, {}));
