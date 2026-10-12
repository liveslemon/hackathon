import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { safeNextPathForRole } from "@/lib/post-login";
import { getUserRoleProfile, getDashboardPathForRole } from "@/lib/role-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");

  if (code) {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { role, isAdmin } = await getUserRoleProfile(supabase, data.user.id);
      const safeNext = safeNextPathForRole(rawNext, role, isAdmin);

      if (safeNext) {
        return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
      }

      const destination = getDashboardPathForRole(role, isAdmin);
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  // If code exchange failed or no code provided, redirect to login with error
  const fallbackUrl = new URL("/login/student", requestUrl.origin);
  fallbackUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(fallbackUrl);
}
