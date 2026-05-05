/**
 * ProcurBosse Admin App — Entry Point
 * Full system access: all modules, users, settings, audit, DB
 */
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp";
import "../../src/index.css";

// Remove loader once React mounts
const loader = document.getElementById("app-loader");
if (loader) {
  setTimeout(() => {
    loader.style.transition = "opacity 0.4s";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }, 300);
}

createRoot(document.getElementById("root")!).render(<AdminApp />);
