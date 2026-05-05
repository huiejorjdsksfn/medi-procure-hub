/**
 * UserApp — Standard staff portal
 * Roles: requisitioner, procurement_officer, inventory_manager,
 *        warehouse_officer, accountant, reception
 * Excludes: admin-only pages (DB, audit, backup, ODBC, webmaster, GUI editor, IP access)
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import UserLoginPage from "./UserLoginPage";

import DashboardPage from "@/pages/DashboardPage";
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
import SettingsPage from "@/pages/SettingsPage";
import InboxPage from "@/pages/InboxPage";
import EmailPage from "@/pages/EmailPage";
import DocumentsPage from "@/pages/DocumentsPage";
import DocumentEditorPage from "@/pages/DocumentEditorPage";
import ProfilePage from "@/pages/ProfilePage";
import AccountantWorkspacePage from "@/pages/AccountantWorkspacePage";
import NotificationsPage from "@/pages/NotificationsPage";
import PrintEnginePage from "@/pages/PrintEnginePage";
import ReceptionPage from "@/pages/ReceptionPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SMSPage from "@/pages/SMSPage";
import TelephonyPage from "@/pages/TelephonyPage";
import ChangelogPage from "@/pages/ChangelogPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

export default function UserApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<UserLoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<P><DashboardPage /></P>} />
              <Route path="/items" element={<P><ItemsPage /></P>} />
              <Route path="/categories" element={<P><CategoriesPage /></P>} />
              <Route path="/requisitions" element={<P><RequisitionsPage /></P>} />
              <Route path="/purchase-orders" element={<P><PurchaseOrdersPage /></P>} />
              <Route path="/suppliers" element={<P><SuppliersPage /></P>} />
              <Route path="/goods-received" element={<P><GoodsReceivedPage /></P>} />
              <Route path="/departments" element={<P><DepartmentsPage /></P>} />
              <Route path="/reports" element={<P><ReportsPage /></P>} />
              <Route path="/contracts" element={<P><ContractsPage /></P>} />
              <Route path="/tenders" element={<P><TendersPage /></P>} />
              <Route path="/bid-evaluations" element={<P><BidEvaluationsPage /></P>} />
              <Route path="/procurement-planning" element={<P><ProcurementPlanningPage /></P>} />
              <Route path="/scanner" element={<P><ScannerPage /></P>} />
              <Route path="/vouchers" element={<P><VouchersPage /></P>} />
              <Route path="/vouchers/payment" element={<P><PaymentVouchersPage /></P>} />
              <Route path="/vouchers/receipt" element={<P><ReceiptVouchersPage /></P>} />
              <Route path="/vouchers/journal" element={<P><JournalVouchersPage /></P>} />
              <Route path="/vouchers/purchase" element={<P><PurchaseVouchersPage /></P>} />
              <Route path="/vouchers/sales" element={<P><SalesVouchersPage /></P>} />
              <Route path="/financials" element={<P><FinancialDashboardPage /></P>} />
              <Route path="/financials/chart-of-accounts" element={<P><ChartOfAccountsPage /></P>} />
              <Route path="/financials/budgets" element={<P><BudgetsPage /></P>} />
              <Route path="/financials/fixed-assets" element={<P><FixedAssetsPage /></P>} />
              <Route path="/quality" element={<P><QualityDashboardPage /></P>} />
              <Route path="/quality/inspections" element={<P><InspectionsPage /></P>} />
              <Route path="/quality/non-conformance" element={<P><NonConformancePage /></P>} />
              <Route path="/settings" element={<P><SettingsPage /></P>} />
              <Route path="/inbox" element={<P><InboxPage /></P>} />
              <Route path="/email" element={<P><EmailPage /></P>} />
              <Route path="/sms" element={<P><SMSPage /></P>} />
              <Route path="/telephony" element={<P><TelephonyPage /></P>} />
              <Route path="/documents" element={<P><DocumentsPage /></P>} />
              <Route path="/documents/editor" element={<P><DocumentEditorPage /></P>} />
              <Route path="/accountant" element={<P><AccountantWorkspacePage /></P>} />
              <Route path="/notifications" element={<P><NotificationsPage /></P>} />
              <Route path="/profile" element={<P><ProfilePage /></P>} />
              <Route path="/print-engine" element={<P><PrintEnginePage /></P>} />
              <Route path="/reception" element={<P><ReceptionPage /></P>} />
              <Route path="/changelog" element={<P><ChangelogPage /></P>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
