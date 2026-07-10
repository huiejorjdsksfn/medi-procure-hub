/**
 * ProcurBosse v12.0.0 — App Router
 * EL5 MediProcure · Embu Level 5 Hospital
 * Upgrade: All 63 pages converted to React.lazy — zero-blocking initial load
 */
import { Toaster }                          from "@/components/ui/toaster";
import { lazy, Suspense }        from "react";
import { Toaster as Sonner }               from "@/components/ui/sonner";
import { TooltipProvider }                 from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }                    from "@/contexts/AuthContext";
import { FacilityProvider }               from "@/contexts/FacilityContext";
import ProtectedRoute                     from "@/components/ProtectedRoute";
import ErrorBoundary                      from "@/components/ErrorBoundary";
import AppLayout                          from "@/components/AppLayout";
import RoleGuard                          from "@/components/RoleGuard";
import RouterGuard                        from "@/components/RouterGuard";
import NetworkGuard                       from "@/components/NetworkGuard";
import ResponsiveBot                      from "@/components/ResponsiveBot";
import SessionBot                         from "@/components/SessionBot";
import KeepAliveBot                       from "@/components/KeepAliveBot";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Auth (eagerly pre-warmed so login feels instant)
const LoginPage              = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage      = lazy(() => import("@/pages/ResetPasswordPage"));
const PublicFormPage         = lazy(() => import("@/pages/PublicFormPage"));

// Core
const DashboardPage          = lazy(() => import("@/pages/DashboardPage"));
const NotFound               = lazy(() => import("@/pages/NotFound"));
const NotificationsPage      = lazy(() => import("@/pages/NotificationsPage"));
const ProfilePage            = lazy(() => import("@/pages/ProfilePage"));
const ReleasesPage           = lazy(() => import("@/pages/ReleasesPage"));
const AboutPage              = lazy(() => import("@/pages/AboutPage"));

// Procurement
const RequisitionsPage       = lazy(() => import("@/pages/RequisitionsPage"));
const PurchaseOrdersPage     = lazy(() => import("@/pages/PurchaseOrdersPage"));
const GoodsReceivedPage      = lazy(() => import("@/pages/GoodsReceivedPage"));
const SuppliersPage          = lazy(() => import("@/pages/SuppliersPage"));
const TendersPage            = lazy(() => import("@/pages/TendersPage"));
const BidEvaluationsPage     = lazy(() => import("@/pages/BidEvaluationsPage"));
const ContractsPage          = lazy(() => import("@/pages/ContractsPage"));
const ProcurementPlanningPage = lazy(() => import("@/pages/ProcurementPlanningPage"));
const TrackingApprovalPage   = lazy(() => import("@/pages/TrackingApprovalPage"));
const StampsPage             = lazy(() => import("@/pages/StampsPage"));
const StampDesignPage        = lazy(() => import("@/pages/StampDesignPage"));

// Inventory
const ItemsPage              = lazy(() => import("@/pages/ItemsPage"));
const CategoriesPage         = lazy(() => import("@/pages/CategoriesPage"));
const DepartmentsPage        = lazy(() => import("@/pages/DepartmentsPage"));
const ScannerPage            = lazy(() => import("@/pages/ScannerPage"));

// Vouchers
const PaymentVouchersPage    = lazy(() => import("@/pages/vouchers/PaymentVouchersPage"));
const ReceiptVouchersPage    = lazy(() => import("@/pages/vouchers/ReceiptVouchersPage"));
const JournalVouchersPage    = lazy(() => import("@/pages/vouchers/JournalVouchersPage"));
const PurchaseVouchersPage   = lazy(() => import("@/pages/vouchers/PurchaseVouchersPage"));
const SalesVouchersPage      = lazy(() => import("@/pages/vouchers/SalesVouchersPage"));

// Financials
const FinancialDashboardPage = lazy(() => import("@/pages/financials/FinancialDashboardPage"));
const ChartOfAccountsPage    = lazy(() => import("@/pages/financials/ChartOfAccountsPage"));
const BudgetsPage            = lazy(() => import("@/pages/financials/BudgetsPage"));
const FixedAssetsPage        = lazy(() => import("@/pages/financials/FixedAssetsPage"));
const AccountantWorkspacePage = lazy(() => import("@/pages/AccountantWorkspacePage"));
const FinanceWorkspacePage   = lazy(() => import("@/pages/FinanceWorkspacePage"));
const FinanceDashboardPage   = lazy(() => import("@/pages/FinanceDashboardPage"));

