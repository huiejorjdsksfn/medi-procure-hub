// ProcurBosse v12.0.0 — Vite Config — EL5 MediProcure
// Tuned for 100+ concurrent users: granular vendor chunks, lazy pages, 8 KB asset inlining
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// ── Manual chunk map — deterministic split prevents cache busting on unrelated changes
const CHUNK_MAP: Record<string, string> = {
  "react":                    "react-vendor",
  "react-dom":                "react-vendor",
  "react-router-dom":         "react-vendor",
  "@supabase/supabase-js":    "supabase-vendor",
  "lucide-react":             "ui-icons",
  "@radix-ui":                "ui-radix",
  "recharts":                 "chart-vendor",
  "d3-":                      "chart-vendor",
  "@e965/xlsx":               "xlsx-vendor",
  "react-hook-form":          "form-vendor",
  "@hookform/resolvers":      "form-vendor",
  "zod":                      "form-vendor",
  "mammoth":                  "doc-vendor",
  "papaparse":                "doc-vendor",
  "jspdf":                    "pdf-vendor",
  "jspdf-autotable":          "pdf-vendor",
  "@tanstack/react-query":    "query-vendor",
  "date-fns":                 "date-vendor",
  "html5-qrcode":             "scanner-vendor",
  "pdfjs-dist":               "pdfjs-vendor",
  "embla-carousel":           "carousel-vendor",
};

function manualChunks(id: string): string | undefined {
  for (const [key, chunk] of Object.entries(CHUNK_MAP)) {
    if (id.includes(`/node_modules/${key}`)) return chunk;
  }
  return undefined;
}

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
    __APP_VERSION__: JSON.stringify("12.0.0"),
    __BUILD_DATE__:  JSON.stringify(new Date().toISOString().slice(0, 10)),
    __HOSPITAL__:    JSON.stringify("Embu Level 5 Hospital"),
    __SYSTEM__:      JSON.stringify("EL5 MediProcure"),
    __BUILD_ENV__:   JSON.stringify(mode),
  },
  build: {
    sourcemap: false,
    target:    "es2017",
    assetsInlineLimit: 8_192,
    cssCodeSplit: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
      output: {
        manualChunks,
        // Stable chunk filenames — avoids cache busting when only one module changes
        chunkFileNames:  "assets/[name]-[hash].js",
        assetFileNames:  "assets/[name]-[hash][extname]",
        entryFileNames:  "assets/[name]-[hash].js",
      },
    },
    chunkSizeWarningLimit: 1_200,
  },
  envPrefix: ["VITE_"],
  // Warm up lazy routes on idle — cuts first-nav latency
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "@tanstack/react-query",
    ],
  },
}));
