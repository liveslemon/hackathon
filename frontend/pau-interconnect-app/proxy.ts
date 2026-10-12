import { createServerClient } from "@supabase/ssr";
import { loginPathFor } from "./lib/post-login";
import {
  type AppRole,
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
  getActiveDevModeRole,
} from "./lib/role-guard";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseFetch } from "./lib/supabase-fetch";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    const devMockRole = getActiveDevModeRole({
      roleCookieValue: request.cookies.get(DEV_ROLE_COOKIE_NAME)?.value,
      modeCookieValue: request.cookies.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
    });

    // 1. Resolve user session
    let user = null;
    if (devMockRole) {
      // In dev mock mode, simulate authenticated user
      user = { id: `dev-${devMockRole}`, email: `dev.${devMockRole}@pau.dev` };
    } else {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    }

    // 2. Handle API routes
    if (pathname.startsWith("/api/")) {
      // Allow public auth endpoints
      if (pathname === "/api/auth/logout") {
        return response;
      }

      // Public GET for internships
      if (pathname.startsWith("/api/internships/") && request.method === "GET") {
        return response;
      }

      // All other API routes require authentication
      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized: Authentication required." },
          { status: 401 },
        );
      }

      // Check role requirements for API routes
      let apiRole: AppRole | null = devMockRole;
      let apiIsAdmin = devMockRole === "admin";

      if (!devMockRole) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_admin")
          .eq("id", user.id)
          .maybeSingle();

        apiRole = (profile?.role as AppRole) ?? null;
        apiIsAdmin = Boolean(profile?.is_admin) || apiRole === "admin";
      }

      // Admin-only APIs
      if (pathname.startsWith("/api/audit") && !apiIsAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required." },
          { status: 403 },
        );
      }

      // Employer-only APIs
      const isEmployerApi =
        pathname.startsWith("/api/reports") ||
        pathname.startsWith("/api/internships/post") ||
        pathname.startsWith("/api/internships/templates") ||
        pathname.startsWith("/api/logbook/employer");

      if (isEmployerApi && !apiIsAdmin && apiRole !== "employer") {
        return NextResponse.json(
          { error: "Forbidden: Employer access required." },
          { status: 403 },
        );
      }

      // Student-only APIs
      const isStudentApi =
        pathname.startsWith("/api/cv/upload") ||
        pathname.startsWith("/api/logbook/student") ||
        pathname.startsWith("/api/logbook/entry") ||
        pathname.startsWith("/api/me/export");

      if (isStudentApi && !apiIsAdmin && apiRole !== "student") {
        return NextResponse.json(
          { error: "Forbidden: Student access required." },
          { status: 403 },
        );
      }

      return response;
    }

    // 3. Handle Page routes
    const loginPath = loginPathFor(pathname);

    // Unauthenticated user attempting to access a protected page
    if (!user) {
      if (loginPath) {
        const url = request.nextUrl.clone();
        url.pathname = loginPath;
        url.search = "";
        url.searchParams.set("next", pathname + request.nextUrl.search);
        return NextResponse.redirect(url);
      }
      return response;
    }

    // Authenticated user: resolve profile details
    let role: AppRole | null = devMockRole;
    let isAdmin = devMockRole === "admin";
    let onboardingStage: string | null = "completed";

    if (!devMockRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_admin, onboarding_stage")
        .eq("id", user.id)
        .maybeSingle();

      role = (profile?.role as AppRole) ?? null;
      isAdmin = Boolean(profile?.is_admin) || role === "admin";
      onboardingStage = profile?.onboarding_stage ?? null;
    }

    // 4. Onboarding enforcement for non-admin users
    if (!isAdmin) {
      const isOnboardingPath = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
      const isCompleted = onboardingStage === "completed";

      if (!isCompleted && !isOnboardingPath) {
        // Incomplete onboarding visiting protected dashboard: route to onboarding
        if (loginPath || pathname === "/dashboard") {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      } else if (isCompleted && isOnboardingPath) {
        // Finished user visiting onboarding: never see it again, route to dashboard
        const dashboardPath = role === "employer" ? "/dashboard/employer" : "/dashboard/student";
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }

    // 5. Role-based page access checks
    // Admin routes
    const isAdminRoute =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/dashboard/admin") ||
      pathname === "/dashboard/analytics";

    if (isAdminRoute && !isAdmin) {
      const dest = role === "employer" ? "/dashboard/employer" : "/dashboard/student";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Employer routes
    const isEmployerRoute =
      pathname.startsWith("/dashboard/employer") ||
      pathname === "/dashboard/post" ||
      /^\/profile\/[^/]+/.test(pathname);

    if (isEmployerRoute && !isAdmin && role !== "employer") {
      return NextResponse.redirect(new URL("/dashboard/student", request.url));
    }

    // Student routes
    const isStudentRoute =
      pathname.startsWith("/dashboard/student") ||
      pathname === "/my-internships" ||
      pathname.startsWith("/my-internships/") ||
      pathname === "/profile" ||
      pathname.startsWith("/cv/");

    if (isStudentRoute && !isAdmin && role !== "student") {
      return NextResponse.redirect(new URL("/dashboard/employer", request.url));
    }

    // Root /dashboard redirect
    if (pathname === "/dashboard") {
      const dest = isAdmin ? "/dashboard/admin" : role === "employer" ? "/dashboard/employer" : "/dashboard/student";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  } catch {
    // Fail open on transient infrastructure failures to avoid total lockout
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
