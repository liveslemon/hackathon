import { Page, Route } from "@playwright/test";

export interface MockUser {
  id: string;
  email: string;
  role: "student" | "employer" | "admin";
  full_name?: string;
  is_admin?: boolean;
}

export const MOCK_STUDENT: MockUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "student@pau.edu.ng",
  role: "student",
  full_name: "Chidiebere Okafor",
  is_admin: false,
};

export const MOCK_EMPLOYER: MockUser = {
  id: "22222222-2222-2222-2222-222222222222",
  email: "recruiter@paystack.com",
  role: "employer",
  full_name: "Adeola Balogun",
  is_admin: false,
};

export const MOCK_ADMIN: MockUser = {
  id: "33333333-3333-3333-3333-333333333333",
  email: "admin@pau.edu.ng",
  role: "admin",
  full_name: "PAU Admin",
  is_admin: true,
};

/**
 * Mocks Supabase Auth and REST API calls for a given logged-in role,
 * or handles anonymous/logged-out state.
 */
export async function setupSupabaseMocks(page: Page, user: MockUser | null) {
  // Mock Auth Session and User
  await page.route("**/auth/v1/**", async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/token") || url.includes("/signup")) {
      const activeUser = user || MOCK_STUDENT;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-access-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
          user: {
            id: activeUser.id,
            email: activeUser.email,
            user_metadata: { role: activeUser.role, full_name: activeUser.full_name },
          },
        }),
      });
    }

    if (url.includes("/user")) {
      if (!user) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Invalid session", error: "Unauthorized" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          user_metadata: { role: user.role, full_name: user.full_name },
        }),
      });
    }

    if (url.includes("/logout") || (url.includes("/token") && method === "DELETE")) {
      return route.fulfill({ status: 204 });
    }

    return route.fulfill({ status: 200, body: "{}" });
  });

  // Mock Profiles table
  await page.route("**/rest/v1/profiles*", async (route: Route) => {
    if (!user) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name || "Test User",
      role: user.role,
      is_admin: user.is_admin || false,
      course: "Computer Science",
      level: "300",
      cv_url: "https://example.com/test-cv.pdf",
      cv_text: "Experienced student in React and Python",
      company_name: user.role === "employer" ? "Paystack" : null,
      company_description: "Modern payments for Africa",
      company_website: "https://paystack.com",
    };

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([profileData]),
    });
  });

  // Mock Internships table
  await page.route("**/rest/v1/internships*", async (route: Route) => {
    const internships = [
      {
        id: "int-101",
        role: "Software Engineering Intern",
        company: "Paystack",
        category: "technology",
        description: "Join our core payments engineering team in Lagos.",
        requirements: "React, TypeScript, Node.js",
        employer_id: MOCK_EMPLOYER.id,
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "int-102",
        role: "Data Analyst Intern",
        company: "Flutterwave",
        category: "technology",
        description: "Analyze transaction data and build insights.",
        requirements: "SQL, Python, PowerBI",
        employer_id: MOCK_EMPLOYER.id,
        status: "active",
        created_at: new Date().toISOString(),
      },
    ];

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(internships),
    });
  });

  // Mock Applied Internships
  await page.route("**/rest/v1/applied_internships*", async (route: Route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "app-201",
          internship_id: "int-101",
          user_id: user?.id || MOCK_STUDENT.id,
          status: "pending",
          cover_letter: "I am passionate about fintech and software engineering.",
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "app-201",
          internship_id: "int-101",
          user_id: user?.id || MOCK_STUDENT.id,
          status: "pending",
          cover_letter: "I am passionate about fintech and software engineering.",
          internships: {
            id: "int-101",
            role: "Software Engineering Intern",
            company: "Paystack",
          },
        },
      ]),
    });
  });

  // Mock Logbook Entries & Placements
  await page.route("**/rest/v1/logbook_entries*", async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "log-1",
          placement_id: "plc-1",
          student_id: user?.id || MOCK_STUDENT.id,
          week_number: 1,
          date: new Date().toISOString().split("T")[0],
          activity_description: "Configured local environment and initialized Next.js project.",
          status: "approved",
          supervisor_feedback: "Excellent start to your SIWES program.",
        },
      ]),
    });
  });

  await page.route("**/rest/v1/internship_placements*", async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "plc-1",
          student_id: user?.id || MOCK_STUDENT.id,
          employer_id: MOCK_EMPLOYER.id,
          company_name: "Paystack",
          role: "Software Engineering Intern",
          status: "active",
          start_date: "2026-06-01",
          end_date: "2026-12-01",
        },
      ]),
    });
  });
}
