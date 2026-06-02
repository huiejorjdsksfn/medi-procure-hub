import { describe, it, expect } from "vitest";
import { APP_ROUTES, toHashUrl } from "@/components/RouterGuard";

/**
 * Smoke test: refresh-safety for key routes.
 * Ensures that a direct browser refresh on a bare path (/login, /dashboard,
 * /inventory, /suppliers) is convertible to the HashRouter form the SPA
 * shell expects, and that each key route is registered in the app's
 * known-routes manifest. If any of these assertions fail, the build fails
 * before publish — preventing a 404 regression from shipping.
 */
const KEY_ROUTES = ["/login", "/dashboard", "/inventory", "/suppliers"];

describe("refresh-to-hash smoke test", () => {
  it("converts every key bare path to a valid /#/ hash URL", () => {
    for (const path of KEY_ROUTES) {
      const hashed = toHashUrl(path);
      expect(hashed).toBe(`/#${path}`);
      expect(hashed.startsWith("/#/")).toBe(true);
    }
  });

  it("registers each key route (or a known alias) in APP_ROUTES", () => {
    const aliases: Record<string, string> = { "/inventory": "/items" };
    for (const path of KEY_ROUTES) {
      const target = aliases[path] ?? path;
      expect(APP_ROUTES).toContain(target);
    }
  });

  it("is idempotent — already-hashed URLs stay unchanged", () => {
    for (const path of KEY_ROUTES) {
      const once = toHashUrl(path);
      const twice = toHashUrl(once);
      expect(twice).toBe(once);
    }
  });
});