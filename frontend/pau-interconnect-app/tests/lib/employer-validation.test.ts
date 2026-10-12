import { describe, expect, it } from "vitest";
import {
  companySettingsSchema,
  postInternshipSchema,
  employerNotificationPrefsSchema,
} from "@/lib/validations/employer";

describe("companySettingsSchema", () => {
  it("validates a complete valid company settings payload", () => {
    const validData = {
      company_name: "Flutterwave",
      company_website: "https://flutterwave.com",
      company_logo_url: "https://example.com/logo.png",
      company_banner_url: "https://example.com/banner.png",
      industry: "Fintech",
      company_description: "Leading payments technology provider across Africa.",
      culture: "Collaborative, fast-paced and innovative engineering environment.",
      notification_preferences: {
        email_new_applicant: true,
        email_logbook_submitted: false,
        email_deadline_reminder: true,
      },
    };
    const result = companySettingsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts empty strings for optional fields", () => {
    const emptyData = {
      company_name: "",
      company_website: "",
      company_logo_url: "",
      company_banner_url: "",
      industry: "",
      company_description: "",
      culture: "",
    };
    const result = companySettingsSchema.safeParse(emptyData);
    expect(result.success).toBe(true);
  });

  it("accepts domain URLs without protocol and normalizes/validates them", () => {
    const result = companySettingsSchema.safeParse({
      company_website: "flutterwave.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid website URLs", () => {
    const result = companySettingsSchema.safeParse({
      company_website: "not a url @!$",
    });
    expect(result.success).toBe(false);
  });

  it("rejects company description if provided but shorter than 15 characters", () => {
    const result = companySettingsSchema.safeParse({
      company_description: "Too short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 15 characters");
    }
  });

  it("rejects culture section if provided but shorter than 10 characters", () => {
    const result = companySettingsSchema.safeParse({
      culture: "Fun place",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 10 characters");
    }
  });

  it("rejects company name if shorter than 2 characters", () => {
    const result = companySettingsSchema.safeParse({
      company_name: "A",
    });
    expect(result.success).toBe(false);
  });
});

describe("postInternshipSchema", () => {
  it("validates a complete valid internship posting", () => {
    const validPosting = {
      role: "Backend Engineering Intern",
      field: "Software Engineering",
      category: "Remote",
      description: "Build robust APIs and microservices using Python and Supabase.",
      requirements: "Experience with Python, SQL, and Git version control.",
      tags: "Python, FastAPI, Postgres",
      deadline: "2026-12-31",
      link: "https://paystack.com/careers",
      status: "active",
    };
    const result = postInternshipSchema.safeParse(validPosting);
    expect(result.success).toBe(true);
  });

  it("rejects roles shorter than 3 characters", () => {
    const result = postInternshipSchema.safeParse({
      role: "AI",
      field: "Tech",
      category: "Remote",
      description: "Valid description here over 20 chars.",
      requirements: "Valid requirements over 10 chars.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects descriptions shorter than 20 characters", () => {
    const result = postInternshipSchema.safeParse({
      role: "Software Intern",
      field: "Tech",
      category: "Remote",
      description: "Short desc",
      requirements: "Valid requirements over 10 chars.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid categories", () => {
    const result = postInternshipSchema.safeParse({
      role: "Software Intern",
      field: "Tech",
      category: "Mars-based",
      description: "Valid description here over 20 chars.",
      requirements: "Valid requirements over 10 chars.",
    });
    expect(result.success).toBe(false);
  });
});

describe("employerNotificationPrefsSchema", () => {
  it("provides defaults for all preferences", () => {
    const result = employerNotificationPrefsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email_new_applicant).toBe(true);
      expect(result.data.email_logbook_submitted).toBe(true);
      expect(result.data.email_deadline_reminder).toBe(true);
    }
  });
});
