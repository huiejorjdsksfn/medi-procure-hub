/**
 * ProcurBosse v22.7 — Vite Config NUCLEAR
 * Plugin removes ALL modulepreload links + moves script to body
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 */
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function nuclearHtmlFix(): Plugin {
  return {
    name: "nuclear-html-fix",
    transformIndexHtml: {
      order: "post",
      handler(html: string): string {
        let result = html;

        // 1. Remove ALL modulepreload link tags (they trigger early execution)
        result = result.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, "");

        // 2. Extract the module script from wherever Vite put it
        const scriptMatch = result.match(/<script\s+type="module"[^>]*><\/script>/);
        if (scriptMatch) {
          const scriptTag = scriptMatch[0];
          // Remove it from current location
          result = result.replace(scriptTag, "");
          // Place it at the very end of body
          result = result.replace("</body>", `  ${scriptTag}\n  </body>`);
        }

        // 3. Clean up extra blank lines
        result = result.replace(/\n\s*\n\s*\n/g, "\n\n");

        return result;
      },
    },
  };
}

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react(), nuclearHtmlFix()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify("22.7.0"),
  },
  build: {
    sourcemap: false,
    target: "es2017",
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: false,
    // Disable modulePreload entirely - prevents early script execution
    modulePreload: false,
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
    include: ["react", "react-dom", "@supabase/supabase-js", "lucide-react"],
  },
}));
