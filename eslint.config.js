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

      // ── React Hooks (v7) — disable React Compiler rules ────────────────
      // react-hooks v7 ships React Compiler rules by default. This codebase
      // does NOT use the React Compiler, so these rules produce false positives.
      // Keep only the two core rules that matter for all React code.
      "react-hooks/rules-of-hooks":              "error",  // KEEP — prevents hook order bugs
      "react-hooks/exhaustive-deps":             "warn",   // KEEP as warning — useful guidance
      "react-hooks/static-components":           "off",    // RC: no inline components (false +ve)
      "react-hooks/use-memo":                    "off",    // RC: memoization enforcement
      "react-hooks/preserve-manual-memoization": "off",    // RC: memoization
      "react-hooks/incompatible-library":        "off",    // RC: library compat
      "react-hooks/immutability":                "off",    // RC: immutable refs/props
      "react-hooks/globals":                     "off",    // RC: global mutations
      "react-hooks/refs":                        "off",    // RC: ref access timing
      "react-hooks/set-state-in-effect":         "off",    // RC: setState in effects (valid pattern)
      "react-hooks/set-state-in-render":         "off",    // RC: setState during render
      "react-hooks/error-boundaries":            "off",    // RC: error boundary patterns
      "react-hooks/purity":                      "off",    // RC: render purity
      "react-hooks/unsupported-syntax":          "off",    // RC: syntax restrictions
      "react-hooks/config":                      "off",    // RC: compiler config
      "react-hooks/gating":                      "off",    // RC: feature gating

      // ── General code quality ────────────────────────────────────────────
      // Allow empty catch blocks — common in ERP for best-effort operations
      // (geolocation, session storage, optional feature detection)
      "no-empty": ["error", { "allowEmptyCatch": true }],
      // Allow short-circuit (x && fn()) and ternary (x ? a : b) expressions
      "@typescript-eslint/no-unused-expressions": ["error", {
        "allowShortCircuit": true,
        "allowTernary":      true,
        "allowTaggedTemplates": true
      }],
      // Use @ts-expect-error instead of @ts-ignore
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore":       false,
        "ts-nocheck":      false
      }],

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
