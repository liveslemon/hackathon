import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import {
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
  getActiveDevModeRole,
  getDashboardPathForRole,
  type AppRole,
} from "@/lib/role-guard";

export default async function RoleDashboardRedirectPage() {
  const cookieStore = await cookies();

  // Check dev mode bypass first
  const devMockRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });

  if (devMockRole) {
    redirect(getDashboardPathForRole(devMockRole, devMockRole === "admin"));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/student?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin, onboarding_stage")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = Boolean(profile?.is_admin) || profile?.role === "admin";
  const role = (profile?.role as AppRole) ?? null;

  if (!isAdmin && profile?.onboarding_stage !== "completed") {
    redirect("/onboarding");
  }

  redirect(getDashboardPathForRole(role, isAdmin));
}

