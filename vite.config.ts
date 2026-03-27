import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "logo.png", "icon.png"],
      manifest: {
        name: "EL5 MediProcure — Hospital ERP",
        short_name: "MediProcure",
        description: "Embu Level 5 Hospital Procurement & ERP Management System",
        theme_color: "#0a2558",
        background_color: "#0a2558",
        display: "standalone",
        orientation: "any",
        start_url: "/dashboard",
        scope: "/",
        lang: "en-KE",
        categories: ["business", "productivity", "medical"],
        icons: [
          { src: "/favicon.png",  sizes: "48x48",   type: "image/png", purpose: "any maskable" },
          { src: "/logo.png",     sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon.png",     sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        shortcuts: [
          { name: "Requisitions",    url: "/requisitions",    description: "Open Requisitions" },
          { name: "Purchase Orders", url: "/purchase-orders", description: "Open Purchase Orders" },
          { name: "Dashboard",       url: "/dashboard",       description: "ERP Dashboard" },
          { name: "Reports",         url: "/reports",         description: "Analytics & Reports" },
        ],
        screenshots: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/yvjfehnzbzjliizjvuhq\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
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
