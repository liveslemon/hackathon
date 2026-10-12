import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sendEmail,
  sendNotificationEmailWithOptOut,
} from "@/lib/email";
import {
  escapeHtml,
  applicationReceivedEmail,
  applicationStatusEmail,
  logbookFlaggedEmail,
  deadlineReminderEmail,
} from "@/lib/email-templates";

const msg = { to: "stu@pau.edu.ng", subject: "Offer", html: "<p>Hi</p>" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it("reports skipped when recipient is missing", async () => {
    expect(await sendEmail({ to: "", subject: "Test", html: "<p>Hi</p>" })).toEqual({
      status: "skipped",
      reason: "Recipient email address is missing",
    });
  });

  it("reports skipped when no provider is configured", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail(msg)).toEqual({
      status: "skipped",
      reason: "BREVO_API_KEY is not set in this deployment",
    });
  });

  it("sends through Brevo with the verified sender", async () => {
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "team@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail(msg)).toEqual({ status: "sent", provider: "brevo" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("key");
    expect(JSON.parse(init.body)).toMatchObject({
      sender: { email: "team@example.com" },
      to: [{ email: "stu@pau.edu.ng" }],
      subject: "Offer",
    });
  });

  it("surfaces Brevo's error message without crashing", async () => {
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "team@example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"message":"Sender is not valid"}', { status: 400 })),
    );
    const result = await sendEmail(msg);
    expect(result.status).toBe("failed");
    expect(result).toMatchObject({ error: expect.stringContaining("Sender is not valid") });
  });

  it("falls back to Resend when only RESEND_API_KEY is provided", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "info@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"msg-123"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail(msg);
    expect(result).toEqual({ status: "sent", provider: "resend" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer resend-test-key");
  });
});

describe("HTML escaping and sanitization", () => {
  it("escapes special HTML characters correctly", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
    );
    expect(escapeHtml('Hello "World" & Co.')).toBe(
      "Hello &quot;World&quot; &amp; Co.",
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("escapes user content in applicationStatusEmail", () => {
    const maliciousInput = {
      studentName: "<img src=x onerror=alert(1)>",
      role: 'Engineer "><script>',
      company: "Acme & Co",
      status: "rejected",
      feedback: "Please review: <b onmouseover='alert(2)'>link</b>",
    };

    const email = applicationStatusEmail(maliciousInput);
    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(email.html).toContain("Engineer &quot;&gt;&lt;script&gt;");
    expect(email.html).toContain("Acme &amp; Co");
    expect(email.html).toContain("&lt;b onmouseover=&#039;alert(2)&#039;&gt;link&lt;/b&gt;");
  });

  it("escapes user content in applicationReceivedEmail", () => {
    const email = applicationReceivedEmail({
      employerName: "<admin>",
      studentName: "Bob <attacker>",
      role: "Finance Intern <script>",
      reviewLink: "/dashboard/employer/internships/123",
    });

    expect(email.html).toContain("&lt;admin&gt;");
    expect(email.html).toContain("Bob &lt;attacker&gt;");
    expect(email.html).toContain("Finance Intern &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });

  it("escapes user content in logbookFlaggedEmail", () => {
    const email = logbookFlaggedEmail({
      studentName: "Alice <test>",
      date: "2026-10-12 <date>",
      feedback: "Malicious feedback: <svg/onload=alert()>",
    });

    expect(email.html).toContain("Alice &lt;test&gt;");
    expect(email.html).toContain("2026-10-12 &lt;date&gt;");
    expect(email.html).toContain("&lt;svg/onload=alert()&gt;");
    expect(email.html).not.toContain("<svg");
  });

  it("escapes user content in deadlineReminderEmail", () => {
    const email = deadlineReminderEmail({
      employerName: "Acme HR <script>",
      role: "Backend Lead <b>",
      daysRemaining: 3,
      applicantCount: 5,
    });

    expect(email.html).toContain("Acme HR &lt;script&gt;");
    expect(email.html).toContain("Backend Lead &lt;b&gt;");
    expect(email.html).not.toContain("<script>");
  });
});

describe("email links and unsubscribe preferences", () => {
  it("are absolute https URLs and contain unsubscribe links", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://interconnect.pau.edu.ng");

    const statusEmail = applicationStatusEmail({
      studentName: "Jane",
      role: "Data Intern",
      company: "Paystack",
      status: "accepted",
    });

    const receivedEmail = applicationReceivedEmail({
      employerName: "John",
      studentName: "Jane",
      role: "Data Intern",
      reviewLink: "/dashboard/employer/apps/1",
    });

    const deadlineEmail = deadlineReminderEmail({
      employerName: "John",
      role: "Data Intern",
      reviewLink: "/dashboard/employer/internships/1",
    });

    // Check all hrefs are absolute
    const checkHrefs = (html: string) => {
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).toMatch(/^https?:\/\//);
      }
      return hrefs;
    };

    const statusHrefs = checkHrefs(statusEmail.html);
    expect(statusHrefs).toContain("https://interconnect.pau.edu.ng/dashboard/student/settings");

    const receivedHrefs = checkHrefs(receivedEmail.html);
    expect(receivedHrefs).toContain("https://interconnect.pau.edu.ng/dashboard/employer/settings");

    const deadlineHrefs = checkHrefs(deadlineEmail.html);
    expect(deadlineHrefs).toContain("https://interconnect.pau.edu.ng/dashboard/employer/settings");
  });
});

describe("sendNotificationEmailWithOptOut", () => {
  it("skips sending if user has opted out in notification settings", async () => {
    // Mock getSupabaseServer
    vi.mock("@/lib/supabase-server", () => ({
      getSupabaseServer: vi.fn().mockResolvedValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  settings: {
                    notifications: {
                      application_updates: false,
                    },
                  },
                },
              }),
            }),
          }),
        }),
      }),
    }));

    const result = await sendNotificationEmailWithOptOut({
      to: "student@pau.edu.ng",
      subject: "Update",
      html: "<p>Status updated</p>",
      userId: "user-123",
      preferenceKey: "application_updates",
    });

    expect(result.status).toBe("skipped");
    expect(result).toMatchObject({
      reason: expect.stringContaining("opted out"),
    });
  });
});
