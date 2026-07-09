import { describe, expect, it } from "vitest";
import { validateCriticalEnv } from "@/lib/env";

describe("env validation", () => {
  it("returns a validation object", () => {
    const result = validateCriticalEnv();
    expect(typeof result.valid).toBe("boolean");
    expect(Array.isArray(result.missing)).toBe(true);
  });
});
