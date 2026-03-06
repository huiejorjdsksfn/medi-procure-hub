import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-8xl font-bold text-slate-200">404</p>
        <h1 className="text-2xl font-bold text-slate-700 mt-4">Page Not Found</h1>
        <p className="text-slate-500 mt-2">The page you're looking for doesn't exist in MediProcure ERP.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Go Back
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/dashboard")}>
            <Home className="w-4 h-4 mr-2" />Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
