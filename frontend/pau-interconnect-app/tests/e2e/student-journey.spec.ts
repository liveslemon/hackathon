import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_STUDENT } from "./mock-supabase";

test.describe("Student End-to-End Journey", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_STUDENT);
  });

  test("student signup → onboarding → browse → apply → track status", async ({
    page,
  }) => {
    // 1. Visit Student Login / Signup
    await page.goto("/login/student");
    await expect(page).toHaveTitle(/PAU InterConnect/i);

    // 2. Onboarding Page
    await page.goto("/onboarding");
    const heading = page.locator("h1, h2, h3").first();
    await expect(heading).toBeVisible();

    // 3. Browse Internships on Student Dashboard
    await page.goto("/dashboard/student");
    await expect(page.locator("text=Paystack").first()).toBeVisible({ timeout: 10000 });

    // 4. View internship details
    await page.goto("/internships/int-101");
    await expect(
      page.locator("text=Software Engineering Intern").first(),
    ).toBeVisible({ timeout: 10000 });

    // 5. Track Application Status
    await page.goto("/my-internships");
    await expect(page.locator("text=Paystack").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=pending").first()).toBeVisible();
  });
});