// Quality
const QualityDashboardPage   = lazy(() => import("@/pages/quality/QualityDashboardPage"));
const InspectionsPage        = lazy(() => import("@/pages/quality/InspectionsPage"));
const NonConformancePage     = lazy(() => import("@/pages/quality/NonConformancePage"));

// Reports & Documents
const ReportsPage            = lazy(() => import("@/pages/ReportsPage"));
const SystemReportPage       = lazy(() => import("@/pages/SystemReportPage"));
const PrintEnginePage        = lazy(() => import("@/pages/PrintEnginePage"));
const DocumentsPage          = lazy(() => import("@/pages/DocumentsPage"));
const DocumentEditorPage     = lazy(() => import("@/pages/DocumentEditorPage"));

// Communications
const InboxPage              = lazy(() => import("@/pages/InboxPage"));
const EmailPage              = lazy(() => import("@/pages/EmailPage"));
const ReceptionPage          = lazy(() => import("@/pages/ReceptionPage"));
const TelephonyPage          = lazy(() => import("@/pages/TelephonyPage"));
const SMSPage                = lazy(() => import("@/pages/SMSPage"));
const WhatsAppPage           = lazy(() => import("@/pages/WhatsAppPage"));
const CommunicationsHubPage  = lazy(() => import("@/pages/CommunicationsHubPage"));
const AIAgentPage            = lazy(() => import("@/pages/AIAgentPage"));

// Admin
const UsersPage              = lazy(() => import("@/pages/UsersPage"));
const SettingsPage           = lazy(() => import("@/pages/SettingsPage"));
const AuditLogPage           = lazy(() => import("@/pages/AuditLogPage"));
const AdminDatabasePage      = lazy(() => import("@/pages/AdminDatabasePage"));
const SupabaseControlsPage   = lazy(() => import("@/pages/SupabaseControlsPage"));
const AdminPanelPage         = lazy(() => import("@/pages/AdminPanelPage"));
const WebmasterPage          = lazy(() => import("@/pages/WebmasterPage"));
const GuiEditorPage          = lazy(() => import("@/pages/GuiEditorPage"));
const NotFoundLogPage        = lazy(() => import("@/pages/NotFoundLogPage"));
const UsersIpAuditPage       = lazy(() => import("@/pages/UsersIpAuditPage"));
const DeploymentsPage        = lazy(() => import("@/pages/DeploymentsPage"));
const CompanyOnboardingPage  = lazy(() => import("@/pages/CompanyOnboardingPage"));

// ── Page loading skeleton ─────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:16 }}>
    <div style={{ width:48, height:48, border:"4px solid #e2e8f0", borderTop:"4px solid #0078d4", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    <span style={{ color:"#64748b", fontSize:13, fontWeight:600, letterSpacing:"0.06em" }}>LOADING…</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
      gcTime: 600_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
  },
});

// ── Protected wrapper ─────────────────────────────────────────────────────────
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <FacilityProvider>
      <AppLayout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AppLayout>
    </FacilityProvider>
  </ProtectedRoute>
);

// ── Role shorthand ─────────────────────────────────────────────────────────────
const FINANCE = ["admin","procurement_manager","accountant","finance_manager","finance_officer"];
const PROCURE = ["admin","procurement_manager","procurement_officer"];
const ADMINS  = ["admin","superadmin","webmaster"];

