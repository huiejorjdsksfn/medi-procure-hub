/**
 * ProcurBosse v22.5 — Vite Config
 * NUCLEAR: custom plugin moves script to end of body after build
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 */
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Plugin: move module scripts from <head> to end of <body>
function moveScriptToBody(): Plugin {
  return {
    name: "move-script-to-body",
    transformIndexHtml: {
      order: "post",
      handler(html: string): string {
        // Extract all module script tags from head
        const scriptRegex = /<script\s+type="module"[^>]*><\/script>/g;
        const scripts: string[] = [];
        let match;
        while ((match = scriptRegex.exec(html)) !== null) {
          scripts.push(match[0]);
        }
        if (scripts.length === 0) return html;
        // Remove scripts from wherever they are
        let result = html;
        for (const s of scripts) {
          result = result.replace(s, "");
        }
        // Inject before </body>
        result = result.replace("</body>", scripts.join("\n  ") + "\n  </body>");
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
  plugins: [react(), moveScriptToBody()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify("22.5.0"),
  },
  build: {
    sourcemap: false,
    target: "es2017",
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: false,
    modulePreload: { polyfill: false },
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
