import { describe, expect, it } from "vitest";
import {
  readPrivacy,
  maskStudentForEmployer,
  DEFAULT_PRIVACY,
  PRIVATE_COLUMNS,
} from "@/lib/privacy";

describe("readPrivacy", () => {
  it("returns default privacy when settings is null or undefined", () => {
    expect(readPrivacy(null)).toEqual(DEFAULT_PRIVACY);
    expect(readPrivacy(undefined)).toEqual(DEFAULT_PRIVACY);
    expect(readPrivacy({})).toEqual(DEFAULT_PRIVACY);
  });

  it("parses valid nested privacy object", () => {
    const settings = {
      privacy: {
        phone_visibility: "only_me",
        email_visibility: "only_me",
      },
    };
    expect(readPrivacy(settings)).toEqual({
      phone_visibility: "only_me",
      email_visibility: "only_me",
    });
  });

  it("parses JSON stringified settings", () => {
    const jsonStr = JSON.stringify({
      privacy: {
        phone_visibility: "only_me",
        email_visibility: "employers",
      },
    });
    expect(readPrivacy(jsonStr)).toEqual({
      phone_visibility: "only_me",
      email_visibility: "employers",
    });
  });

  it("handles malformed JSON string gracefully by falling back to defaults", () => {
    expect(readPrivacy("{invalid-json")).toEqual(DEFAULT_PRIVACY);
  });

  it("handles legacy top-level visibility keys if privacy sub-object is missing", () => {
    const legacy = {
      phone_visibility: "only_me",
      email_visibility: "only_me",
    };
    expect(readPrivacy(legacy)).toEqual({
      phone_visibility: "only_me",
      email_visibility: "only_me",
    });
  });

  it("falls back to 'employers' for unknown visibility values", () => {
    const settings = {
      privacy: {
        phone_visibility: "strangers",
        email_visibility: "hidden",
      },
    };
    expect(readPrivacy(settings)).toEqual({
      phone_visibility: "employers",
      email_visibility: "employers",
    });
  });
});

describe("maskStudentForEmployer", () => {
  const baseProfile = {
    id: "student-123",
    role: "student",
    full_name: "Adeola Balogun",
    email: "adeola@pau.edu.ng",
    phone: "+2348012345678",
    cv_url: "https://example.com/cv.pdf",
    skills: ["Python", "FastAPI"],
    // Private columns:
    cv_text: "Confidential resume text...",
    cv_embedding: [0.1, 0.2, 0.3],
    cv_analysis: { strengths: ["Backend"] },
    cv_structured: { skills: ["Python"] },
    settings: {
      privacy: {
        phone_visibility: "employers",
        email_visibility: "employers",
      },
    },
    notification_preferences: { all: true },
    is_admin: false,
    onboarding_stage: "completed",
    cv_processing_error: null,
  };

  it("removes all private columns from the profile", () => {
    const masked = maskStudentForEmployer(baseProfile);
    for (const col of PRIVATE_COLUMNS) {
      expect(masked).not.toHaveProperty(col);
    }
    expect(masked.id).toBe("student-123");
    expect(masked.full_name).toBe("Adeola Balogun");
    expect(masked.skills).toEqual(["Python", "FastAPI"]);
  });

  it("keeps email and phone when visibility is 'employers'", () => {
    const masked = maskStudentForEmployer(baseProfile);
    expect(masked.email).toBe("adeola@pau.edu.ng");
    expect(masked.phone).toBe("+2348012345678");
  });

  it("nullifies phone when phone_visibility is 'only_me'", () => {
    const profile = {
      ...baseProfile,
      settings: {
        privacy: {
          phone_visibility: "only_me",
          email_visibility: "employers",
        },
      },
    };
    const masked = maskStudentForEmployer(profile);
    expect(masked.phone).toBeNull();
    expect(masked.email).toBe("adeola@pau.edu.ng");
  });

  it("nullifies email when email_visibility is 'only_me'", () => {
    const profile = {
      ...baseProfile,
      settings: {
        privacy: {
          phone_visibility: "employers",
          email_visibility: "only_me",
        },
      },
    };
    const masked = maskStudentForEmployer(profile);
    expect(masked.email).toBeNull();
    expect(masked.phone).toBe("+2348012345678");
  });

  it("nullifies both phone and email when both are 'only_me'", () => {
    const profile = {
      ...baseProfile,
      settings: {
        privacy: {
          phone_visibility: "only_me",
          email_visibility: "only_me",
        },
      },
    };
    const masked = maskStudentForEmployer(profile);
    expect(masked.phone).toBeNull();
    expect(masked.email).toBeNull();
  });

  it("handles null or undefined input safely", () => {
    expect(maskStudentForEmployer(null as any)).toEqual({});
    expect(maskStudentForEmployer(undefined as any)).toEqual({});
  });
});
