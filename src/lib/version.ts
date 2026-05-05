/**
 * ProcurBosse Version Registry
 * Complete release history for EL5 MediProcure
 * Embu Level 5 Hospital | Embu County Government | Kenya
 */

export interface Release {
  version: string;
  date: string;
  codename: string;
  status: "stable"|"lts"|"beta"|"deprecated";
  highlights: string[];
  modules: string[];
  dbMigrations: number;
  engines: string[];
  pagesAdded: number;
  bugsFixed: number;
}

export const RELEASES: Release[] = [
  {
    version: "1.0.0", date:"2025-04-01", codename:"Genesis",
    status:"deprecated", highlights:["Initial procurement module","Basic requisition workflow","Supplier registry"],
    modules:["Requisitions","Suppliers","Dashboard"],
    dbMigrations:1, engines:[], pagesAdded:8, bugsFixed:0,
  },
  {
    version: "2.0.0", date:"2025-06-01", codename:"ProcurCore",
    status:"deprecated", highlights:["Purchase Order module","GRN workflow","Item inventory"],
    modules:["Purchase Orders","GRN","Items","Categories"],
    dbMigrations:3, engines:[], pagesAdded:6, bugsFixed:12,
  },
  {
    version: "3.0.0", date:"2025-08-01", codename:"TenderFirst",
    status:"deprecated", highlights:["Tender management","Bid evaluations","Contract management"],
    modules:["Tenders","Bid Evaluations","Contracts"],
    dbMigrations:4, engines:[], pagesAdded:5, bugsFixed:8,
  },
  {
    version: "4.0.0", date:"2025-10-01", codename:"FinanceCore",
    status:"deprecated", highlights:["Payment vouchers","Receipt vouchers","Journal entries","Budgets"],
    modules:["Payment Vouchers","Receipt Vouchers","Journal Vouchers","Budgets"],
    dbMigrations:6, engines:[], pagesAdded:8, bugsFixed:15,
  },
  {
    version: "5.0.0", date:"2025-12-01", codename:"MultiSite",
    status:"deprecated", highlights:["Multi-facility support","8 Embu County facilities","Facility switching","Role-based access"],
    modules:["Facilities","User Roles","Audit Log"],
    dbMigrations:5, engines:[], pagesAdded:4, bugsFixed:20,
  },
  {
    version: "5.9.0", date:"2026-01-15", codename:"D365Pro",
    status:"deprecated", highlights:["D365-style navigation","Dark/light themes","GUI Editor","SMS/Twilio","ODBC"],
    modules:["GUI Editor","SMS","Telephony","ODBC","Reception"],
    dbMigrations:8, engines:["TwilioEngine"], pagesAdded:10, bugsFixed:35,
  },
  {
    version: "6.0.0", date:"2026-02-01", codename:"D365Power",
    status:"deprecated", highlights:["Power BI reports","D365 module tiles","Chart of Accounts","Fixed Assets","Quality module"],
    modules:["Financial Dashboard","Chart of Accounts","Fixed Assets","Quality","Non-Conformance"],
    dbMigrations:6, engines:["AnalyticsEngine"], pagesAdded:8, bugsFixed:22,
  },
  {
    version: "7.0.0", date:"2026-02-15", codename:"LiveData",
    status:"deprecated", highlights:["Live database engine","Realtime sync","WhatsApp notifications","Accountant workspace"],
    modules:["Accountant Workspace","Purchase Vouchers","Sales Vouchers","Print Engine"],
    dbMigrations:8, engines:["LiveDatabaseEngine","WhatsAppEngine"], pagesAdded:6, bugsFixed:18,
  },
  {
    version: "8.0.0", date:"2026-03-01", codename:"NuclearBase",
    status:"deprecated", highlights:["Nuclear schema rebuild","All tables RLS","Realtime all tables","IP restriction","Session engine"],
    modules:["IP Access","Admin Panel","Admin Database","Webmaster"],
    dbMigrations:12, engines:["AuditEngine","CascadeCacheEngine","WorkflowOptimizer"], pagesAdded:4, bugsFixed:45,
  },
  {
    version: "9.0.0", date:"2026-04-22", codename:"SchemaFix",
    status:"deprecated", highlights:["tenders.currency fix","PageCache engine","ErrorBoundary all pages","Font CSS variables","SPA 404 fix"],
    modules:["All existing modules"],
    dbMigrations:3, engines:["pageCache"], pagesAdded:0, bugsFixed:38,
  },
  {
    version: "9.1.0", date:"2026-04-24", codename:"FullCache",
    status:"deprecated", highlights:["try/catch all 54 pages","pageCache fallback all pages","brace-verified codebase"],
    modules:["All existing modules"],
    dbMigrations:0, engines:[], pagesAdded:0, bugsFixed:54,
  },
  {
    version: "9.2.0", date:"2026-04-25", codename:"HeavyTest",
    status:"deprecated", highlights:["271 static tests","10 runtime simulations","printPO alias","sessionEngine.restore()"],
    modules:["All existing modules"],
    dbMigrations:0, engines:[], pagesAdded:0, bugsFixed:6,
  },
  {
    version: "9.3.0", date:"2026-04-26", codename:"Deploy",
    status:"deprecated", highlights:["vite build 2601 modules","web/ bundle deployed","CSS variable all elements"],
    modules:["All existing modules"],
    dbMigrations:0, engines:[], pagesAdded:0, bugsFixed:3,
  },
  {
    version: "9.4.0", date:"2026-04-26", codename:"EdgeOneFix",
    status:"deprecated", highlights:["404 permanent fix","edgeone.json bare catch-all","404.html JS redirect","GUI Editor real IP","Print settings"],
    modules:["GUI Editor"],
    dbMigrations:0, engines:["useRealIP"], pagesAdded:0, bugsFixed:5,
  },
  {
    version: "9.5.0", date:"2026-04-27", codename:"ERPEngines",
    status:"lts", highlights:[
      "6 new ERP engines: Notification, Sync, Validation, Print, Workflow, Form",
      "Multi-layer cache: Memory→IndexedDB→localStorage",
      "Offline mutation queue with background sync",
      "SPARouteRestorer with useNavigate (proper React Router)",
      "Auto-number triggers: RQN/LPO/GRN/TDR/PV/RV/JV/PUV/SV/BDG/FA/NC",
      "Audit triggers on 15 tables",
      "GRN inventory update trigger",
      "Low stock alert trigger",
      "Workflow notification trigger",
      "Seeds: 35 COA accounts, 19 departments, 15 item categories",
      "Form line items: requisition_items, purchase_order_items, goods_received_items",
      "Document attachments & comments (universal)",
    ],
    modules:["All 54 pages","Engines","Cache Layer"],
    dbMigrations:3, engines:["NotificationEngine","SyncEngine","ValidationEngine","PrintEngine","WorkflowEngine","ERPEngine","FormEngine","ERPCache","OfflineEngine"],
    pagesAdded:0, bugsFixed:13,
  },
  {
    version: "9.6.0", date:"2026-04-28", codename:"FullRelease",
    status:"stable", highlights:[
      "All pages wired to ValidationEngine + WorkflowEngine",
      "PrintEngine imported in all print-capable pages",
      "Comprehensive release registry and CHANGELOG",
      "Version engine for in-app release tracking",
      "Full rebuild: 2614+ modules verified",
      "Zero TypeScript errors across entire codebase",
    ],
    modules:["All 54 pages","Full Engine Suite"],
    dbMigrations:0, engines:["All engines"], pagesAdded:0, bugsFixed:13,
  },
  {
    version: "3.2.0", date:"2026-05-02", codename:"V3Restore",
    status:"lts", highlights:[
      "Restored all v3.1 src/ modules (63 files)",
      "Wired 14 previously missing pages to routes",
      "Communications & Accountant nav groups in sidebar",
      "Supabase fallback keys — no blank screen on EdgeOne",
      "NotificationsPage, SMSPage, TelephonyPage, ReceptionPage activated",
      "GuiEditorPage, FacilitiesPage, IpAccessPage, PrintEnginePage activated",
      "AccountantWorkspacePage, ChangelogPage, DocumentEditorPage activated",
    ],
    modules:["All v3.1 Modules","Communications","Accountant Workspace"],
    dbMigrations:1, engines:[], pagesAdded:14, bugsFixed:3,
  },
  {
    version: "5.8.3", date:"2026-05-02", codename:"StableRelease",
    status:"stable", highlights:[
      "Zero TypeScript errors — full clean build",
      "AdminPanelPage: duplicate borderBottom style key removed",
      "DashboardPage: priority-based primaryRole from AuthContext",
      "All 9 roles now have QUICK action maps on Dashboard",
      "AuthContext: parallel profile+roles fetch + 6s safety timeout",
      "RoleGuard: adminBypass + all 9 roles + AccessDenied page",
      "LoginPage: sample accounts panel — click-to-autofill for all roles",
      "54 routes verified in CI/CD route coverage test",
      "Release packages: procurbosse-v5.8.3 + procurbosse-v3.2.0",
      "CI/CD: TS check → JS scan → build → route test → EXE → GitHub Release",
      "DB migration: user_roles RLS + assign_role_by_email() function",
    ],
    modules:["All 54 Pages","All 9 Roles","Procurement","Finance","Vouchers","Quality","Inventory","Communications","Administration","Accountant Workspace"],
    dbMigrations:2, engines:["AuthEngine","RoleEngine","ReleaseEngine"], pagesAdded:0, bugsFixed:8,
  },
  {
    version: "6.0.0", date:"2026-05-05", codename:"ProElite",
    status:"stable", highlights:[
      "NEW: ERP Command Wheel v4 — 12 outer segments + 8 inner spokes, all modules",
      "NEW: Dashboard v4 Pro — live stats, activity feed, inline ERP wheel toggle",
      "NEW: Print button on dashboard (window.print with print-safe CSS)",
      "NEW: Offline DB status panel with ODBC Setup + Backup quick links",
      "NEW: All 9 roles fully activated with QUICK action maps per role",
      "NEW: database_admin role: Database, Backup, ODBC, DB Test, Audit Log access",
      "NEW: accountant role: full voucher + finance workspace access",
      "NEW: reception role: Reception Desk, Notifications, Email, Documents",
      "NEW: Role chip panel on dashboard (admin only) — see all roles at a glance",
      "NEW: Grid/List view toggle for quick actions",
      "NEW: Refresh button with live stats re-fetch from Supabase",
      "NEW: Spin animation on ERP Hub click — smooth 700ms rotate",
      "NEW: Role-locked inner nodes on ERP Wheel show 🔒 for restricted access",
      "NEW: 12-segment outer ring with emoji icons (Print Engine, Backup, Finance…)",
      "IMPROVED: ROLE_LABELS now includes all 9 roles in sidebar user display",
      "IMPROVED: Admin module in sidebar — database_admin gets DB, Backup, ODBC, DB Test",
      "IMPROVED: Version bumped to 6.0.0 in package.json",
      "IMPROVED: Version badge in ERP wheel header: Pro v4.0",
    ],
    modules:["All 54 Pages","All 9 Roles","ERP Wheel v4","Dashboard v4 Pro","Print Engine","Offline DB","Activity Feed"],
    dbMigrations:0, engines:["ERPWheelEngine","DashboardEngine","PrintEngine","OfflineDBEngine"], pagesAdded:0, bugsFixed:2,
  },
];

export const CURRENT_VERSION = "6.0.0";
export const CURRENT_RELEASE = RELEASES.find(r => r.version === CURRENT_VERSION)!;

export function getReleaseByVersion(v: string): Release|undefined {
  return RELEASES.find(r => r.version === v);
}

export function getStableReleases(): Release[] {
  return RELEASES.filter(r => r.status === "stable" || r.status === "lts");
}

export function getTotalStats() {
  return {
    totalReleases:   RELEASES.length,
    totalMigrations: RELEASES.reduce((s,r) => s+r.dbMigrations, 0),
    totalBugsFixed:  RELEASES.reduce((s,r) => s+r.bugsFixed, 0),
    totalPages:      RELEASES.reduce((s,r) => s+r.pagesAdded, 0) + 42,
    allEngines:      [...new Set(RELEASES.flatMap(r => r.engines))],
  };
}
