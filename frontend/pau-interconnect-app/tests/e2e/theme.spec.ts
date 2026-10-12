import { test, expect, type Page } from "@playwright/test";

// Protected routes are redirected to login by the server-side proxy, which the browser-side
// Supabase mock can't intercept, so these checks run on public pages. The theme logic
// (next-themes + tokens) is shared by every page.
const PUBLIC_PAGES = ["/", "/login/student", "/login/employer"];

function collectHydrationWarnings(page: Page) {
  const warnings: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/hydrat|did not match/i.test(text)) warnings.push(text);
  });
  return warnings;
}

test.describe("Theme", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`follows the system ${scheme} theme without hydration warnings`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const warnings = collectHydrationWarnings(page);

      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        if (scheme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
        else await expect(page.locator("html")).not.toHaveClass(/dark/);
      }
      expect(warnings).toEqual([]);
    });
  }

  test("an explicit choice overrides the system and persists across reloads", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login/student");
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("the page background actually changes in dark mode", async ({ page }) => {
    const bg = async () =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login/student");
    const light = await bg();

    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    const dark = await bg();

    expect(dark).not.toEqual(light);
  });
});
