import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email";

const msg = { to: "stu@pau.edu.ng", subject: "Offer", html: "<p>Hi</p>" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
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

  it("surfaces Brevo's error message", async () => {
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
});

describe("email links", () => {
  it("are absolute https URLs even without NEXT_PUBLIC_APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "interconnect-ten.vercel.app");
    const { applicationStatusEmail } = await import("@/lib/email-templates");
    const { html } = applicationStatusEmail({
      studentName: "Jane",
      role: "Data Intern",
      company: "Paystack",
      status: "offered",
    });
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^https:\/\/interconnect-ten\.vercel\.app\//);
    expect(hrefs).toContain("https://interconnect-ten.vercel.app/my-internships");
  });
});
