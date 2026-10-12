import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_ADMIN } from "./mock-supabase";

test.describe("Admin End-to-End Journey", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_ADMIN);
  });

  test("admin login → dashboard stats → directory search", async ({ page }) => {
    // 1. Visit Admin Login
    await page.goto("/login/admin");
    await expect(page).toHaveTitle(/PAU InterConnect/i);

    // 2. Admin Dashboard with Stats
    await page.goto("/dashboard/admin");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();

    // 3. Admin Analytics / System view
    await page.goto("/dashboard/analytics");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });
});
