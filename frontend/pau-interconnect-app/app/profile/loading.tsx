import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="max-w-4xl mx-auto pb-12 mt-8">
        <header className="mb-8 px-4 sm:px-0">
          <Skeleton className="h-8 w-48 mb-2 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </header>

        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-12">
            {/* Header section skeleton */}
            <div className="space-y-6">
              <Skeleton className="h-7 w-32 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sub section skeleton */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end">
              <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
