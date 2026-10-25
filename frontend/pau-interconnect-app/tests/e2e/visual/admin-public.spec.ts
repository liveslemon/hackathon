import { test, expect } from "@playwright/test";
import {
  setupSupabaseMocks,
  MOCK_STUDENT,
  MOCK_ADMIN,
} from "../mock-supabase";

test.describe("Visual Regression & Responsive Verification - Admin & Public", () => {
  const pagesToTest = [
    { name: "landing", path: "/", role: null },
    { name: "login-student", path: "/login/student", role: null },
    { name: "login-employer", path: "/login/employer", role: null },
    { name: "login-admin", path: "/login/admin", role: null },
    { name: "forgot-password", path: "/login/forgot-password", role: null },
    { name: "reset-password", path: "/login/reset-password", role: null },
    { name: "admin-entry", path: "/admin", role: null },
    { name: "onboarding", path: "/onboarding", role: MOCK_STUDENT },
    { name: "dashboard-admin", path: "/dashboard/admin", role: MOCK_ADMIN },
  ];

  const viewports = [
    { name: "mobile-360", width: 360, height: 740 },
    { name: "desktop-1440", width: 1440, height: 900 },
  ];

  for (const pageItem of pagesToTest) {
    for (const vp of viewports) {
      for (const theme of ["light", "dark"] as const) {
        test(`screenshot ${pageItem.name} at ${vp.name} in ${theme} mode`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await setupSupabaseMocks(page, pageItem.role);

          await page.addInitScript((mode) => {
            localStorage.setItem("theme", mode);
            if (mode === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }, theme);

          await page.goto(pageItem.path, { waitUntil: "networkidle" });

          if (theme === "dark") {
            await page.evaluate(() =>
              document.documentElement.classList.add("dark")
            );
          } else {
            await page.evaluate(() =>
              document.documentElement.classList.remove("dark")
            );
          }

          // Capture screenshot into .screenshots temporary directory (gitignored)
          await page.screenshot({
            path: `.screenshots/${pageItem.name}-${vp.name}-${theme}.png`,
            fullPage: false,
          });

          // Assert document root rendered without crash
          const body = page.locator("body");
          await expect(body).toBeVisible();
        });
      }
    }
  }
});
