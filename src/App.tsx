import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

// Core
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import DashboardPage from "@/pages/DashboardPage";
import Index from "@/pages/Index";

// Procurement
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

// Vouchers
import VouchersPage from "@/pages/VouchersPage";
import PaymentVouchersPage from "@/pages/vouchers/PaymentVouchersPage";
import ReceiptVouchersPage from "@/pages/vouchers/ReceiptVouchersPage";
import JournalVouchersPage from "@/pages/vouchers/JournalVouchersPage";
import PurchaseVouchersPage from "@/pages/vouchers/PurchaseVouchersPage";
import SalesVouchersPage from "@/pages/vouchers/SalesVouchersPage";

// Financials
import FinancialDashboardPage from "@/pages/financials/FinancialDashboardPage";
import ChartOfAccountsPage from "@/pages/financials/ChartOfAccountsPage";
import BudgetsPage from "@/pages/financials/BudgetsPage";

// Quality
import QualityDashboardPage from "@/pages/quality/QualityDashboardPage";
import InspectionsPage from "@/pages/quality/InspectionsPage";
import NonConformancePage from "@/pages/quality/NonConformancePage";

// Admin
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import AdminDatabasePage from "@/pages/AdminDatabasePage";
import ScannerPage from "@/pages/ScannerPage";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />

            {/* Procurement */}
            <Route path="/requisitions" element={<ProtectedPage><RequisitionsPage /></ProtectedPage>} />
            <Route path="/purchase-orders" element={<ProtectedPage><PurchaseOrdersPage /></ProtectedPage>} />
            <Route path="/goods-received" element={<ProtectedPage><GoodsReceivedPage /></ProtectedPage>} />
            <Route path="/suppliers" element={<ProtectedPage><SuppliersPage /></ProtectedPage>} />
            <Route path="/tenders" element={<ProtectedPage><TendersPage /></ProtectedPage>} />
            <Route path="/contracts" element={<ProtectedPage><ContractsPage /></ProtectedPage>} />
            <Route path="/reports" element={<ProtectedPage><ReportsPage /></ProtectedPage>} />

            {/* Inventory */}
            <Route path="/items" element={<ProtectedPage><ItemsPage /></ProtectedPage>} />
            <Route path="/categories" element={<ProtectedPage><CategoriesPage /></ProtectedPage>} />
            <Route path="/departments" element={<ProtectedPage><DepartmentsPage /></ProtectedPage>} />
            <Route path="/scanner" element={<ProtectedPage><ScannerPage /></ProtectedPage>} />

            {/* Vouchers */}
            <Route path="/vouchers" element={<ProtectedPage><VouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/payment" element={<ProtectedPage><PaymentVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/receipt" element={<ProtectedPage><ReceiptVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/journal" element={<ProtectedPage><JournalVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/purchase" element={<ProtectedPage><PurchaseVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/sales" element={<ProtectedPage><SalesVouchersPage /></ProtectedPage>} />

            {/* Financials */}
            <Route path="/financials" element={<ProtectedPage><FinancialDashboardPage /></ProtectedPage>} />
            <Route path="/financials/dashboard" element={<ProtectedPage><FinancialDashboardPage /></ProtectedPage>} />
            <Route path="/financials/chart-of-accounts" element={<ProtectedPage><ChartOfAccountsPage /></ProtectedPage>} />
            <Route path="/financials/budgets" element={<ProtectedPage><BudgetsPage /></ProtectedPage>} />

            {/* Quality */}
            <Route path="/quality" element={<ProtectedPage><QualityDashboardPage /></ProtectedPage>} />
            <Route path="/quality/dashboard" element={<ProtectedPage><QualityDashboardPage /></ProtectedPage>} />
            <Route path="/quality/inspections" element={<ProtectedPage><InspectionsPage /></ProtectedPage>} />
            <Route path="/quality/non-conformance" element={<ProtectedPage><NonConformancePage /></ProtectedPage>} />

            {/* Admin */}
            <Route path="/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="/audit-log" element={<ProtectedPage><AuditLogPage /></ProtectedPage>} />
            <Route path="/admin/database" element={<ProtectedPage><AdminDatabasePage /></ProtectedPage>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
