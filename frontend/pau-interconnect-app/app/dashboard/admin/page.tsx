import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { Suspense } from "react";
import AdminClient from "./AdminClient";
import { Skeleton } from "@/components/ui";
import {
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
  getDashboardPathForRole,
  getActiveDevModeRole,
  getUserRoleProfile,
} from "@/lib/role-guard";

// Parallel import of subviews
import OverviewView from "./overview/OverviewView";
import AnalyticsPage from "./analytics/AnalyticsView";
import PostInternshipView from "./post/PostInternshipView";
import ManagePlatformView from "./manage/ManagePlatformView";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "overview" } = await searchParams;
  const cookieStore = await cookies();
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

  const devRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });

  if (devRole === "admin") {
    return (
      <AdminClient>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-3xl" />
              ))}
            </div>
          }
        >
          {tab === "overview" && <OverviewView />}
          {tab === "analytics" && <AnalyticsPage />}
          {tab === "post" && <PostInternshipView />}
          {tab === "manage" && <ManagePlatformView />}
        </Suspense>
      </AdminClient>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/admin");

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);

  if (!role && !isAdmin) {
    redirect("/onboarding");
  }

  if (!isAdmin && role !== "admin") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  // Server-side Admin Check
  const ALLOWED_ADMINS = ["hillary.ilona@pau.edu.ng"];
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAllowed =
    (user.email && ALLOWED_ADMINS.includes(user.email)) || profile?.is_admin;

  if (!isAllowed) {
    redirect("/login/admin");
  }

  return (
    <AdminClient>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" />
            ))}
          </div>
        }
      >
        {tab === "overview" && <OverviewView />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "post" && <PostInternshipView />}
        {tab === "manage" && <ManagePlatformView />}
      </Suspense>
    </AdminClient>
  );
}
