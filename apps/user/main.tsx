import { createRoot } from "react-dom/client";
import UserApp from "./UserApp";
import "../../src/index.css";

const loader = document.getElementById("app-loader");
if (loader) {
  setTimeout(() => {
    loader.style.transition = "opacity 0.4s";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }, 300);
}

createRoot(document.getElementById("root")!).render(<UserApp />);
