import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="max-w-5xl mx-auto px-4 md:px-0 py-6 md:py-10">
        <Skeleton className="h-5 w-36 mb-6 rounded-md" /> {/* Back link */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card Skeleton */}
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-4">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-5 w-40 rounded-md" />
              <div className="flex flex-wrap gap-2 pt-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-xl" />
                ))}
              </div>
            </div>

            {/* Description Card Skeleton */}
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-4">
              <Skeleton className="h-6 w-32 rounded-md" />
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>
            </div>

            {/* Requirements Card Skeleton */}
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-4">
              <Skeleton className="h-6 w-28 rounded-md" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-10 w-full rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-3">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
