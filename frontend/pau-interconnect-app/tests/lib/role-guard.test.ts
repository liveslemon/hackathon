import { describe, expect, it } from "vitest";
import {
  getDashboardPathForRole,
  getRequiredRoleForRoute,
  isAllowedRouteForRole,
} from "@/lib/role-guard";

describe("getDashboardPathForRole", () => {
  it("returns the appropriate dashboard for each role", () => {
    expect(getDashboardPathForRole("student")).toBe("/dashboard/student");
    expect(getDashboardPathForRole("employer")).toBe("/dashboard/employer");
    expect(getDashboardPathForRole("admin")).toBe("/dashboard/admin");
    expect(getDashboardPathForRole("student", true)).toBe("/dashboard/admin");
    expect(getDashboardPathForRole(null)).toBe("/dashboard");
  });
});

describe("getRequiredRoleForRoute", () => {
  it("classifies public routes properly", () => {
    expect(getRequiredRoleForRoute("/")).toBe("public");
    expect(getRequiredRoleForRoute("/login/student")).toBe("public");
    expect(getRequiredRoleForRoute("/login/employer")).toBe("public");
    expect(getRequiredRoleForRoute("/login/admin")).toBe("public");
    expect(getRequiredRoleForRoute("/companies/123")).toBe("public");
    expect(getRequiredRoleForRoute("/internships/456")).toBe("public");
    expect(getRequiredRoleForRoute("/onboarding")).toBe("public");
    expect(getRequiredRoleForRoute("/api/auth/logout")).toBe("public");
  });

  it("classifies student routes properly", () => {
    expect(getRequiredRoleForRoute("/dashboard/student")).toBe("student");
    expect(getRequiredRoleForRoute("/dashboard/student/cv")).toBe("student");
    expect(getRequiredRoleForRoute("/dashboard/student/logbook")).toBe("student");
    expect(getRequiredRoleForRoute("/my-internships")).toBe("student");
    expect(getRequiredRoleForRoute("/profile")).toBe("student");
    expect(getRequiredRoleForRoute("/cv/view")).toBe("student");
    expect(getRequiredRoleForRoute("/api/cv/upload")).toBe("student");
    expect(getRequiredRoleForRoute("/api/logbook/student")).toBe("student");
    expect(getRequiredRoleForRoute("/api/logbook/entry")).toBe("student");
  });

  it("classifies employer routes properly", () => {
    expect(getRequiredRoleForRoute("/dashboard/employer")).toBe("employer");
    expect(getRequiredRoleForRoute("/dashboard/employer/internships")).toBe("employer");
    expect(getRequiredRoleForRoute("/dashboard/employer/logbook")).toBe("employer");
    expect(getRequiredRoleForRoute("/dashboard/post")).toBe("employer");
    expect(getRequiredRoleForRoute("/profile/student-uuid")).toBe("employer");
    expect(getRequiredRoleForRoute("/api/reports/logbook")).toBe("employer");
    expect(getRequiredRoleForRoute("/api/internships/post")).toBe("employer");
    expect(getRequiredRoleForRoute("/api/logbook/employer")).toBe("employer");
  });

  it("classifies admin routes properly", () => {
    expect(getRequiredRoleForRoute("/admin")).toBe("admin");
    expect(getRequiredRoleForRoute("/admin/stats")).toBe("admin");
    expect(getRequiredRoleForRoute("/dashboard/admin")).toBe("admin");
    expect(getRequiredRoleForRoute("/dashboard/analytics")).toBe("admin");
    expect(getRequiredRoleForRoute("/api/audit/123")).toBe("admin");
  });

  it("classifies general authenticated routes", () => {
    expect(getRequiredRoleForRoute("/dashboard")).toBe("authenticated");
    expect(getRequiredRoleForRoute("/api/onboarding/status")).toBe("authenticated");
    expect(getRequiredRoleForRoute("/api/onboarding/complete")).toBe("authenticated");
    expect(getRequiredRoleForRoute("/api/applications")).toBe("authenticated");
    expect(getRequiredRoleForRoute("/api/messages/start")).toBe("authenticated");
  });
});

describe("isAllowedRouteForRole", () => {
  it("allows public routes to unauthenticated and any role", () => {
    expect(isAllowedRouteForRole("/", null)).toBe(true);
    expect(isAllowedRouteForRole("/login/student", null)).toBe(true);
    expect(isAllowedRouteForRole("/onboarding", "student")).toBe(true);
  });

  it("allows students to access student routes, blocks them from employer/admin routes", () => {
    expect(isAllowedRouteForRole("/dashboard/student", "student")).toBe(true);
    expect(isAllowedRouteForRole("/my-internships", "student")).toBe(true);
    expect(isAllowedRouteForRole("/dashboard/employer", "student")).toBe(false);
    expect(isAllowedRouteForRole("/dashboard/admin", "student")).toBe(false);
    expect(isAllowedRouteForRole("/admin", "student")).toBe(false);
    expect(isAllowedRouteForRole("/api/audit/123", "student")).toBe(false);
  });

  it("allows employers to access employer routes, blocks them from student/admin routes", () => {
    expect(isAllowedRouteForRole("/dashboard/employer", "employer")).toBe(true);
    expect(isAllowedRouteForRole("/dashboard/post", "employer")).toBe(true);
    expect(isAllowedRouteForRole("/dashboard/student", "employer")).toBe(false);
    expect(isAllowedRouteForRole("/my-internships", "employer")).toBe(false);
    expect(isAllowedRouteForRole("/dashboard/admin", "employer")).toBe(false);
    expect(isAllowedRouteForRole("/admin", "employer")).toBe(false);
  });

  it("allows admins access to everything", () => {
    expect(isAllowedRouteForRole("/dashboard/admin", "admin", true)).toBe(true);
    expect(isAllowedRouteForRole("/admin", "admin", true)).toBe(true);
    expect(isAllowedRouteForRole("/dashboard/employer", "admin", true)).toBe(true);
    expect(isAllowedRouteForRole("/dashboard/student", "admin", true)).toBe(true);
    expect(isAllowedRouteForRole("/api/audit/123", "admin", true)).toBe(true);
  });

  it("blocks unauthenticated users from all non-public routes", () => {
    expect(isAllowedRouteForRole("/dashboard", null)).toBe(false);
    expect(isAllowedRouteForRole("/dashboard/student", null)).toBe(false);
    expect(isAllowedRouteForRole("/dashboard/employer", null)).toBe(false);
    expect(isAllowedRouteForRole("/dashboard/admin", null)).toBe(false);
    expect(isAllowedRouteForRole("/api/applications", null)).toBe(false);
  });
});
