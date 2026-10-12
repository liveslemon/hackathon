import type { AppRole } from "./role-guard";

/** Same-site paths only, so ?next= can't redirect users to another site. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // Must be a single leading slash relative path
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  // Disallow backslashes anywhere, control characters, tabs, newlines, and protocol markers
  if (path.includes("\\") || path.includes("://") || /[\r\n\t\0]/.test(path)) return null;
  // Disallow javascript:, data:, vbscript: pseudo-protocols
  if (/^\/[a-zA-Z0-9_-]+:/.test(path)) return null;
  // Disallow redirecting into auth/login/api paths to prevent redirect loops or CSRF traps
  if (path.startsWith("/login") || path.startsWith("/api") || path.startsWith("/auth")) return null;

  try {
    const parsed = new URL(path, "http://localhost");
    if (parsed.origin !== "http://localhost") return null;
    if (parsed.protocol !== "http:") return null;
    if (parsed.pathname.startsWith("//") || parsed.pathname.includes("\\")) return null;
  } catch {
    return null;
  }

  return path;
}

/** Validates that a ?next= path is allowed for the user's specific role. */
export function safeNextPathForRole(
  raw: string | null | undefined,
  role?: AppRole | null,
  isAdmin = false,
): string | null {
  const path = safeNextPath(raw);
  if (!path) return null;
  if (isAdmin || role === "admin") return path;

  if (role === "student") {
    if (path.startsWith("/dashboard/admin") || path === "/admin" || path.startsWith("/admin/")) return null;
    if (path.startsWith("/dashboard/employer")) return null;
  }

  if (role === "employer") {
    if (path.startsWith("/dashboard/admin") || path === "/admin" || path.startsWith("/admin/")) return null;
    if (path.startsWith("/dashboard/student") || path.startsWith("/my-internships")) return null;
  }

  return path;
}

export function getNextPath(role?: AppRole | null, isAdmin?: boolean): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  return safeNextPathForRole(raw, role, isAdmin);
}

/** Which login page protects a path, or null if the path is public. */
export function loginPathFor(pathname: string): string | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/dashboard/admin")) {
    return "/login/admin";
  }
  if (
    pathname.startsWith("/dashboard/employer") ||
    pathname === "/dashboard/post" ||
    /^\/profile\/[^/]+/.test(pathname)
  ) {
    return "/login/employer";
  }
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

