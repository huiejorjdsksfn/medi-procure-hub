/**
 * ProcurBosse v8.0 -- App.tsx
 * Production router -- 2000+ concurrent users
 * FacilitySwitcher removed -- replaced with 10 enterprise APIs
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import RoleGuard from "@/components/RoleGuard";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import NetworkGuard from "@/components/NetworkGuard";
import NotFound from "@/pages/NotFound";

import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import AccountantWorkspacePage from "@/pages/AccountantWorkspacePage";
import NotificationsPage from "@/pages/NotificationsPage";

import ItemsPage from "@/pages/ItemsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import RequisitionsPage from "@/pages/RequisitionsPage";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import SuppliersPage from "@/pages/SuppliersPage";
import GoodsReceivedPage from "@/pages/GoodsReceivedPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import ReportsPage from "@/pages/ReportsPage";
import ContractsPage from "@/pages/ContractsPage";
import TendersPage from "@/pages/TendersPage";
import BidEvaluationsPage from "@/pages/BidEvaluationsPage";
import ProcurementPlanningPage from "@/pages/ProcurementPlanningPage";
import ScannerPage from "@/pages/ScannerPage";

import VouchersPage from "@/pages/VouchersPage";
import PaymentVouchersPage from "@/pages/vouchers/PaymentVouchersPage";
import ReceiptVouchersPage from "@/pages/vouchers/ReceiptVouchersPage";
import JournalVouchersPage from "@/pages/vouchers/JournalVouchersPage";
import PurchaseVouchersPage from "@/pages/vouchers/PurchaseVouchersPage";
import SalesVouchersPage from "@/pages/vouchers/SalesVouchersPage";

import FinancialDashboardPage from "@/pages/financials/FinancialDashboardPage";
import ChartOfAccountsPage from "@/pages/financials/ChartOfAccountsPage";
import BudgetsPage from "@/pages/financials/BudgetsPage";
import FixedAssetsPage from "@/pages/financials/FixedAssetsPage";

import QualityDashboardPage from "@/pages/quality/QualityDashboardPage";
import InspectionsPage from "@/pages/quality/InspectionsPage";
import NonConformancePage from "@/pages/quality/NonConformancePage";

import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import AdminDatabasePage from "@/pages/AdminDatabasePage";
import ReceptionPage from "@/pages/ReceptionPage";
import TelephonyPage from "@/pages/TelephonyPage";
import SMSPage from "@/pages/SMSPage";
import WebmasterPage from "@/pages/WebmasterPage";
import InboxPage from "@/pages/InboxPage";
import EmailPage from "@/pages/EmailPage";
import DocumentsPage from "@/pages/DocumentsPage";
import DocumentEditorPage from "@/pages/DocumentEditorPage";
import BackupPage from "@/pages/BackupPage";
import ODBCPage from "@/pages/ODBCPage";
import AdminPanelPage from "@/pages/AdminPanelPage";
import IpAccessPage from "@/pages/IpAccessPage";
import ProfilePage from "@/pages/ProfilePage";
import GuiEditorPage from "@/pages/GuiEditorPage";
import FacilitiesPage from "@/pages/FacilitiesPage";
import DbTestPage from "@/pages/DbTestPage";
import PrintEnginePage from "@/pages/PrintEnginePage";

// -- Production QueryClient optimised for 2000+ concurrent users --
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 60_000,
      gcTime: 600_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      networkMode: "online",
    },
    mutations: {
      retry: 1,
      networkMode: "online",
    },
  },
});

const ADMIN_ROLES   = ["admin","superadmin","webmaster"];
const PROC_ROLES    = ["admin","procurement_manager","procurement_officer"];
const FINANCE_ROLES = ["admin","procurement_manager","accountant"];

// Protected layout wrapper -- no FacilityProvider
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NetworkGuard>
            <PWAInstallPrompt />
            <Routes>
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/"               element={<Navigate to="/dashboard" replace />} />
              <Route path="/index"          element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"      element={<P><DashboardPage /></P>} />

              <Route path="/requisitions"         element={<P><RoleGuard allowed={["admin","procurement_manager","procurement_officer","requisitioner","warehouse_officer","inventory_manager"]}><RequisitionsPage /></RoleGuard></P>} />
              <Route path="/purchase-orders"      element={<P><RoleGuard allowed={[...PROC_ROLES,"accountant"]}><PurchaseOrdersPage /></RoleGuard></P>} />
              <Route path="/goods-received"       element={<P><RoleGuard allowed={[...PROC_ROLES,"warehouse_officer","inventory_manager","accountant"]}><GoodsReceivedPage /></RoleGuard></P>} />
              <Route path="/suppliers"            element={<P><RoleGuard allowed={PROC_ROLES}><SuppliersPage /></RoleGuard></P>} />
              <Route path="/tenders"              element={<P><RoleGuard allowed={PROC_ROLES}><TendersPage /></RoleGuard></P>} />
              <Route path="/bid-evaluations"      element={<P><RoleGuard allowed={["admin","procurement_manager"]}><BidEvaluationsPage /></RoleGuard></P>} />
              <Route path="/contracts"            element={<P><RoleGuard allowed={["admin","procurement_manager"]}><ContractsPage /></RoleGuard></P>} />
              <Route path="/procurement-planning" element={<P><RoleGuard allowed={["admin","procurement_manager"]}><ProcurementPlanningPage /></RoleGuard></P>} />

              <Route path="/items"       element={<P><ItemsPage /></P>} />
              <Route path="/categories"  element={<P><CategoriesPage /></P>} />
              <Route path="/departments" element={<P><DepartmentsPage /></P>} />
              <Route path="/scanner"     element={<P><ScannerPage /></P>} />
              <Route path="/reception"   element={<P><ReceptionPage /></P>} />

              <Route path="/reports"              element={<P><ReportsPage /></P>} />
              <Route path="/documents"            element={<P><DocumentsPage /></P>} />
              <Route path="/documents/editor"     element={<P><DocumentEditorPage /></P>} />
              <Route path="/documents/editor/:id" element={<P><DocumentEditorPage /></P>} />

              <Route path="/vouchers"          element={<P><RoleGuard allowed={FINANCE_ROLES}><VouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/payment"  element={<P><RoleGuard allowed={FINANCE_ROLES}><PaymentVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/receipt"  element={<P><RoleGuard allowed={FINANCE_ROLES}><ReceiptVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/journal"  element={<P><RoleGuard allowed={FINANCE_ROLES}><JournalVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/purchase" element={<P><RoleGuard allowed={FINANCE_ROLES}><PurchaseVouchersPage /></RoleGuard></P>} />
              <Route path="/vouchers/sales"    element={<P><RoleGuard allowed={FINANCE_ROLES}><SalesVouchersPage /></RoleGuard></P>} />

              <Route path="/financials"                   element={<P><RoleGuard allowed={FINANCE_ROLES}><FinancialDashboardPage /></RoleGuard></P>} />
              <Route path="/financials/dashboard"         element={<P><RoleGuard allowed={FINANCE_ROLES}><FinancialDashboardPage /></RoleGuard></P>} />
              <Route path="/financials/chart-of-accounts" element={<P><RoleGuard allowed={FINANCE_ROLES}><ChartOfAccountsPage /></RoleGuard></P>} />
              <Route path="/financials/budgets"           element={<P><RoleGuard allowed={FINANCE_ROLES}><BudgetsPage /></RoleGuard></P>} />
              <Route path="/financials/fixed-assets"      element={<P><RoleGuard allowed={FINANCE_ROLES}><FixedAssetsPage /></RoleGuard></P>} />

              <Route path="/quality"                 element={<P><QualityDashboardPage /></P>} />
              <Route path="/quality/dashboard"       element={<P><QualityDashboardPage /></P>} />
              <Route path="/quality/inspections"     element={<P><InspectionsPage /></P>} />
              <Route path="/quality/non-conformance" element={<P><NonConformancePage /></P>} />

              <Route path="/accountant"           element={<P><RoleGuard allowed={FINANCE_ROLES}><AccountantWorkspacePage /></RoleGuard></P>} />
              <Route path="/accountant-workspace" element={<P><RoleGuard allowed={FINANCE_ROLES}><AccountantWorkspacePage /></RoleGuard></P>} />

              <Route path="/inbox"     element={<P><InboxPage /></P>} />
              <Route path="/email"     element={<P><EmailPage /></P>} />
              <Route path="/sms"       element={<P><RoleGuard allowed={[...PROC_ROLES,"accountant","inventory_manager","warehouse_officer","requisitioner"]}><SMSPage /></RoleGuard></P>} />
              <Route path="/telephony" element={<P><RoleGuard allowed={[...PROC_ROLES,"accountant","inventory_manager","warehouse_officer","requisitioner"]}><TelephonyPage /></RoleGuard></P>} />

              <Route path="/users"           element={<P><RoleGuard allowed={[...ADMIN_ROLES,"database_admin"]}><UsersPage /></RoleGuard></P>} />
              <Route path="/settings"        element={<P><RoleGuard allowed={ADMIN_ROLES}><SettingsPage /></RoleGuard></P>} />
              <Route path="/audit-log"       element={<P><RoleGuard allowed={[...ADMIN_ROLES,"procurement_manager","accountant"]}><AuditLogPage /></RoleGuard></P>} />
              <Route path="/admin/database"  element={<P><RoleGuard allowed={["admin","database_admin"]}><AdminDatabasePage /></RoleGuard></P>} />
              <Route path="/admin/panel"     element={<P><RoleGuard allowed={ADMIN_ROLES}><AdminPanelPage /></RoleGuard></P>} />
              <Route path="/admin/ip-access" element={<P><RoleGuard allowed={ADMIN_ROLES}><IpAccessPage /></RoleGuard></P>} />
              <Route path="/admin/db-test"   element={<P><RoleGuard allowed={["admin","database_admin"]}><DbTestPage /></RoleGuard></P>} />
              <Route path="/superadmin"      element={<P><RoleGuard allowed={ADMIN_ROLES}><WebmasterPage /></RoleGuard></P>} />
              <Route path="/webmaster"       element={<P><RoleGuard allowed={ADMIN_ROLES}><WebmasterPage /></RoleGuard></P>} />
              <Route path="/backup"          element={<P><RoleGuard allowed={["admin","superadmin","database_admin"]}><BackupPage /></RoleGuard></P>} />
              <Route path="/odbc"            element={<P><RoleGuard allowed={["admin","superadmin","webmaster","database_admin"]}><ODBCPage /></RoleGuard></P>} />
              <Route path="/facilities"      element={<P><RoleGuard allowed={ADMIN_ROLES}><FacilitiesPage /></RoleGuard></P>} />
              <Route path="/gui-editor"      element={<P><RoleGuard allowed={ADMIN_ROLES}><GuiEditorPage /></RoleGuard></P>} />
              <Route path="/print-engine"    element={<P><RoleGuard allowed={[...ADMIN_ROLES,"procurement_manager","accountant","inventory_manager"]}><PrintEnginePage /></RoleGuard></P>} />
              <Route path="/profile"         element={<P><ProfilePage /></P>} />
              <Route path="/notifications"   element={<P><NotificationsPage /></P>} />
              <Route path="*"                element={<NotFound />} />
            </Routes>
          </NetworkGuard>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
