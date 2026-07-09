import { describe, expect, it } from "vitest";
import { ApiError, toApiErrorMessage } from "@/types/api";

describe("ApiError helpers", () => {
  it("builds user message from payload", () => {
    expect(toApiErrorMessage({ detail: "Bad request" }, 400)).toBe(
      "Bad request",
    );
    expect(toApiErrorMessage({ error: "Unauthorized" }, 401)).toBe(
      "Unauthorized",
    );
    expect(toApiErrorMessage({}, 500)).toBe("Request failed with status 500");
  });

  it("keeps status on ApiError", () => {
    const err = new ApiError("Nope", { status: 418 });
    expect(err.status).toBe(418);
    expect(err.message).toBe("Nope");
  });
});
