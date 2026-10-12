import { describe, expect, it } from "vitest";
import { getAppUrl, getBackendUrl, validateCriticalEnv } from "@/lib/env";

describe("env validation and helpers", () => {
  it("returns a validation object", () => {
    const result = validateCriticalEnv();
    expect(typeof result.valid).toBe("boolean");
    expect(Array.isArray(result.missing)).toBe(true);
  });

  it("normalizes backend URL without trailing slash", () => {
    const url = getBackendUrl();
    expect(typeof url).toBe("string");
    expect(url.endsWith("/")).toBe(false);
  });

  it("normalizes app URL without trailing slash", () => {
    const url = getAppUrl();
    expect(typeof url).toBe("string");
    expect(url.endsWith("/")).toBe(false);
  });
});
