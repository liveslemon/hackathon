import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_STUDENT } from "../mock-supabase";

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES_TO_TEST = [
  { path: "/dashboard/student", name: "dashboard-student", waitSelector: "h1" },
  { path: "/internships/int-101", name: "internship-detail", waitSelector: "h1, h2" },
  { path: "/my-internships", name: "my-internships", waitSelector: "h1, h2" },
  { path: "/dashboard/student/cv", name: "cv-dashboard", waitSelector: "h1, h2" },
  { path: "/dashboard/student/skills", name: "skills-overview", waitSelector: "h1, h2" },
  { path: "/dashboard/student/logbook", name: "logbook-client", waitSelector: "h1, h2" },
  { path: "/dashboard/student/logbook/print", name: "logbook-print", waitSelector: "h1" },
  { path: "/dashboard/student/settings", name: "settings", waitSelector: "h1, h2" },
  { path: "/profile", name: "profile-edit", waitSelector: "h1, h2" },
  { path: "/profile/11111111-1111-1111-1111-111111111111", name: "student-public-profile", waitSelector: "h1" },
  { path: "/companies/22222222-2222-2222-2222-222222222222", name: "company-profile", waitSelector: "h1, h2" },
  { path: "/cv/view?name=Sample_CV&url=https%3A%2F%2Fexample.com%2Fsample.pdf", name: "cv-view", waitSelector: "h1, h2, a" },
];

test.describe("Student Experience - Visual Regression & Responsive Audit", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} viewport (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await setupSupabaseMocks(page, MOCK_STUDENT);
      });

      for (const target of PAGES_TO_TEST) {
        test(`verifies ${target.name} renders cleanly in light and dark mode`, async ({ page }) => {
          // 1. Light Mode Verification
          await page.goto(target.path);
          await page.evaluate(() => {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
          });
          const element = page.locator(target.waitSelector).first();
          await expect(element).toBeVisible({ timeout: 10000 });

          // Take screenshot (stored in /tmp to ensure images are not committed)
          await page.screenshot({
            path: `/tmp/screenshots/${target.name}-${vp.name}-light.png`,
            fullPage: false,
          });

          // 2. Dark Mode Verification
          await page.evaluate(() => {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
          });
          await expect(element).toBeVisible({ timeout: 10000 });

          await page.screenshot({
            path: `/tmp/screenshots/${target.name}-${vp.name}-dark.png`,
            fullPage: false,
          });

          // 3. Check for horizontal overflow (no scroll on x-axis)
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow sub-pixel rounding
        });
      }
    });
  }
});
