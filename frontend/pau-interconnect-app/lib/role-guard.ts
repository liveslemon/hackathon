import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "student" | "employer" | "admin";
export type DevAuthMode = "real" | "mock";

export const DEV_ROLE_COOKIE_NAME = "dev_mode_role";
export const DEV_AUTH_MODE_COOKIE_NAME = "dev_auth_mode";

export interface UserRoleContext {
  profile: Record<string, unknown> | null;
  role: AppRole | null;
  isAdmin: boolean;
}

export async function getUserRoleProfile(
  supabase: Pick<SupabaseClient, "from">,
  userId: string,
): Promise<UserRoleContext> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { profile: null, role: null, isAdmin: false };
  }

  const role =
    (profile.role as AppRole | undefined) ??
    (profile.is_admin ? "admin" : null);

  return {
    profile,
    role,
    isAdmin: Boolean(profile.is_admin),
  };
}

export function getDashboardPathForRole(
  role: AppRole | null,
  isAdmin = false,
): string {
  if (isAdmin || role === "admin") return "/dashboard/admin";
  if (role === "employer") return "/dashboard/employer";
  if (role === "student") return "/dashboard/student";
  return "/dashboard";
}

export function isLocalDevHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

export function isDevToolbarEnabled(
  hostname?: string | null,
  options?: { allowNonLocal?: boolean },
): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLBAR === "false") return false;

  const allowNonLocal =
    options?.allowNonLocal ??
    process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLBAR_NON_LOCAL === "true";
  if (allowNonLocal) return true;

  return isLocalDevHost(hostname);
}

export function isDevRoleBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLBAR !== "false" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_MODE !== "false"
  );
}

export function getDevModeRoleFromCookie(
  cookieValue: string | null | undefined,
): AppRole | null {
  if (!cookieValue) return null;
  return cookieValue === "student" ||
    cookieValue === "employer" ||
    cookieValue === "admin"
    ? cookieValue
    : null;
}

export function clearDevModeRoleCookie(): string {
  return `${DEV_ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function setDevModeRoleCookie(role: AppRole): string {
  return `${DEV_ROLE_COOKIE_NAME}=${role}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function getDevAuthModeFromCookie(
  cookieValue: string | null | undefined,
): DevAuthMode {
  return cookieValue === "mock" ? "mock" : "real";
}

export function setDevAuthModeCookie(mode: DevAuthMode): string {
  return `${DEV_AUTH_MODE_COOKIE_NAME}=${mode}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function clearDevAuthModeCookie(): string {
  return `${DEV_AUTH_MODE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getActiveDevModeRole(options: {
  roleCookieValue: string | null | undefined;
  modeCookieValue: string | null | undefined;
}): AppRole | null {
  if (!isDevRoleBypassEnabled()) return null;
  const mode = getDevAuthModeFromCookie(options.modeCookieValue);
  if (mode !== "mock") return null;
  return getDevModeRoleFromCookie(options.roleCookieValue);
}

export function getDevModeProfileForRole(
  role: AppRole | null,
): Record<string, unknown> | null {
  switch (role) {
    case "student":
      return {
        id: "dev-student",
        email: "dev.student@pau.dev",
        role: "student",
        full_name: "Dev Student",
        name: "Dev Student",
        interests: ["Software Engineering", "Product Design"],
        is_admin: false,
      };
    case "employer":
      return {
        id: "dev-employer",
        email: "dev.employer@pau.dev",
        role: "employer",
        full_name: "Dev Employer",
        name: "Dev Employer",
        company_name: "Dev Mode Company",
        is_admin: false,
      };
    case "admin":
      return {
        id: "dev-admin",
        email: "dev.admin@pau.dev",
        role: "admin",
        full_name: "Dev Admin",
        name: "Dev Admin",
        is_admin: true,
      };
    default:
      return null;
  }
}

export type RouteRoleRequirement =
  | "public"
  | "authenticated"
  | "student"
  | "employer"
  | "admin";

/** Determines the minimum required role for any frontend page or API route. */
export function getRequiredRoleForRoute(pathname: string): RouteRoleRequirement {
  // Public static / landing / login / public entity pages
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/companies/") ||
    pathname.startsWith("/internships/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/api/auth/logout"
  ) {
    return "public";
  }

  // Admin-only pages and APIs
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/dashboard/admin") ||
    pathname === "/dashboard/analytics" ||
    pathname.startsWith("/api/audit")
  ) {
    return "admin";
  }

  // Employer pages and APIs
  if (
    pathname.startsWith("/dashboard/employer") ||
    /^\/profile\/[^/]+/.test(pathname) ||
    pathname === "/dashboard/post" ||
    pathname.startsWith("/api/reports") ||
    pathname.startsWith("/api/internships/post") ||
    pathname.startsWith("/api/internships/templates") ||
    pathname.startsWith("/api/logbook/employer")
  ) {
    return "employer";
  }

  // Student pages and APIs
  if (
    pathname.startsWith("/dashboard/student") ||
    pathname === "/my-internships" ||
    pathname.startsWith("/my-internships/") ||
    pathname === "/profile" ||
    pathname.startsWith("/cv/") ||
    pathname.startsWith("/api/cv/upload") ||
    pathname.startsWith("/api/logbook/student") ||
    pathname.startsWith("/api/logbook/entry") ||
    pathname.startsWith("/api/me/export")
  ) {
    return "student";
  }

  // General authenticated routes (accessible by any logged-in user)
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/api/onboarding") ||
    pathname.startsWith("/api/analysis") ||
    pathname.startsWith("/api/applications") ||
    pathname.startsWith("/api/messages") ||
    pathname.startsWith("/api/me")
  ) {
    return "authenticated";
  }

  return "public";
}

/** Returns whether a given user role (and admin status) is authorized to access a route. */
export function isAllowedRouteForRole(
  pathname: string,
  role: AppRole | null,
  isAdmin = false,
): boolean {
  const requirement = getRequiredRoleForRoute(pathname);

  if (requirement === "public") return true;
  if (!role && !isAdmin) return false;
  if (isAdmin || role === "admin") return true;

  if (requirement === "authenticated") return true;
  if (requirement === "student") return role === "student";
  if (requirement === "employer") return role === "employer";
  if (requirement === "admin") return false;

  return true;
}

