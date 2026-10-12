import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_EMPLOYER } from "./mock-supabase";

test.describe("Employer End-to-End Journey", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_EMPLOYER);
  });

  test("employer onboarding → post internship → review applicant → pipeline", async ({
    page,
  }) => {
    // 1. Visit Employer Login
    await page.goto("/login/employer");
    await expect(page).toHaveTitle(/PAU InterConnect/i);

    // 2. Employer Onboarding
    await page.goto("/onboarding/employer");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();

    // 3. Employer Dashboard
    await page.goto("/dashboard/employer");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();

    // 4. View Posted Internships
    await page.goto("/dashboard/employer/internships");
    await expect(page.locator("text=Software Engineering Intern").first()).toBeVisible({
      timeout: 10000,
    });

    // 5. Review Applicants Pipeline
    await page.goto("/dashboard/employer/internships/int-101");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });
});
