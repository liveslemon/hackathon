import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  setupSupabaseMocks,
  MOCK_STUDENT,
  MOCK_EMPLOYER,
  MOCK_ADMIN,
} from "./mock-supabase";

test.describe("Dark Mode Accessibility & Contrast Audit (axe-core)", () => {
  test.use({ colorScheme: "dark" });

  test.beforeEach(async ({ page }) => {
    // Ensure dark theme is forced in html class
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
  });

  const publicRoutes = [
    { name: "Landing Page", path: "/" },
    { name: "Student Login", path: "/login/student" },
    { name: "Employer Login", path: "/login/employer" },
    { name: "Admin Login", path: "/login/admin" },
    { name: "Forgot Password", path: "/login/forgot-password" },
    { name: "Reset Password", path: "/login/reset-password" },
  ];

  for (const route of publicRoutes) {
    test(`meets >= 4.5:1 text contrast on public route: ${route.name} (${route.path})`, async ({
      page,
    }) => {
      await setupSupabaseMocks(page, null);
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.waitForTimeout(600);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test("meets >= 4.5:1 text contrast on /onboarding as student", async ({
    page,
  }) => {
    await setupSupabaseMocks(page, MOCK_STUDENT);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(600);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("meets >= 4.5:1 text contrast on /dashboard/admin as admin", async ({
    page,
  }) => {
    await setupSupabaseMocks(page, MOCK_ADMIN);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/dashboard/admin", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(600);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("meets >= 4.5:1 text contrast on /dashboard/student as student", async ({
    page,
  }) => {
    await setupSupabaseMocks(page, MOCK_STUDENT);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/dashboard/student", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(600);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("meets >= 4.5:1 text contrast on /dashboard/employer as employer", async ({
    page,
  }) => {
    await setupSupabaseMocks(page, MOCK_EMPLOYER);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/dashboard/employer", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(600);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
