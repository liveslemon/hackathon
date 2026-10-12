import { describe, expect, it } from "vitest";
import { ApiError, isApiErrorPayload, toApiErrorMessage } from "@/types/api";

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

  it("formats FastAPI array validation error details correctly", () => {
    const payload = {
      detail: [
        { loc: ["body", "cover_letter"], msg: "String should have at least 10 characters" },
        { loc: ["body", "user_id"], msg: "Field required" },
      ],
    };
    const message = toApiErrorMessage(payload, 422);
    expect(message).toBe(
      "body.cover_letter: String should have at least 10 characters, body.user_id: Field required",
    );
  });

  it("identifies valid api error payload", () => {
    expect(isApiErrorPayload({ detail: "Error" })).toBe(true);
    expect(isApiErrorPayload({ message: "Failed" })).toBe(true);
    expect(isApiErrorPayload("invalid")).toBe(false);
    expect(isApiErrorPayload(null)).toBe(false);
  });

  it("keeps status and payload on ApiError", () => {
    const payload = { detail: "I'm a teapot" };
    const err = new ApiError("Nope", { status: 418, payload });
    expect(err.status).toBe(418);
    expect(err.message).toBe("Nope");
    expect(err.payload).toEqual(payload);
  });
});
