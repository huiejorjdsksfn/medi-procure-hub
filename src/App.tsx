import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
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

import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import AdminDatabasePage from "@/pages/AdminDatabasePage";
import WebmasterPage from "@/pages/WebmasterPage";

const queryClient = new QueryClient();
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster /><Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<P><DashboardPage /></P>} />

            <Route path="/requisitions" element={<P><RequisitionsPage /></P>} />
            <Route path="/purchase-orders" element={<P><PurchaseOrdersPage /></P>} />
            <Route path="/goods-received" element={<P><GoodsReceivedPage /></P>} />
            <Route path="/suppliers" element={<P><SuppliersPage /></P>} />
            <Route path="/tenders" element={<P><TendersPage /></P>} />
            <Route path="/bid-evaluations" element={<P><BidEvaluationsPage /></P>} />
            <Route path="/contracts" element={<P><ContractsPage /></P>} />
            <Route path="/procurement-planning" element={<P><ProcurementPlanningPage /></P>} />
            <Route path="/reports" element={<P><ReportsPage /></P>} />

            <Route path="/items" element={<P><ItemsPage /></P>} />
            <Route path="/categories" element={<P><CategoriesPage /></P>} />
            <Route path="/departments" element={<P><DepartmentsPage /></P>} />
            <Route path="/scanner" element={<P><ScannerPage /></P>} />

            <Route path="/vouchers" element={<P><VouchersPage /></P>} />
            <Route path="/vouchers/payment" element={<P><PaymentVouchersPage /></P>} />
            <Route path="/vouchers/receipt" element={<P><ReceiptVouchersPage /></P>} />
            <Route path="/vouchers/journal" element={<P><JournalVouchersPage /></P>} />
            <Route path="/vouchers/purchase" element={<P><PurchaseVouchersPage /></P>} />
            <Route path="/vouchers/sales" element={<P><SalesVouchersPage /></P>} />

            <Route path="/financials" element={<P><FinancialDashboardPage /></P>} />
            <Route path="/financials/dashboard" element={<P><FinancialDashboardPage /></P>} />
            <Route path="/financials/chart-of-accounts" element={<P><ChartOfAccountsPage /></P>} />
            <Route path="/financials/budgets" element={<P><BudgetsPage /></P>} />
            <Route path="/financials/fixed-assets" element={<P><FixedAssetsPage /></P>} />

            <Route path="/quality" element={<P><QualityDashboardPage /></P>} />
            <Route path="/quality/dashboard" element={<P><QualityDashboardPage /></P>} />
            <Route path="/quality/inspections" element={<P><InspectionsPage /></P>} />
            <Route path="/quality/non-conformance" element={<P><NonConformancePage /></P>} />

            <Route path="/users" element={<P><UsersPage /></P>} />
            <Route path="/settings" element={<P><SettingsPage /></P>} />
            <Route path="/audit-log" element={<P><AuditLogPage /></P>} />
            <Route path="/admin/database" element={<P><AdminDatabasePage /></P>} />
            <Route path="/webmaster" element={<P><WebmasterPage /></P>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
