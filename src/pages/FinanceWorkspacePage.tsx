/**
 * FinanceWorkspacePage — redirects to FinanceDashboardPage (XP Desktop)
 * Kept for backward compat with existing routes and bookmarks
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FinanceWorkspacePage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/finance-dashboard", { replace: true }); }, [navigate]);
  return null;
}
