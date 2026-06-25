// ProcurBosse v11.12.0 — Vite 8 Config — EL5 MediProcure
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const CHUNK_MAP: Record<string, string> = {
  "react":                   "react-vendor",
  "react-dom":               "react-vendor",
  "react-router-dom":        "react-vendor",
  "@supabase/supabase-js":   "supabase-vendor",
  "lucide-react":            "ui-vendor",
  "@radix-ui":               "ui-vendor",
  "recharts":                "chart-vendor",
  "@e965/xlsx":              "xlsx-vendor",
  "react-hook-form":         "form-vendor",
  "@hookform/resolvers":     "form-vendor",
  "zod":                     "form-vendor",
  "mammoth":                 "doc-vendor",
  "papaparse":               "doc-vendor",
  "jspdf":                   "pdf-vendor",
  "jspdf-autotable":         "pdf-vendor",
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
    hmr: { overlay: false },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify("11.12.0"),
    __BUILD_DATE__:  JSON.stringify(new Date().toISOString().slice(0, 10)),
    __HOSPITAL__:    JSON.stringify("Embu Level 5 Hospital"),
    __SYSTEM__:      JSON.stringify("EL5 MediProcure"),
  },
  build: {
    sourcemap: false,
    target:    "es2017",
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
      output: { manualChunks },
    },
    chunkSizeWarningLimit: 900,
  },
  envPrefix: ["VITE_"],
}));
