import { describe, expect, it } from "vitest";
import { loginPathFor, safeNextPath } from "@/lib/post-login";

describe("safeNextPath", () => {
  it("keeps same-site paths with query strings", () => {
    expect(safeNextPath("/my-internships")).toBe("/my-internships");
    expect(safeNextPath(encodeURIComponent("/dashboard/student/cv?tab=gap"))).toBe("/dashboard/student/cv?tab=gap");
  });
  it("rejects open redirects and loops", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/login/student", "/api/me/export", "", null]) {
      expect(safeNextPath(bad as string)).toBeNull();
    }
  });
});

describe("loginPathFor", () => {
  it("picks the right login page", () => {
    expect(loginPathFor("/my-internships")).toBe("/login/student");
    expect(loginPathFor("/dashboard/student/logbook")).toBe("/login/student");
    expect(loginPathFor("/profile")).toBe("/login/student");
    expect(loginPathFor("/dashboard/employer/internships/1")).toBe("/login/employer");
    expect(loginPathFor("/profile/abc")).toBe("/login/employer");
    expect(loginPathFor("/dashboard/admin")).toBe("/login/admin");
  });
  it("leaves public pages alone", () => {
    for (const p of ["/", "/login/student", "/internships/123", "/companies/1", "/onboarding"]) {
      expect(loginPathFor(p)).toBeNull();
    }
  });
});
