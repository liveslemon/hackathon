import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Skeleton } from "@/components/ui";
import { Clock } from "lucide-react";
import { MyInternshipsSections } from "./MyInternshipsParts";
import { supabaseFetch } from "@/lib/supabase-fetch";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell userProfile={profile}>
      <header className="flex items-center justify-between mb-8 px-4 sm:px-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 leading-tight">
            My Internships
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your applications and active roles
          </p>
        </div>
        <div className="hidden sm:flex px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Clock className="text-emerald-500 w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Updated just now
          </span>
        </div>
      </header>

      <Suspense
        fallback={
          <div className="space-y-10 px-4 sm:px-0">
            <Skeleton className="h-40 rounded-2xl w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        }
      >
        <div className="px-4 sm:px-0 pb-12">
          <MyInternshipsSections />
        </div>
      </Suspense>
    </DashboardShell>
  );
}
