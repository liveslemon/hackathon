import { describe, expect, it } from "vitest";
import {
  postInternshipSchema,
  updateInternshipSchema,
  internshipTemplateSchema,
  messageInputSchema,
  applicationStageUpdateSchema,
  applicationStatusUpdateSchema,
} from "@/lib/validations/employer";

describe("Employer Validations - postInternshipSchema", () => {
  it("validates a complete valid internship posting", () => {
    const payload = {
      role: "Software Engineering Intern",
      field: "Engineering",
      category: "Remote",
      description: "Join our core engineering team to build scalable full-stack web applications.",
      requirements: "Proficiency in TypeScript, React, and Git.",
      tags: "React, TypeScript, Next.js",
      location: "Lagos, Nigeria",
      duration: "6 months",
      stipend: "₦100,000/month",
      required_skills: "React, Node.js",
      slots: 2,
      deadline: "2026-12-31T23:59:59Z",
      link: "https://example.com/apply",
      status: "active",
    };

    const parsed = postInternshipSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.role).toBe("Software Engineering Intern");
      expect(parsed.data.slots).toBe(2);
      expect(parsed.data.status).toBe("active");
    }
  });

  it("validates minimal valid payload with defaults", () => {
    const payload = {
      role: "Product Designer",
      field: "Design",
      category: "Hybrid",
      description: "Design intuitive interfaces and user flows for student portals.",
      requirements: "Figma experience and wireframing skills.",
    };

    const parsed = postInternshipSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slots).toBe(1);
      expect(parsed.data.status).toBe("active");
      expect(parsed.data.tags).toBe("");
    }
  });

  it("rejects invalid category and too short descriptions", () => {
    const payload = {
      role: "AI", // too short (<3)
      field: "Engineering",
      category: "Everywhere", // invalid enum
      description: "Too short", // <20
      requirements: "None", // <10
    };

    const parsed = postInternshipSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      expect(fieldErrors.role).toBeDefined();
      expect(fieldErrors.category).toBeDefined();
      expect(fieldErrors.description).toBeDefined();
      expect(fieldErrors.requirements).toBeDefined();
    }
  });

  it("handles string slots and clamps invalid numbers to 1", () => {
    const payload = {
      role: "QA Tester",
      field: "Software",
      category: "On-site",
      description: "Perform end-to-end testing across web and mobile web apps.",
      requirements: "Attention to detail and test case design.",
      slots: "5",
    };

    const parsed = postInternshipSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slots).toBe(5);
    }

    const invalidSlotsPayload = {
      ...payload,
      slots: "-10",
    };
    const parsedInvalid = postInternshipSchema.safeParse(invalidSlotsPayload);
    expect(parsedInvalid.success).toBe(true);
    if (parsedInvalid.success) {
      expect(parsedInvalid.data.slots).toBe(1);
    }
  });
});

describe("Employer Validations - updateInternshipSchema", () => {
  it("allows partial updates", () => {
    const payload = {
      role: "Updated Senior Intern",
      status: "closed",
    };

    const parsed = updateInternshipSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.role).toBe("Updated Senior Intern");
      expect(parsed.data.status).toBe("closed");
      expect(parsed.data.description).toBeUndefined();
    }
  });

  it("rejects invalid status", () => {
    const payload = {
      status: "archived_forever",
    };

    const parsed = updateInternshipSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});

describe("Employer Validations - internshipTemplateSchema", () => {
  it("validates a standard template", () => {
    const template = {
      name: "Default Tech Template",
      role: "Software Intern",
      field: "Tech",
      category: "Remote",
      description: "A standard job description for internship recruitment across departments.",
      requirements: "Undergraduate degree program in progress.",
      tags: ["React", "Python"],
    };

    const parsed = internshipTemplateSchema.safeParse(template);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Default Tech Template");
    }
  });

  it("rejects template with empty or short name", () => {
    const template = {
      name: "X",
    };

    const parsed = internshipTemplateSchema.safeParse(template);
    expect(parsed.success).toBe(false);
  });
});

describe("Employer Validations - messageInputSchema", () => {
  it("validates a proper message", () => {
    const parsed = messageInputSchema.safeParse({ content: "Hi! Can you attend an interview tomorrow?" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty or whitespace-only messages", () => {
    expect(messageInputSchema.safeParse({ content: "" }).success).toBe(false);
    expect(messageInputSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("rejects messages exceeding 5000 characters", () => {
    const longText = "a".repeat(5001);
    expect(messageInputSchema.safeParse({ content: longText }).success).toBe(false);
  });
});

describe("Employer Validations - applicationStageUpdateSchema", () => {
  it("accepts valid pipeline stages", () => {
    const validStages = [
      "applied",
      "reviewed",
      "shortlisted",
      "interview",
      "offered",
      "accepted",
      "rejected",
      "withdrawn",
    ];

    validStages.forEach((stage) => {
      const result = applicationStageUpdateSchema.safeParse({ stage, notes: "Looks good" });
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid stages", () => {
    const result = applicationStageUpdateSchema.safeParse({ stage: "unknown_stage" });
    expect(result.success).toBe(false);
  });
});

describe("Employer Validations - applicationStatusUpdateSchema", () => {
  it("accepts valid decision statuses", () => {
    expect(applicationStatusUpdateSchema.safeParse({ status: "pending" }).success).toBe(true);
    expect(applicationStatusUpdateSchema.safeParse({ status: "accepted", decision_notes: "Welcome aboard" }).success).toBe(true);
    expect(applicationStatusUpdateSchema.safeParse({ status: "rejected", decision_notes: "Position filled" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(applicationStatusUpdateSchema.safeParse({ status: "interviewing" }).success).toBe(false);
  });
});
