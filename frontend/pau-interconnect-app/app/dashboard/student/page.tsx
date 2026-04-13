import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Suspense } from "react";
import Loading from "./loading";
import DashboardShellWrapper from "./DashboardShellWrapper";
import { ProfileHeaderSection, InternshipGridSection, StudentLogbookSection } from "./DashboardParts";

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
        getAll() { return cookieStore.getAll(); },
        setAll() {} // Read-only shell doesn't need to set cookies
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/student");
  }

  // THE INSTANT SHELL
  // This part of the code finishes instantly because we aren't 'awaiting' 
  // the heavy database queries yet. Suspense handles the background work.
  return (
    <DashboardShellWrapper userProfile={user}>
      <div className="pb-24 md:pb-12">
        {/* 1. Logbook Section (Independent loading) */}
        <Suspense fallback={<div className="h-40 bg-white rounded-3xl animate-pulse mb-8" />}>
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
