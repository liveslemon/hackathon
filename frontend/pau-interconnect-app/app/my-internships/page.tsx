import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Suspense } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Typography, Stack, Skeleton } from "@/components/ui";
import { FiClock } from "react-icons/fi";
import { MyInternshipsSections } from "./MyInternshipsParts";

export const revalidate = 60;

export default async function MyInternshipsPage() {
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
  if (!user) redirect("/login/student");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell userProfile={profile}>
      <header className="flex items-center justify-between mb-8 px-4 sm:px-0">
        <div>
          <Typography variant="h3" weight="bold" className="text-slate-900 leading-tight">My Internships</Typography>
          <Typography variant="caption" className="text-slate-400 font-medium tracking-wide">Manage your applications and active SIWES roles</Typography>
        </div>
        <div className="hidden sm:flex px-5 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <FiClock className="text-emerald-500 w-4 h-4" />
          </div>
          <Typography variant="caption" weight="bold" className="text-slate-600 uppercase tracking-widest text-[10px]">Updated just now</Typography>
        </div>
      </header>

      <Suspense fallback={
        <div className="space-y-12 px-4 sm:px-0">
          <Skeleton className="h-48 rounded-[32px] w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      }>
        <div className="px-4 sm:px-0 pb-10">
          <MyInternshipsSections />
        </div>
      </Suspense>
    </DashboardShell>
  );
}
