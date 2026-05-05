import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define: { __APP_VERSION__: JSON.stringify("6.1.0") },
  root: path.resolve(__dirname, "apps/admin"),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "web-admin"),
    emptyOutDir: true,
    minify: false,
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "apps/admin/index.html"),
      onwarn(w, warn) { if (w.code === "CIRCULAR_DEPENDENCY") return; warn(w); },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@radix-ui") || id.includes("lucide-react")) return "ui-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("xlsx")) return "xlsx-vendor";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 3000,
  },
  envPrefix: ["VITE_"],
});
