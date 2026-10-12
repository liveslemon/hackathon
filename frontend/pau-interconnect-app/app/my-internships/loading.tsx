import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-0 mt-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="hidden sm:flex px-4 py-2 bg-surface rounded-xl border border-border items-center gap-2.5">
            <Skeleton className="w-6 h-6 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </header>

        <div className="space-y-10 pb-12">
          <Skeleton className="h-36 rounded-2xl w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
