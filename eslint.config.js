import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Supabase dynamic queries and ERP data layers require 'any' extensively
      "@typescript-eslint/no-explicit-any": "off",

      // ── Navigation safety: never use window.location for SPA routing ─────
      // Use navigate() from useNavigate(), or <Link to="..."> instead.
      // Allowed exceptions: ErrorBoundary (class component), NetworkGuard,
      // AuthContext, ipRestriction.ts (all outside React Router context).
      "no-restricted-syntax": [
        "error",
        {
          // window.location.hash = "..."  (hash routing via DOM — wrong in HashRouter)
          "selector": "AssignmentExpression[left.object.object.name='window'][left.object.property.name='location'][left.property.name='hash']",
          "message": "Use navigate() from useNavigate() instead of setting window.location.hash directly. Raw hash assignment bypasses React Router and can cause stale renders."
        },
        {
          // dynamic import("react-router-dom").then(...useNavigate...) — hooks can't be called inside .then()
          "selector": "ImportExpression[source.value='react-router-dom']",
          "message": "Do not dynamically import react-router-dom. Import useNavigate or Link at the top of the file and call navigate() in event handlers."
        },
        {
          // <a href="/#/..."> raw anchor for internal SPA navigation
          "selector": "JSXAttribute[name.name='href'][value.value=/^\\/#\\//]",
          "message": "Use <Link to=\"/path\"> from react-router-dom instead of <a href=\"/#/path\"> for internal navigation. Raw anchors cause full page reloads."
        }
      ],
    },
  },
);
