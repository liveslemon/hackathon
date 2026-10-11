// "Return to where you were" after login, e.g. from a link in an email.
// proxy.ts sends logged-out visitors to /login/<role>?next=<path>; the login
// pages call getNextPath() once sign-in succeeds.

/** Same-site paths only, so ?next= can't redirect users to another site. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  if (path.includes("://") || /[\r\n]/.test(path)) return null;
  if (path.startsWith("/login") || path.startsWith("/api")) return null;
  return path;
}

export function getNextPath(): string | null {
  if (typeof window === "undefined") return null;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** Which login page protects a path, or null if the path is public. */
export function loginPathFor(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/admin")) return "/login/admin";
  if (pathname.startsWith("/dashboard/employer")) return "/login/employer";
  if (/^\/profile\/[^/]+/.test(pathname)) return "/login/employer"; // student profile viewed by employers
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/my-internships") ||
    pathname === "/profile" ||
    pathname.startsWith("/cv/")
  ) {
    return "/login/student";
  }
  return null;
}
