export interface ApiErrorPayload {
  detail?:
    | string
    | Array<{ loc?: (string | number)[]; msg?: string; type?: string }>;
  error?: string;
  message?: string;
}

export interface ApiErrorDetails {
  status?: number;
  payload?: ApiErrorPayload;
}

export class ApiError extends Error {
  status?: number;
  payload?: ApiErrorPayload;

  constructor(message: string, details: ApiErrorDetails = {}) {
    super(message);
    this.name = "ApiError";
    this.status = details.status;
    this.payload = details.payload;
  }
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.detail === "string" ||
    Array.isArray(record.detail) ||
    typeof record.error === "string" ||
    typeof record.message === "string"
  );
}

export function toApiErrorMessage(payload: unknown, status: number): string {
  if (isApiErrorPayload(payload)) {
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((d: any) => `${d.loc?.join(".") || "Field"}: ${d.msg}`)
        .join(", ");
    }
    return (
      (typeof payload.detail === "string" ? payload.detail : undefined) ||
      payload.error ||
      payload.message ||
      `Request failed with status ${status}`
    );
  }

  return `Request failed with status ${status}`;
}
