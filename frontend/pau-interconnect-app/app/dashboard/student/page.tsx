import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Suspense } from "react";
import Loading from "./loading";
import DashboardShellWrapper from "./DashboardShellWrapper";
import { InternshipGridSection, StudentLogbookSection } from "./DashboardParts";
import CareerMetrics from "./CareerMetrics";
import {
  getDevModeProfileForRole,
  getDevModeRoleFromCookie,
} from "@/lib/role-guard";

// Optimization: Revalidate the dashboard data every 60 seconds
export const revalidate = 60;

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}, // Read-only shell doesn't need to set cookies
      },
    },
  );

  const devRole = getDevModeRoleFromCookie(
    cookieStore.get("dev_mode_role")?.value,
  );
  const devProfile = getDevModeProfileForRole(devRole);

  if (devRole === "student") {
    return (
      <DashboardShellWrapper userProfile={devProfile}>
        <div className="pb-24 md:pb-12">
          <CareerMetrics />
          <Suspense
            fallback={
              <div className="h-40 bg-white rounded-3xl animate-pulse mb-8" />
            }
          >
            <StudentLogbookSection />
          </Suspense>
          <Suspense fallback={<Loading />}>
            <InternshipGridSection />
          </Suspense>
        </div>
      </DashboardShellWrapper>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/student");
  }

  // THE INSTANT SHELL
  // This part of the code finishes instantly because we aren't 'awaiting'
  // the heavy database queries yet. Suspense handles the background work.
  return (
    <DashboardShellWrapper
      userProfile={{ id: user.id, email: user.email ?? null }}
    >
      <div className="pb-24 md:pb-12">
        {/* 1. Career Metrics */}
        <CareerMetrics />

        {/* 2. Logbook Section (Independent loading) */}
        <Suspense
          fallback={
            <div className="h-40 bg-white rounded-3xl animate-pulse mb-8" />
          }
        >
          <StudentLogbookSection />
        </Suspense>

        {/* 2. Main Content Section (Internships & Matches) */}
        <Suspense fallback={<Loading />}>
          <InternshipGridSection />
        </Suspense>
      </div>
    </DashboardShellWrapper>
  );
}
