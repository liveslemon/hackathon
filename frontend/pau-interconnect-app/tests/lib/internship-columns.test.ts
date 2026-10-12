import { describe, expect, it } from "vitest";
import {
  INTERNSHIP_LIST_COLUMNS,
  isOpenInternship,
} from "@/lib/internship-columns";

describe("internship-columns - INTERNSHIP_LIST_COLUMNS", () => {
  it("includes essential student browsing columns", () => {
    expect(INTERNSHIP_LIST_COLUMNS).toContain("id");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("role");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("company");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("description");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("category");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("field");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("deadline");
    expect(INTERNSHIP_LIST_COLUMNS).toContain("status");
  });

  it("excludes heavy vector embeddings to protect network payload", () => {
    // embeddings are 1024 floats (~4KB each) and must not be loaded on listing queries
    expect(INTERNSHIP_LIST_COLUMNS.split(",").map((s) => s.trim())).not.toContain("embedding");
  });
});

describe("internship-columns - isOpenInternship", () => {
  it("returns true for active internship with no deadline", () => {
    expect(isOpenInternship({ status: "active" })).toBe(true);
    expect(isOpenInternship({})).toBe(true); // defaults to active
  });

  it("returns true for active internship with future deadline", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOpenInternship({ status: "active", deadline: futureDate })).toBe(true);
  });

  it("returns false for active internship with past deadline", () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOpenInternship({ status: "active", deadline: pastDate })).toBe(false);
  });

  it("returns false for non-active status even with future deadline", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOpenInternship({ status: "closed", deadline: futureDate })).toBe(false);
    expect(isOpenInternship({ status: "draft", deadline: futureDate })).toBe(false);
    expect(isOpenInternship({ status: "expired", deadline: futureDate })).toBe(false);
  });
});
