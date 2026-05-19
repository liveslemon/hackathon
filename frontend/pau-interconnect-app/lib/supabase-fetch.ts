import crossFetch from "cross-fetch";

// Shared custom fetch wrapper to reliably suppress "refresh_token_not_found" error logs 
// which otherwise spam the console randomly during server-side renders or token expirations.
export const supabaseFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
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
      } catch (e) {
        body = "<unavailable>";
      }
    }

    const isRefreshTokenError = status === 400 && body?.includes("refresh_token_not_found");

    if (!isRefreshTokenError) {
      const meta = {
        url: String(input),
        status,
        statusText: res.statusText,
        init,
        body,
      };

      if (status >= 500) console.error("[Supabase fetch] Server error", meta);
      else if (status >= 400)
        console.warn("[Supabase fetch] Client auth error (suppressed if refresh token missing)", meta);
    }

    return res;
  } catch (err) {
    console.error("[Supabase fetch] Network error for", String(input), err);
    throw err;
  }
};