const App = () => {
  return (
  <ErrorBoundary pageName="Application Root">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ResponsiveBot />
      <HashRouter>
        <RouterGuard />
        <ErrorBoundary pageName="Auth">
        <AuthProvider>
          <NetworkGuard>
            <SessionBot />
            <KeepAliveBot />
            <ErrorBoundary pageName="Routing">
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/forms/:formId"  element={<PublicFormPage />} />
              <Route path="/"               element={<Navigate to="/dashboard" replace />} />
              <Route path="/index"          element={<Navigate to="/dashboard" replace />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<P><DashboardPage /></P>} />

              {/* Procurement */}
              <Route path="/requisitions"        element={<P><RoleGuard allowed={[...PROCURE,"requisitioner","warehouse_officer","inventory_manager"]}><RequisitionsPage /></RoleGuard></P>} />
              <Route path="/purchase-orders"     element={<P><RoleGuard allowed={[...PROCURE,...FINANCE]}><PurchaseOrdersPage /></RoleGuard></P>} />
              <Route path="/goods-received"      element={<P><RoleGuard allowed={[...PROCURE,"warehouse_officer","inventory_manager",...FINANCE]}><GoodsReceivedPage /></RoleGuard></P>} />
              <Route path="/tracking-approval"   element={<P><TrackingApprovalPage /></P>} />
              <Route path="/stamps"              element={<P><StampsPage /></P>} />
              <Route path="/admin/stamp-design"  element={<P><RoleGuard allowed={[...ADMINS,"procurement_manager"]}><StampDesignPage /></RoleGuard></P>} />
              <Route path="/suppliers"           element={<P><RoleGuard allowed={PROCURE}><SuppliersPage /></RoleGuard></P>} />
              <Route path="/crm"                 element={<Navigate to="/suppliers" replace />} />
              <Route path="/tenders"             element={<P><RoleGuard allowed={PROCURE}><TendersPage /></RoleGuard></P>} />
              <Route path="/bid-evaluations"     element={<P><RoleGuard allowed={["admin","procurement_manager"]}><BidEvaluationsPage /></RoleGuard></P>} />
              <Route path="/contracts"           element={<P><RoleGuard allowed={["admin","procurement_manager"]}><ContractsPage /></RoleGuard></P>} />
              <Route path="/procurement-planning" element={<P><RoleGuard allowed={["admin","procurement_manager"]}><ProcurementPlanningPage /></RoleGuard></P>} />

              {/* Reports & Docs */}
              <Route path="/reports"                    element={<P><ReportsPage /></P>} />
              <Route path="/about"                      element={<P><AboutPage /></P>} />
              <Route path="/reports/system-utilization" element={<P><SystemReportPage /></P>} />
              <Route path="/reports/print-engine"       element={<P><PrintEnginePage /></P>} />
              <Route path="/bi"                         element={<Navigate to="/reports" replace />} />
              <Route path="/fabric"                     element={<Navigate to="/reports" replace />} />
              <Route path="/documents"                  element={<P><DocumentsPage /></P>} />
              <Route path="/sharepoint"                 element={<Navigate to="/documents" replace />} />
              <Route path="/documents/editor"           element={<P><DocumentEditorPage /></P>} />
              <Route path="/documents/editor/:id"       element={<P><DocumentEditorPage /></P>} />

              {/* Inventory */}
              <Route path="/items"       element={<P><ItemsPage /></P>} />
              <Route path="/categories"  element={<P><CategoriesPage /></P>} />
              <Route path="/departments" element={<P><DepartmentsPage /></P>} />
              <Route path="/scanner"     element={<P><ScannerPage /></P>} />

              {/* Vouchers */}
              <Route path="/vouchers"          element={<Navigate to="/requisitions" replace />} />
              <Route path="/vouchers/payment"  element={<P><RoleGuard allowed={[...PROCURE,...FINANCE]}><PaymentVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/receipt"  element={<P><RoleGuard allowed={["admin","procurement_manager",...FINANCE]}><ReceiptVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/journal"  element={<P><RoleGuard allowed={["admin","procurement_manager",...FINANCE]}><JournalVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/purchase" element={<P><RoleGuard allowed={["admin","procurement_manager",...FINANCE]}><PurchaseVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/sales"    element={<P><RoleGuard allowed={["admin","procurement_manager",...FINANCE]}><SalesVouchersPage /></RoleGuard></P>} />

              {/* Financials */}
              <Route path="/financials"                    element={<P><RoleGuard allowed={FINANCE}><FinancialDashboardPage /></RoleGuard></P>} />
              <Route path="/financials/dashboard"          element={<P><RoleGuard allowed={FINANCE}><FinancialDashboardPage /></RoleGuard></P>} />
              <Route path="/financials/chart-of-accounts"  element={<P><RoleGuard allowed={FINANCE}><ChartOfAccountsPage /></RoleGuard></P>} />
              <Route path="/financials/budgets"            element={<P><RoleGuard allowed={FINANCE}><BudgetsPage /></RoleGuard></P>} />
              <Route path="/financials/fixed-assets"       element={<P><RoleGuard allowed={FINANCE}><FixedAssetsPage /></RoleGuard></P>} />

              {/* Quality */}
              <Route path="/quality"                   element={<P><QualityDashboardPage /></P>} />
              <Route path="/quality/dashboard"         element={<P><QualityDashboardPage /></P>} />
              <Route path="/quality/inspections"       element={<P><InspectionsPage /></P>} />
              <Route path="/quality/non-conformance"   element={<P><NonConformancePage /></P>} />

              {/* Comms */}
              <Route path="/inbox"          element={<P><InboxPage /></P>} />
              <Route path="/email"          element={<P><EmailPage /></P>} />
              <Route path="/reception"      element={<P><ReceptionPage /></P>} />
              <Route path="/telephony"      element={<P><TelephonyPage /></P>} />
              <Route path="/sms"            element={<P><RoleGuard allowed={[...ADMINS,"procurement_manager"]}><SMSPage /></RoleGuard></P>} />
              <Route path="/communications" element={<P><CommunicationsHubPage /></P>} />
              <Route path="/whatsapp"       element={<P><WhatsAppPage /></P>} />
              <Route path="/ai-agent"       element={<P><AIAgentPage /></P>} />

              {/* Admin */}
              <Route path="/admin"                       element={<Navigate to="/admin/panel" replace />} />
              <Route path="/users"                       element={<P><RoleGuard allowed={[...ADMINS,"database_admin"]}><UsersPage /></RoleGuard></P>} />
              <Route path="/settings"                    element={<P><RoleGuard allowed={ADMINS}><SettingsPage /></RoleGuard></P>} />
              <Route path="/audit"                       element={<Navigate to="/audit-log" replace />} />
              <Route path="/audit-log"                   element={<P><RoleGuard allowed={["admin","procurement_manager","accountant","finance_manager"]}><AuditLogPage /></RoleGuard></P>} />
              <Route path="/admin/database"              element={<P><RoleGuard allowed={["admin","database_admin"]}><AdminDatabasePage /></RoleGuard></P>} />
              <Route path="/admin/panel"                 element={<P><RoleGuard allowed={ADMINS}><AdminPanelPage /></RoleGuard></P>} />
              <Route path="/admin/deployments"           element={<P><RoleGuard allowed={ADMINS}><DeploymentsPage /></RoleGuard></P>} />
              <Route path="/admin/deployments/new"       element={<P><RoleGuard allowed={ADMINS}><CompanyOnboardingPage /></RoleGuard></P>} />
              <Route path="/admin/deployments/:id"       element={<P><RoleGuard allowed={ADMINS}><CompanyOnboardingPage /></RoleGuard></P>} />
              <Route path="/superadmin"                  element={<P><RoleGuard allowed={["superadmin","webmaster","admin"]}><WebmasterPage /></RoleGuard></P>} />
              <Route path="/webmaster"                   element={<P><RoleGuard allowed={ADMINS}><WebmasterPage /></RoleGuard></P>} />
              <Route path="/admin/ip-access"             element={<Navigate to="/admin/users-ip-audit" replace />} />
              <Route path="/ip-access"                   element={<Navigate to="/admin/users-ip-audit" replace />} />
              <Route path="/profile"                     element={<P><ProfilePage /></P>} />
              <Route path="/gui-editor"                  element={<P><RoleGuard allowed={ADMINS}><GuiEditorPage /></RoleGuard></P>} />
              <Route path="/admin/not-found-log"         element={<P><RoleGuard allowed={[...ADMINS,"database_admin"]}><NotFoundLogPage /></RoleGuard></P>} />
              <Route path="/admin/users-ip-audit"        element={<P><RoleGuard allowed={ADMINS}><UsersIpAuditPage /></RoleGuard></P>} />
              <Route path="/admin/create-user"           element={<Navigate to="/users" replace />} />
              <Route path="/admin/tracker"               element={<Navigate to="/admin/users-ip-audit" replace />} />

              {/* Finance Workspaces */}
              <Route path="/accountant"           element={<P><RoleGuard allowed={["admin","accountant","procurement_manager"]}><AccountantWorkspacePage /></RoleGuard></P>} />
              <Route path="/accountant-workspace" element={<P><RoleGuard allowed={["admin","accountant","procurement_manager"]}><AccountantWorkspacePage /></RoleGuard></P>} />
              <Route path="/finance-workspace"    element={<P><RoleGuard allowed={["admin","finance_manager","finance_officer","accountant","procurement_manager"]}><FinanceWorkspacePage /></RoleGuard></P>} />
              <Route path="/finance-dashboard"    element={<P><RoleGuard allowed={["admin","finance_manager","finance_officer","accountant","procurement_manager"]}><FinanceDashboardPage /></RoleGuard></P>} />

              {/* Misc */}
              <Route path="/notifications" element={<P><NotificationsPage /></P>} />
              <Route path="/releases"      element={<P><ReleasesPage /></P>} />
              <Route path="*"             element={<NotFound />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </NetworkGuard>
        </AuthProvider>
        </ErrorBoundary>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
