import { describe, expect, it } from "vitest";
import {
  getRequiredRoleForRoute,
  isAllowedRouteForRole,
} from "@/lib/role-guard";
import { loginPathFor, safeNextPathForRole } from "@/lib/post-login";

describe("Proxy Route Matrix Authorization", () => {
  const routes = [
    // Public routes
    { path: "/", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/login/student", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/login/employer", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/login/admin", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/internships/abc", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/companies/xyz", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/onboarding", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },
    { path: "/api/auth/logout", expectedRole: "public", allowedRoles: ["student", "employer", "admin", null] },

    // Student routes
    { path: "/dashboard/student", expectedRole: "student", allowedRoles: ["student", "admin"] },
    { path: "/dashboard/student/cv", expectedRole: "student", allowedRoles: ["student", "admin"] },
    { path: "/dashboard/student/logbook", expectedRole: "student", allowedRoles: ["student", "admin"] },
    { path: "/my-internships", expectedRole: "student", allowedRoles: ["student", "admin"] },
    { path: "/profile", expectedRole: "student", allowedRoles: ["student", "admin"] },
    { path: "/api/cv/upload", expectedRole: "student", allowedRoles: ["student", "admin"] },
    { path: "/api/logbook/student", expectedRole: "student", allowedRoles: ["student", "admin"] },

    // Employer routes
    { path: "/dashboard/employer", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/dashboard/employer/internships", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/dashboard/employer/logbook", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/dashboard/post", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/profile/student-id", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/api/reports/logbook", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/api/internships/post", expectedRole: "employer", allowedRoles: ["employer", "admin"] },
    { path: "/api/logbook/employer", expectedRole: "employer", allowedRoles: ["employer", "admin"] },

    // Admin routes
    { path: "/dashboard/admin", expectedRole: "admin", allowedRoles: ["admin"] },
    { path: "/admin", expectedRole: "admin", allowedRoles: ["admin"] },
    { path: "/dashboard/analytics", expectedRole: "admin", allowedRoles: ["admin"] },
    { path: "/api/audit/target-id", expectedRole: "admin", allowedRoles: ["admin"] },

    // Authenticated generic routes
    { path: "/dashboard", expectedRole: "authenticated", allowedRoles: ["student", "employer", "admin"] },
    { path: "/api/onboarding/status", expectedRole: "authenticated", allowedRoles: ["student", "employer", "admin"] },
    { path: "/api/onboarding/complete", expectedRole: "authenticated", allowedRoles: ["student", "employer", "admin"] },
    { path: "/api/applications", expectedRole: "authenticated", allowedRoles: ["student", "employer", "admin"] },
    { path: "/api/messages/start", expectedRole: "authenticated", allowedRoles: ["student", "employer", "admin"] },
  ];

  for (const { path, expectedRole, allowedRoles } of routes) {
    it(`evaluates ${path} correctly as ${expectedRole}`, () => {
      expect(getRequiredRoleForRoute(path)).toBe(expectedRole);

      // Student check
      const studentAllowed = allowedRoles.includes("student");
      expect(isAllowedRouteForRole(path, "student", false)).toBe(studentAllowed);

      // Employer check
      const employerAllowed = allowedRoles.includes("employer");
      expect(isAllowedRouteForRole(path, "employer", false)).toBe(employerAllowed);

      // Admin check
      const adminAllowed = allowedRoles.includes("admin");
      expect(isAllowedRouteForRole(path, "admin", true)).toBe(adminAllowed);

      // Unauthenticated check
      const unauthAllowed = allowedRoles.includes(null);
      expect(isAllowedRouteForRole(path, null, false)).toBe(unauthAllowed);
    });
  }

  it("ensures unauthenticated visitors to protected paths are directed to correct login", () => {
    expect(loginPathFor("/dashboard/admin")).toBe("/login/admin");
    expect(loginPathFor("/admin")).toBe("/login/admin");
    expect(loginPathFor("/dashboard/employer")).toBe("/login/employer");
    expect(loginPathFor("/dashboard/student")).toBe("/login/student");
    expect(loginPathFor("/my-internships")).toBe("/login/student");
    expect(loginPathFor("/dashboard")).toBe("/login/student");
  });

  it("ensures cross-role redirection safety via safeNextPathForRole", () => {
    // Student trying to go to employer dashboard after login
    expect(safeNextPathForRole("/dashboard/employer", "student", false)).toBeNull();
    // Employer trying to go to admin dashboard
    expect(safeNextPathForRole("/dashboard/admin", "employer", false)).toBeNull();
    // Student going to student dashboard
    expect(safeNextPathForRole("/dashboard/student/cv", "student", false)).toBe("/dashboard/student/cv");
    // Admin going to any dashboard
    expect(safeNextPathForRole("/dashboard/admin", "admin", true)).toBe("/dashboard/admin");
  });
});
