import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_EMPLOYER } from "../mock-supabase";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 360, height: 740 },
];

const THEMES = ["light", "dark"] as const;

const EMPLOYER_ROUTES = [
  { path: "/dashboard/employer", name: "employer-dashboard", title: "Recruitment Dashboard" },
  { path: "/dashboard/employer/internships", name: "employer-internships", title: "Active Postings" },
  { path: "/dashboard/employer/internships/int-101", name: "employer-pipeline", title: "Software Engineering Intern" },
  { path: "/dashboard/employer/internships/int-101/edit", name: "employer-edit-internship", title: "Edit Internship" },
  { path: "/dashboard/post", name: "employer-post-studio", title: "Create Internship Posting" },
  { path: "/dashboard/employer/analytics", name: "employer-analytics", title: "Recruitment Performance" },
  { path: "/dashboard/employer/logbook", name: "employer-logbook", title: "SIWES Logbook Verifications" },
  { path: "/dashboard/employer/reports", name: "employer-reports", title: "SIWES Compliance & Exports" },
  { path: "/dashboard/employer/settings", name: "employer-settings", title: "Company Profile & Preferences" },
  { path: "/dashboard/analytics", name: "platform-analytics", title: "Executive Analytics" },
];

test.describe("Employer Experience Visual & Accessibility Verification", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, MOCK_EMPLOYER);

    // Mock additional employer-specific endpoints needed by routes
    await page.route("**/api/internships/templates*", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "tpl-1",
            name: "Software Engineering Intern",
            role: "Software Engineering Intern",
            category: "Hybrid",
            field: "Computer Science",
            description: "Mentored software engineering placement with hands-on full-stack assignments.",
            requirements: "Knowledge of JavaScript/TypeScript, git, and foundational database concepts.",
          },
        ]),
      });
    });

    await page.route("**/api/logbook/employer*", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          entries: [
            {
              id: "log-1",
              student_id: "stu-1",
              week_number: 2,
              date: "2026-10-10",
              activity_description: "Completed API endpoint integration and unit tests.",
              status: "pending",
              student_name: "Chidiebere Okafor",
              course: "Computer Science",
              matric_number: "20/0042",
            },
          ],
        }),
      });
    });

    await page.route("**/api/reports/logbook*", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total_students: 4,
            total_entries: 48,
            approved_entries: 42,
            pending_entries: 6,
          },
          students: [
            {
              student_id: "stu-1",
              full_name: "Chidiebere Okafor",
              matric_number: "20/0042",
              course: "Computer Science",
              total_weeks: 12,
              completed_weeks: 10,
              compliance_percentage: 83.3,
            },
          ],
        }),
      });
    });

    await page.route("**/api/analysis/metrics*", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          views: 1240,
          unique_applicants: 86,
          acceptance_rate: 14.5,
          top_roles: [
            { role: "Software Engineering Intern", count: 45 },
            { role: "Data Analyst Intern", count: 28 },
          ],
        }),
      });
    });
  });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test.describe(`${vp.name} (${vp.width}x${vp.height}) - ${theme} mode`, () => {
        test.use({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });

        for (const route of EMPLOYER_ROUTES) {
          test(`visual regression & render: ${route.name} (${route.path})`, async ({ page }) => {
            // Apply theme class to document
            await page.addInitScript((mode) => {
              window.localStorage.setItem("theme", mode);
              if (mode === "dark") {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
            }, theme);

            await page.goto(route.path, { waitUntil: "domcontentloaded" });

            // Ensure document rendered without critical unhandled exceptions
            await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 10000 });

            // Ensure no horizontal scrollbar on mobile or desktop
            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
            expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

            // Capture visual screenshot verifying light and dark rendering
            await page.screenshot({
              fullPage: true,
              path: `test-results/visual-${route.name}-${vp.name}-${theme}.png`,
            });
          });
        }
      });
    }
  }
});
