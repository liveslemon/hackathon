import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "./mock-supabase";

test.describe("Protected Route Authentication Guards", () => {
  test.beforeEach(async ({ page }) => {
    // Setup anonymous / logged out user mocks
    await setupSupabaseMocks(page, null);
  });

  const protectedRoutes = [
    "/dashboard",
    "/dashboard/student",
    "/dashboard/employer",
    "/dashboard/admin",
    "/onboarding",
    "/my-internships",
    "/profile",
  ];

  for (const route of protectedRoutes) {
    test(`logged-out access to ${route} redirects to login`, async ({ page }) => {
      await page.goto(route);

      // Verify page redirects away from protected route to a login or landing page
      await expect(page).not.toHaveURL(new RegExp(`${route}$`));
      const currentUrl = page.url();
      const isLoginOrRoot =
        currentUrl.includes("/login") || currentUrl.endsWith("/") || currentUrl.includes("redirected");
      expect(isLoginOrRoot).toBe(true);
    });
  }
});
