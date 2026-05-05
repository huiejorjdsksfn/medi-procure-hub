import { createRoot } from "react-dom/client";
import KioskApp from "./KioskApp";
import "../../src/index.css";

const loader = document.getElementById("app-loader");
if (loader) {
  setTimeout(() => {
    loader.style.transition = "opacity 0.4s";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }, 300);
}

createRoot(document.getElementById("root")!).render(<KioskApp />);
