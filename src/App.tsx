import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ItemsPage from "@/pages/ItemsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import RequisitionsPage from "@/pages/RequisitionsPage";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import SuppliersPage from "@/pages/SuppliersPage";
import GoodsReceivedPage from "@/pages/GoodsReceivedPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import ContractsPage from "@/pages/ContractsPage";
import VouchersPage from "@/pages/VouchersPage";
import NotFound from "@/pages/NotFound";

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
            <Route path="/items" element={<ProtectedPage><ItemsPage /></ProtectedPage>} />
            <Route path="/categories" element={<ProtectedPage><CategoriesPage /></ProtectedPage>} />
            <Route path="/requisitions" element={<ProtectedPage><RequisitionsPage /></ProtectedPage>} />
            <Route path="/purchase-orders" element={<ProtectedPage><PurchaseOrdersPage /></ProtectedPage>} />
            <Route path="/suppliers" element={<ProtectedPage><SuppliersPage /></ProtectedPage>} />
            <Route path="/goods-received" element={<ProtectedPage><GoodsReceivedPage /></ProtectedPage>} />
            <Route path="/departments" element={<ProtectedPage><DepartmentsPage /></ProtectedPage>} />
            <Route path="/reports" element={<ProtectedPage><ReportsPage /></ProtectedPage>} />
            <Route path="/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="/audit-log" element={<ProtectedPage><AuditLogPage /></ProtectedPage>} />
            <Route path="/contracts" element={<ProtectedPage><ContractsPage /></ProtectedPage>} />
            <Route path="/vouchers" element={<ProtectedPage><VouchersPage /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
