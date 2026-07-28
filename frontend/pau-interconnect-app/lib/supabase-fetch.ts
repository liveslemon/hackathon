import crossFetch from "cross-fetch";

function isRecoverableSchemaError(
  status: number,
  body: string | null,
): boolean {
  if (status < 400 || !body) return false;

  const normalized = body.toLowerCase();
  return (
    normalized.includes('"code":"42703"') ||
    normalized.includes('"code":"pgrst204"') ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find") ||
    normalized.includes("does not exist") ||
    normalized.includes("column")
  );
}

function isNoRowObjectCoercionError(
  status: number,
  body: string | null,
): boolean {
  if (status !== 406 || !body) return false;

  const normalized = body.toLowerCase();
  return (
    normalized.includes('"code":"pgrst116"') &&
    normalized.includes("contains 0 rows")
  );
}

// Shared custom fetch wrapper to reliably suppress "refresh_token_not_found" error logs
// which otherwise spam the console randomly during server-side renders or token expirations.
export const supabaseFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  try {
    const fetchToUse = typeof fetch !== "undefined" ? fetch : crossFetch;
    const res = await fetchToUse(input, init);

    if (res.ok) return res;

    const status = res.status || 0;
    let body: string | null = null;

    // Only clone and read the body if there's an error to log or check
    if (!res.ok) {
      try {
        body = await res.clone().text();
      } catch {
        body = "<unavailable>";
      }
    }

    const isRefreshTokenError =
      status === 400 && body?.includes("refresh_token_not_found");
    const isSchemaError = isRecoverableSchemaError(status, body);
    const isNoRowError = isNoRowObjectCoercionError(status, body);

    if (!isRefreshTokenError && !isSchemaError && !isNoRowError) {
      const meta = {
        url: String(input),
        status,
        statusText: res.statusText,
        init,
        body,
      };

      if (status >= 500) console.error("[Supabase fetch] Server error", meta);
      else if (status >= 400)
        console.warn(
          "[Supabase fetch] Client auth error (suppressed if refresh token missing)",
          meta,
        );
    }

    return res;
  } catch (err) {
    console.error("[Supabase fetch] Network error for", String(input), err);
    throw err;
  }
};
