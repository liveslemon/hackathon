import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="pb-24 md:pb-12 max-w-7xl mx-auto px-4 sm:px-0">
        {/* 1. Career Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-surface rounded-2xl p-5 border border-border flex items-center gap-4 h-[88px]"
            >
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* 2. Logbook / CV prompt Skeleton */}
        <div className="h-32 bg-surface rounded-2xl mb-8 border border-border p-6 flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>

        {/* 3. Filter Bar Skeleton */}
        <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border mb-10 flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>

        {/* 4. Internship Grid Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-surface rounded-2xl p-6 border border-border shadow-xs flex flex-col h-[280px]"
            >
              <div className="flex justify-between items-start mb-5">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4 mb-2.5 rounded-md" />
              <Skeleton className="h-4 w-1/2 mb-5 rounded-md" />

              <div className="flex gap-2 mb-6 mt-auto">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
