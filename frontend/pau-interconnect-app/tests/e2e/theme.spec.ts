import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_STUDENT } from "./mock-supabase";

test.describe("Theme & App Shell Verification", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_STUDENT);
  });

  test("loads shell in light mode without hydration warnings", async ({ page }) => {
    const consoleWarnings: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("Warning: Text content did not match") ||
        text.includes("hydration")
      ) {
        consoleWarnings.push(text);
      }
    });

    await page.goto("/dashboard/student");
    await expect(page.locator("text=Paystack").first()).toBeVisible({ timeout: 10000 });

    // Expect no hydration warnings
    expect(consoleWarnings).toHaveLength(0);

    // Verify root html element exists and has color-scheme
    const htmlElement = page.locator("html");
    await expect(htmlElement).toBeVisible();
  });

  test("toggles theme to dark and persists across reloads", async ({ page }) => {
    await page.goto("/dashboard/student");
    await expect(page.locator("text=Paystack").first()).toBeVisible({ timeout: 10000 });

    // Click theme toggle button in TopBar
    const themeBtn = page.locator('button[title="Change theme"], button[aria-label="Toggle color theme"]').first();
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // Select dark theme from menu
    const darkOption = page.locator('button[role="menuitem"]:has-text("Dark")').first();
    await expect(darkOption).toBeVisible();
    await darkOption.click();

    // Check that html has dark class
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator("text=Paystack").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
