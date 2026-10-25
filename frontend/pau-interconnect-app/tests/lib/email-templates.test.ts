import { describe, expect, it, vi, afterEach } from "vitest";
import {
  escapeHtml,
  ensureAbsoluteUrl,
  applicationReceivedEmail,
  applicationStatusEmail,
  logbookFlaggedEmail,
  deadlineReminderEmail,
  renderBrandedEmailHtml,
} from "@/lib/email-templates";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Email Templates Unit Tests", () => {
  it("escapes malicious HTML characters", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(escapeHtml('"test" & \'hello\'')).toBe(
      "&quot;test&quot; &amp; &#039;hello&#039;",
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("ensures links are absolute URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://interconnect.pau.edu.ng");
    expect(ensureAbsoluteUrl("/dashboard", "/")).toBe(
      "https://interconnect.pau.edu.ng/dashboard",
    );
    expect(ensureAbsoluteUrl("https://other.domain.com/path", "/")).toBe(
      "https://other.domain.com/path",
    );
    expect(ensureAbsoluteUrl(null, "/fallback")).toBe(
      "https://interconnect.pau.edu.ng/fallback",
    );
  });

  it("generates applicationReceivedEmail with branded layout and text fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://interconnect.pau.edu.ng");
    const email = applicationReceivedEmail({
      employerName: "Paystack Recruiting",
      studentName: "Ada Lovelace",
      role: "Frontend Engineer",
      reviewLink: "/dashboard/employer/apps/123",
    });

    expect(email.subject).toBe(
      "New Application: Ada Lovelace applied for Frontend Engineer",
    );
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("PAU InterConnect");
    expect(email.html).toContain("Ada Lovelace");
    expect(email.html).toContain("Frontend Engineer");
    expect(email.html).toContain(
      "https://interconnect.pau.edu.ng/dashboard/employer/apps/123",
    );
    expect(email.html).toContain(
      "https://interconnect.pau.edu.ng/dashboard/employer/settings",
    );
    expect(email.html).toContain("prefers-color-scheme: dark");
    expect(email.text).toContain("Ada Lovelace has applied for your Frontend Engineer internship.");
  });

  it("generates applicationStatusEmail with acceptance or rejection styling", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://interconnect.pau.edu.ng");
    const accepted = applicationStatusEmail({
      studentName: "Emeka Okoro",
      role: "Data Scientist",
      company: "Kuda",
      status: "accepted",
    });

    expect(accepted.subject).toContain("Congratulations!");
    expect(accepted.html).toContain("Great news!");
    expect(accepted.text).toContain("accepted");

    const rejected = applicationStatusEmail({
      studentName: "Emeka Okoro",
      role: "Data Scientist",
      company: "Kuda",
      status: "rejected",
      feedback: "Please build more Python portfolio projects.",
    });

    expect(rejected.subject).toContain("Update on your application");
    expect(rejected.html).toContain("Please build more Python portfolio projects.");
    expect(rejected.text).toContain("Please build more Python portfolio projects.");
  });

  it("generates logbookFlaggedEmail with supervisor feedback and absolute link", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://interconnect.pau.edu.ng");
    const email = logbookFlaggedEmail({
      studentName: "Ngozi Eze",
      date: "Week 4 (Oct 12)",
      feedback: "Include diagram of architecture implemented.",
    });

    expect(email.subject).toContain("Week 4 (Oct 12) needs revision");
    expect(email.html).toContain("Include diagram of architecture implemented.");
    expect(email.html).toContain(
      "https://interconnect.pau.edu.ng/dashboard/student/logbook",
    );
    expect(email.text).toContain("Include diagram of architecture implemented.");
  });

  it("generates deadlineReminderEmail with applicant count and review link", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://interconnect.pau.edu.ng");
    const email = deadlineReminderEmail({
      employerName: "Interswitch HR",
      role: "Security Analyst",
      daysRemaining: 2,
      applicantCount: 14,
    });

    expect(email.subject).toBe("Reminder: Security Analyst closes in 2 days");
    expect(email.html).toContain("14 applicants");
    expect(email.html).toContain("2 days");
    expect(email.html).toContain(
      "https://interconnect.pau.edu.ng/dashboard/employer",
    );
    expect(email.text).toContain("14 applicants so far");
  });

  it("supports dark mode color-scheme meta and media queries in renderBrandedEmailHtml", () => {
    const html = renderBrandedEmailHtml({
      title: "Test Email",
      badge: "Test Badge",
      headline: "Test Headline",
      contentHtml: "<p>Test Content</p>",
      actionText: "Click Me",
      actionUrl: "https://example.com",
      settingsUrl: "https://example.com/settings",
      footerReason: "Notification reason",
    });

    expect(html).toContain('meta name="color-scheme" content="light dark"');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("email-card");
  });
});
