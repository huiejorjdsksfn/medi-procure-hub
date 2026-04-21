import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function nuclearHtmlFix(): Plugin {
  return {
    name: "nuclear-html-fix",
    transformIndexHtml: {
      order: "post",
      handler(html: string): string {
        let r = html;
        // Remove modulepreload link tags completely
        r = r.replace(/<link[^>]+rel="modulepreload"[^>]*>\s*/g, "");
        // Remove ONLY the standalone crossorigin attribute (not href= or src=)
        r = r.replace(/(\s)crossorigin(\s|>)/g, "$2");
        // Move module script to end of body
        const sm = r.match(/<script\s[^>]*type="module"[^>]*><\/script>/);
        if (sm) {
          r = r.replace(sm[0], "");
          r = r.replace("</body>", `  ${sm[0]}\n  </body>`);
        }
        r = r.replace(/\n\s*\n\s*\n/g, "\n\n");
        return r;
      },
    },
  };
}

export default defineConfig(() => ({
  server: { host: "::", port: 8080, hmr: { overlay: false } },
  plugins: [react(), nuclearHtmlFix()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define: { __APP_VERSION__: JSON.stringify("22.8.0") },
  build: {
    sourcemap: false,
    target: "es2015",
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: false,
    modulePreload: false,
    rollupOptions: {
      onwarn(w, warn) {
        if (w.code === "CIRCULAR_DEPENDENCY" || w.code === "THIS_IS_UNDEFINED") return;
        warn(w);
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
    chunkSizeWarningLimit: 1500,
  },
  envPrefix: ["VITE_"],
}));
