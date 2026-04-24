// InboxPage now unified into EmailPage - redirect there
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function InboxPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/email", { replace: true }); }, [navigate]);
  return null;
}
