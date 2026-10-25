import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Skeleton, PageHeader, Badge } from "@/components/ui";
import { Clock } from "lucide-react";
import { MyInternshipsSections } from "./MyInternshipsParts";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

export const revalidate = 60;

export default async function MyInternshipsPage() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/student");

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "student") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell userProfile={profile}>
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        <PageHeader
          title="My Internships"
          description="Track your application progress, upcoming deadlines, and saved roles."
          badge={
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-sunken border border-border text-xs text-fg-muted">
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span>Real-time sync</span>
            </div>
          }
          className="mb-8"
        />

        <Suspense
          fallback={
            <div className="space-y-10 pb-12">
              <Skeleton className="h-36 rounded-2xl w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[280px] rounded-2xl" />
                ))}
              </div>
            </div>
          }
        >
          <div className="pb-12">
            <MyInternshipsSections />
          </div>
        </Suspense>
      </div>
    </DashboardShell>
  );
}
