import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "employer" }}>
      <main className="max-w-6xl mx-auto py-12 px-6">
        <div className="mb-12">
          <Skeleton className="h-10 w-64 mb-2 rounded-lg" />
          <Skeleton className="h-5 w-48 rounded-md" />
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-10">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex-1 min-w-[140px] h-14 bg-white rounded-2xl border border-slate-100 flex items-center px-6 gap-3"
            >
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-[32px]" />
          ))}
        </div>

        <Skeleton className="h-px w-full my-12" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 rounded-xl mb-6 ml-2" />
            <Skeleton className="h-[400px] w-full rounded-[40px]" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 rounded-xl mb-6 ml-2" />
            <Skeleton className="h-[400px] w-full rounded-[40px]" />
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
