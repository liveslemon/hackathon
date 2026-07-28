import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="max-w-4xl mx-auto px-4 md:px-0 py-6 md:py-10">
        <Skeleton className="h-5 w-32 mb-8 rounded-md" /> {/* Back link */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="mb-3">
                <Skeleton className="h-8 w-3/4 mb-2 rounded-lg" />
                <Skeleton className="h-5 w-48 rounded-md" />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-24 rounded-md" />
                ))}
              </div>
            </div>

            <Skeleton className="h-px w-full bg-slate-100 my-8" />

            <div className="space-y-6">
              <Skeleton className="h-6 w-32 rounded-md mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Skeleton className="h-[300px] rounded-2xl" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
