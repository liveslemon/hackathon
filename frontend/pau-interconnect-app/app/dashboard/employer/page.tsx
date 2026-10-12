import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton, PageHeader, Divider } from "@/components/ui";
import {
  EmployerStatsSection,
  EmployerQuickActionsSection,
  EmployerRecentApplicantsSection,
  EmployerLogbookAlertsSection,
} from "./EmployerParts";
import DashboardShellWrapper from "./DashboardShellWrapper";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
  getDashboardPathForRole,
  getActiveDevModeRole,
  getDevModeProfileForRole,
  getUserRoleProfile,
} from "@/lib/role-guard";

export const revalidate = 0; // Fresh dashboard data

export default async function EmployerDashboardPage() {
  const supabase = await getSupabaseServer();
  const cookieStore = await cookies();
  const devRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });
  const devProfile = getDevModeProfileForRole(devRole);
  const companyName =
    typeof devProfile?.company_name === "string"
      ? devProfile.company_name
      : "Dev Mode Company";

  if (devRole === "employer") {
    return (
      <DashboardShellWrapper userProfile={devProfile}>
        <main className="max-w-6xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
          <PageHeader
            title="Recruitment Overview"
            description={`Managing ${companyName}'s activity.`}
            className="mb-8"
          />

          <EmployerQuickActionsSection
            profile={devProfile as Record<string, unknown>}
          />

          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[140px] rounded-2xl" />
                ))}
              </div>
            }
          >
            <EmployerStatsSection />
          </Suspense>

          <Divider className="my-10" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <Suspense
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-7 w-48 rounded-xl" />
                  <Skeleton className="h-[360px] w-full rounded-2xl" />
                </div>
              }
            >
              <EmployerRecentApplicantsSection />
            </Suspense>

            <Suspense
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-7 w-48 rounded-xl" />
                  <Skeleton className="h-[360px] w-full rounded-2xl" />
                </div>
              }
            >
              <EmployerLogbookAlertsSection />
            </Suspense>
          </div>
        </main>
      </DashboardShellWrapper>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "employer") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-6xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
        <PageHeader
          title="Recruitment Overview"
          description={`Managing ${profile.company_name}'s activity.`}
          className="mb-8"
        />

        <EmployerQuickActionsSection profile={profile} />

        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[140px] rounded-2xl" />
              ))}
            </div>
          }
        >
          <EmployerStatsSection />
        </Suspense>

        <Divider className="my-10" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-7 w-48 rounded-xl" />
                <Skeleton className="h-[360px] w-full rounded-2xl" />
              </div>
            }
          >
            <EmployerRecentApplicantsSection />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-7 w-48 rounded-xl" />
                <Skeleton className="h-[360px] w-full rounded-2xl" />
              </div>
            }
          >
            <EmployerLogbookAlertsSection />
          </Suspense>
        </div>
      </main>
    </DashboardShellWrapper>
  );
}
