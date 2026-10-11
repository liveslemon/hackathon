import { createServerClient } from "@supabase/ssr";
import { loginPathFor } from "./lib/post-login";
import {
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
    // getUser validates with the server, which is essential for production-grade security.
    const { data, error } = await supabase.auth.getUser();

    // Logged out on a protected page: go to login and come back afterwards
    // (e.g. "View My Applications" in an email). Only when the session is
    // definitely missing, not on a transient Auth error.
    const loginPath = loginPathFor(request.nextUrl.pathname);
    const sessionMissing = !data.user && (!error || error.name === "AuthSessionMissingError");
    const devMockRole = getActiveDevModeRole({
      roleCookieValue: request.cookies.get(DEV_ROLE_COOKIE_NAME)?.value,
      modeCookieValue: request.cookies.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
    });
    if (loginPath && sessionMissing && !devMockRole) {
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      url.search = "";
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  } catch {
    // Silently handle
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
