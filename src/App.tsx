import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

// Core pages
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import DashboardPage from "@/pages/DashboardPage";

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
import BidEvaluationsPage from "@/pages/BidEvaluationsPage";
import SourcingPage from "@/pages/SourcingPage";
import ProcurementPlanningPage from "@/pages/ProcurementPlanningPage";

// Inventory
import StockMovementsPage from "@/pages/inventory/StockMovementsPage";
import StockAdjustmentsPage from "@/pages/inventory/StockAdjustmentsPage";
import TransfersPage from "@/pages/inventory/TransfersPage";
import CycleCountsPage from "@/pages/inventory/CycleCountsPage";
import ReorderLevelsPage from "@/pages/inventory/ReorderLevelsPage";
import WarehousesPage from "@/pages/inventory/WarehousesPage";
import InventoryValuationPage from "@/pages/inventory/InventoryValuationPage";

// Vouchers
import PaymentVouchersPage from "@/pages/vouchers/PaymentVouchersPage";
import ReceiptVouchersPage from "@/pages/vouchers/ReceiptVouchersPage";
import JournalVouchersPage from "@/pages/vouchers/JournalVouchersPage";
import PurchaseVouchersPage from "@/pages/vouchers/PurchaseVouchersPage";
import SalesVouchersPage from "@/pages/vouchers/SalesVouchersPage";

// Financials
import ChartOfAccountsPage from "@/pages/financials/ChartOfAccountsPage";
import LedgerPage from "@/pages/financials/LedgerPage";
import TrialBalancePage from "@/pages/financials/TrialBalancePage";
import BudgetsPage from "@/pages/financials/BudgetsPage";
import BankAccountsPage from "@/pages/financials/BankAccountsPage";
import BankReconciliationPage from "@/pages/financials/BankReconciliationPage";
import FixedAssetsPage from "@/pages/financials/FixedAssetsPage";
import FinancialDashboardPage from "@/pages/financials/FinancialDashboardPage";

// Quality
import InspectionsPage from "@/pages/quality/InspectionsPage";
import NonConformancePage from "@/pages/quality/NonConformancePage";
import QualityDashboardPage from "@/pages/quality/QualityDashboardPage";

// Analytics
import AnalyticsDashboardPage from "@/pages/analytics/AnalyticsDashboardPage";
import ExecutiveDashboardPage from "@/pages/analytics/ExecutiveDashboardPage";

// Vendor Portal
import VendorDashboardPage from "@/pages/vendorPortal/VendorDashboardPage";
import VendorRegistrationPage from "@/pages/vendorPortal/VendorRegistrationPage";

// Admin
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
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
            <Route path="/bid-evaluations" element={<ProtectedPage><BidEvaluationsPage /></ProtectedPage>} />
            <Route path="/contracts" element={<ProtectedPage><ContractsPage /></ProtectedPage>} />
            <Route path="/sourcing" element={<ProtectedPage><SourcingPage /></ProtectedPage>} />
            <Route path="/procurement-planning" element={<ProtectedPage><ProcurementPlanningPage /></ProtectedPage>} />
            <Route path="/reports" element={<ProtectedPage><ReportsPage /></ProtectedPage>} />

            {/* Inventory */}
            <Route path="/items" element={<ProtectedPage><ItemsPage /></ProtectedPage>} />
            <Route path="/categories" element={<ProtectedPage><CategoriesPage /></ProtectedPage>} />
            <Route path="/departments" element={<ProtectedPage><DepartmentsPage /></ProtectedPage>} />
            <Route path="/stock-movements" element={<ProtectedPage><StockMovementsPage /></ProtectedPage>} />
            <Route path="/stock-adjustments" element={<ProtectedPage><StockAdjustmentsPage /></ProtectedPage>} />
            <Route path="/stock-transfers" element={<ProtectedPage><TransfersPage /></ProtectedPage>} />
            <Route path="/cycle-counts" element={<ProtectedPage><CycleCountsPage /></ProtectedPage>} />
            <Route path="/reorder-levels" element={<ProtectedPage><ReorderLevelsPage /></ProtectedPage>} />
            <Route path="/warehouses" element={<ProtectedPage><WarehousesPage /></ProtectedPage>} />
            <Route path="/inventory-valuation" element={<ProtectedPage><InventoryValuationPage /></ProtectedPage>} />
            <Route path="/scanner" element={<ProtectedPage><ScannerPage /></ProtectedPage>} />

            {/* Vouchers */}
            <Route path="/vouchers/payment" element={<ProtectedPage><PaymentVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/receipt" element={<ProtectedPage><ReceiptVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/journal" element={<ProtectedPage><JournalVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/purchase" element={<ProtectedPage><PurchaseVouchersPage /></ProtectedPage>} />
            <Route path="/vouchers/sales" element={<ProtectedPage><SalesVouchersPage /></ProtectedPage>} />

            {/* Financials */}
            <Route path="/financials/dashboard" element={<ProtectedPage><FinancialDashboardPage /></ProtectedPage>} />
            <Route path="/financials/chart-of-accounts" element={<ProtectedPage><ChartOfAccountsPage /></ProtectedPage>} />
            <Route path="/financials/ledger" element={<ProtectedPage><LedgerPage /></ProtectedPage>} />
            <Route path="/financials/trial-balance" element={<ProtectedPage><TrialBalancePage /></ProtectedPage>} />
            <Route path="/financials/budgets" element={<ProtectedPage><BudgetsPage /></ProtectedPage>} />
            <Route path="/financials/bank-accounts" element={<ProtectedPage><BankAccountsPage /></ProtectedPage>} />
            <Route path="/financials/bank-reconciliation" element={<ProtectedPage><BankReconciliationPage /></ProtectedPage>} />
            <Route path="/financials/fixed-assets" element={<ProtectedPage><FixedAssetsPage /></ProtectedPage>} />

            {/* Quality */}
            <Route path="/quality/dashboard" element={<ProtectedPage><QualityDashboardPage /></ProtectedPage>} />
            <Route path="/quality/inspections" element={<ProtectedPage><InspectionsPage /></ProtectedPage>} />
            <Route path="/quality/non-conformance" element={<ProtectedPage><NonConformancePage /></ProtectedPage>} />

            {/* Analytics */}
            <Route path="/analytics" element={<ProtectedPage><AnalyticsDashboardPage /></ProtectedPage>} />
            <Route path="/analytics/executive" element={<ProtectedPage><ExecutiveDashboardPage /></ProtectedPage>} />

            {/* Vendor Portal */}
            <Route path="/vendor-portal" element={<ProtectedPage><VendorDashboardPage /></ProtectedPage>} />
            <Route path="/vendor-registration" element={<VendorRegistrationPage />} />

            {/* Admin */}
            <Route path="/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="/audit-log" element={<ProtectedPage><AuditLogPage /></ProtectedPage>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
