// Build: 2026-03-30 04:06:02 UTC
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "2.0.0"),
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
          "ui-vendor":       ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          "chart-vendor":    ["recharts"],
          "xlsx-vendor":     ["xlsx"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  envPrefix: ["VITE_"],
}));
