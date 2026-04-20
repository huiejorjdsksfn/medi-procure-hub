/**
 * ProcurBosse v22.0 — Vite Config
 * Production build for EdgeOne deployment
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 */
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
    __APP_VERSION__: JSON.stringify("22.0.2"),
  },
  build: {
    sourcemap: false,
    target: "es2017",
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        if (warning.code === "THIS_IS_UNDEFINED") return;
        warn(warning);
      },
      output: {
        manualChunks: {
          "react-vendor":    ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "ui-vendor":       ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select"],
          "chart-vendor":    ["recharts"],
          "xlsx-vendor":     ["xlsx"],
          "doc-vendor":      ["mammoth", "papaparse"],
          "pdf-vendor":      ["jspdf", "jspdf-autotable"],
          "tanstack":        ["@tanstack/react-query"],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  envPrefix: ["VITE_"],
  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js", "lucide-react", "recharts"],
  },
}));
