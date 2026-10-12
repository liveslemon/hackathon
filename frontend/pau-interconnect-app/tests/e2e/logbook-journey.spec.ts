import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_STUDENT, MOCK_EMPLOYER } from "./mock-supabase";

test.describe("SIWES Logbook End-to-End Journey", () => {
  test("student logbook entry → print logbook", async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_STUDENT);

    // 1. Visit Student Logbook
    await page.goto("/dashboard/student/logbook");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();

    // Verify activity entry exists
    await expect(
      page.locator("text=Configured local environment").first(),
    ).toBeVisible({ timeout: 10000 });

    // 2. Visit Print View
    await page.goto("/dashboard/student/logbook/print");
    await expect(page.locator("text=SIWES").first()).toBeVisible({ timeout: 10000 });
  });

  test("employer review logbook", async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_EMPLOYER);

    // Visit Employer Logbook Review
    await page.goto("/dashboard/employer/logbook");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });
});
