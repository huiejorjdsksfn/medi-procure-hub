// ProcurBosse v11.13.0 — Vite Config — EL5 MediProcure
// High-throughput build: aggressive chunking + preload hints
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const CHUNK_MAP: Record<string, string> = {
  // Core framework — loaded first, never changes
  "react":                   "react-vendor",
  "react-dom":               "react-vendor",
  "react-router-dom":        "react-vendor",
  // Supabase
  "@supabase/supabase-js":   "supabase-vendor",
  // UI — Lucide + Radix split so icon-only pages don't pull in Radix
  "lucide-react":            "ui-icons",
  "@radix-ui":               "ui-radix",
  // Charts — heavy, lazy-loaded
  "recharts":                "chart-vendor",
  // Spreadsheet
  "@e965/xlsx":              "xlsx-vendor",
  // Forms
  "react-hook-form":         "form-vendor",
  "@hookform/resolvers":     "form-vendor",
  "zod":                     "form-vendor",
  // Doc parsing
  "mammoth":                 "doc-vendor",
  "papaparse":               "doc-vendor",
  // PDF
  "jspdf":                   "pdf-vendor",
  "jspdf-autotable":         "pdf-vendor",
  // Query
  "@tanstack/react-query":   "query-vendor",
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
    hmr:  { overlay: false },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify("11.13.0"),
    __BUILD_DATE__:  JSON.stringify(new Date().toISOString().slice(0, 10)),
    __HOSPITAL__:    JSON.stringify("Embu Level 5 Hospital"),
    __SYSTEM__:      JSON.stringify("EL5 MediProcure"),
  },
  build: {
    sourcemap: false,
    target:    "es2020",           // wider async/await + optional chaining support
    minify:    "esbuild",          // faster than terser, comparable output
    cssMinify: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
      output: {
        manualChunks,
        // Preload critical chunks immediately
        // experimentalMinChunkSize: 10_000, // removed for Rollup compat
      },
    },
    chunkSizeWarningLimit: 1_000,
    // Inline small assets (< 8 KB) to cut HTTP round-trips
    assetsInlineLimit: 8_192,
    // Let Rollup tree-shake more aggressively
    reportCompressedSize: false,
  },
  // Optimise pre-bundling — Vite discovers all deps at cold start
  optimizeDeps: {
    include: [
      "react", "react-dom", "react-router-dom",
      "@supabase/supabase-js",
      "lucide-react",
    ],
  },
  envPrefix: ["VITE_"],
}));
