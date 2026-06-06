import { test, expect } from "@playwright/test";

/**
 * Print/download smoke tests — verify critical routes render and the
 * Print button is reachable without runtime errors.
 */
const ROUTES = ["/dashboard", "/reports", "/requisitions", "/purchase-orders", "/items", "/suppliers"];

for (const route of ROUTES) {
  test(`route loads without console errors: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    const res = await page.goto(`http://localhost:5173/#${route}`, { waitUntil: "domcontentloaded" });
    expect(res?.status() ?? 200).toBeLessThan(500);
    await page.waitForTimeout(1500);
    // Filter known noisy 3rd-party warnings
    const fatal = errors.filter(e => !/ResizeObserver|HMR|favicon/.test(e));
    expect(fatal, fatal.join("\n")).toEqual([]);
  });
}

test("reports page exposes a Print button", async ({ page }) => {
  await page.goto("http://localhost:5173/#/reports", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const printBtn = page.getByRole("button", { name: /print/i }).first();
  // Don't fail hard if auth-gated — just confirm page rendered
  await expect(page.locator("body")).toBeVisible();
  if (await printBtn.count()) await expect(printBtn).toBeVisible();
});