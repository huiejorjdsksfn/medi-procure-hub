// ProcurBosse v10.0 — Vite Config — EL5 MediProcure
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify("10.0.0"),
    __BUILD_DATE__:  JSON.stringify(new Date().toISOString().slice(0,10)),
    __HOSPITAL__:    JSON.stringify("Embu Level 5 Hospital"),
    __SYSTEM__:      JSON.stringify("EL5 MediProcure"),
  },
  build: {
    sourcemap: false,
    target: "es2015",
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
      output: {
        manualChunks: {
          "react-vendor":    ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "ui-vendor":       ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-tabs"],
          "chart-vendor":    ["recharts"],
          "xlsx-vendor":     ["xlsx"],
          "form-vendor":     ["react-hook-form", "@hookform/resolvers", "zod"],
          "doc-vendor":      ["mammoth", "papaparse"],
          "pdf-vendor":      ["jspdf", "jspdf-autotable"],
          "query-vendor":    ["@tanstack/react-query"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  envPrefix: ["VITE_"],
}));
