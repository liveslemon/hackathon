import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Suspense } from "react";
import AdminClient from "./AdminClient";
import { Skeleton } from "@/components/ui";

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
      global: { fetch: crossFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/admin");

  // Server-side Admin Check
  const ALLOWED_ADMINS = ["hillary.ilona@pau.edu.ng"];
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAllowed = (user.email && ALLOWED_ADMINS.includes(user.email)) || profile?.is_admin;

  if (!isAllowed) {
    redirect("/login/admin");
  }

  return (
    <AdminClient>
      <Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      }>
        {tab === "overview" && <OverviewView />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "post" && <PostInternshipView />}
        {tab === "manage" && <ManagePlatformView />}
      </Suspense>
    </AdminClient>
  );
}
