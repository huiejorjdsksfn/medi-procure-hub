import { test, expect } from "@playwright/test";

/**
 * Refresh-smoke: load each route directly (simulating a hard browser refresh)
 * and assert no 404 response, no blank screen, and that the app shell mounted.
 *
 * The app uses HashRouter, so a direct hit on /login is served by index.html
 * and the inline redirect script converts the URL to /#/login. We assert on
 * both the network response and the final rendered DOM.
 */
const ROUTES = ["/login", "/dashboard", "/items", "/suppliers"];

for (const route of ROUTES) {
  test(`refresh ${route} — no 404, no blank screen`, async ({ page }) => {
    const failed: { url: string; status: number }[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (res.status() === 404 && !url.includes("/rest/v1/") && !url.includes("/auth/v1/")) {
        failed.push({ url, status: res.status() });
      }
    });

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, `no response for ${route}`).not.toBeNull();
    expect(response!.status(), `HTTP ${response!.status()} on ${route}`).toBeLessThan(400);

    // App shell must mount — #root has children
    await page.waitForFunction(
      () => !!document.getElementById("root")?.children.length,
      null,
      { timeout: 15_000 },
    );

    // No fatal blank screen
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length, `blank screen on ${route}`).toBeGreaterThan(0);

    // No asset 404s
    expect(failed, `asset 404s on ${route}: ${JSON.stringify(failed)}`).toHaveLength(0);
  });
}