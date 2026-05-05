// ProcurBosse v5.9 — Vite Config
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
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "9.6.0"),
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            if (id.includes('@radix-ui')) return 'ui-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor';
            if (id.includes('xlsx')) return 'xlsx-vendor';
            if (id.includes('mammoth') || id.includes('papaparse')) return 'doc-vendor';
            if (id.includes('jspdf')) return 'pdf-vendor';
            if (id.includes('@tanstack')) return 'query-vendor';
            if (id.includes('date-fns') || id.includes('dayjs')) return 'date-vendor';
            return 'vendor';
          }
          // Split large page groups into route-based chunks
          if (id.includes('/pages/financials/')) return 'pages-finance';
          if (id.includes('/pages/vouchers/')) return 'pages-vouchers';
          if (id.includes('/pages/quality/')) return 'pages-quality';
          if (id.includes('/pages/Admin') || id.includes('/pages/Webmaster') || id.includes('/pages/Backup') || id.includes('/pages/ODBC')) return 'pages-admin';
          if (id.includes('/pages/Email') || id.includes('/pages/SMS') || id.includes('/pages/Telephony') || id.includes('/pages/Reception')) return 'pages-comms';
          if (id.includes('/pages/Accountant') || id.includes('/pages/Reports')) return 'pages-finance2';
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  envPrefix: ["VITE_"],
}));
