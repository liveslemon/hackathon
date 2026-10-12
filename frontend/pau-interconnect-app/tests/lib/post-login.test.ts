import { describe, expect, it } from "vitest";
import {
  getNextPath,
  loginPathFor,
  safeNextPath,
  safeNextPathForRole,
} from "@/lib/post-login";

describe("safeNextPath", () => {
  it("keeps same-site paths with query strings and deep links", () => {
    expect(safeNextPath("/my-internships")).toBe("/my-internships");
    expect(
      safeNextPath(encodeURIComponent("/dashboard/student/cv?tab=gap")),
    ).toBe("/dashboard/student/cv?tab=gap");
    expect(
      safeNextPath("/dashboard/student/logbook?date=2026-10-12&status=submitted#entry-1"),
    ).toBe("/dashboard/student/logbook?date=2026-10-12&status=submitted#entry-1");
  });

  it("rejects open redirects, backslashes, schemes, and loops", () => {
    for (const bad of [
      "https://evil.com",
      "http://evil.com/path",
      "//evil.com",
      "/\\evil.com",
      "/path\\with\\backslash",
      "javascript:alert(1)",
      "/javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "/login/student",
      "/login/employer",
      "/login/admin",
      "/api/me/export",
      "/auth/v1/callback",
      "/\r\n/evil.com",
      "/\t/evil.com",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad as string)).toBeNull();
    }
  });
});

describe("safeNextPathForRole", () => {
  it("allows matching role paths and restricts mismatched roles", () => {
    expect(
      safeNextPathForRole("/dashboard/student", "student"),
    ).toBe("/dashboard/student");
    expect(
      safeNextPathForRole("/dashboard/employer", "student"),
    ).toBeNull();
    expect(
      safeNextPathForRole("/dashboard/admin", "student"),
    ).toBeNull();
    expect(
      safeNextPathForRole("/admin", "student"),
    ).toBeNull();

    expect(
      safeNextPathForRole("/dashboard/employer/internships", "employer"),
    ).toBe("/dashboard/employer/internships");
    expect(
      safeNextPathForRole("/dashboard/student", "employer"),
    ).toBeNull();
    expect(
      safeNextPathForRole("/my-internships", "employer"),
    ).toBeNull();
    expect(
      safeNextPathForRole("/dashboard/admin", "employer"),
    ).toBeNull();

    // Admins can navigate anywhere valid
    expect(
      safeNextPathForRole("/dashboard/admin", "admin", true),
    ).toBe("/dashboard/admin");
    expect(
      safeNextPathForRole("/dashboard/employer", "admin", true),
    ).toBe("/dashboard/employer");
    expect(
      safeNextPathForRole("/dashboard/student", "admin", true),
    ).toBe("/dashboard/student");
  });
});

describe("loginPathFor", () => {
  it("picks the right login page", () => {
    expect(loginPathFor("/my-internships")).toBe("/login/student");
    expect(loginPathFor("/dashboard/student/logbook")).toBe("/login/student");
    expect(loginPathFor("/profile")).toBe("/login/student");
    expect(loginPathFor("/dashboard/employer/internships/1")).toBe(
      "/login/employer",
    );
    expect(loginPathFor("/dashboard/post")).toBe("/login/employer");
    expect(loginPathFor("/profile/abc")).toBe("/login/employer");
    expect(loginPathFor("/dashboard/admin")).toBe("/login/admin");
    expect(loginPathFor("/admin")).toBe("/login/admin");
    expect(loginPathFor("/admin/manage")).toBe("/login/admin");
  });

  it("leaves public pages alone", () => {
    for (const p of [
      "/",
      "/login/student",
      "/login/employer",
      "/login/admin",
      "/internships/123",
      "/companies/1",
      "/onboarding",
    ]) {
      expect(loginPathFor(p)).toBeNull();
    }
  });
});

