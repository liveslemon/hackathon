import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="pb-24 md:pb-12">
        {/* 1. Career Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-4 h-[88px]"
            >
              <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* 3. Logbook Section / CV card space Skeleton */}
        <div className="h-40 bg-white rounded-3xl mb-8 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex p-6">
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>

        {/* 4. Internship Grid Header Skeleton */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-hidden">
            <Skeleton className="h-9 w-[120px] rounded-full" />
            <Skeleton className="h-9 w-[120px] rounded-full" />
          </div>
        </div>

        {/* 5. Internship Grid Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col h-[280px]"
            >
              <div className="flex justify-between items-start mb-6">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 mb-3 rounded-md" />
              <Skeleton className="h-4 w-1/2 mb-6 rounded-md" />

              <div className="flex gap-2 mb-8 mt-auto">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-full rounded-2xl mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
