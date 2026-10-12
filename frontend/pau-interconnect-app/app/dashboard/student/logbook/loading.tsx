import { Skeleton, Card } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function LogbookLoading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-0 py-6 md:py-8 space-y-6">
        <div className="flex justify-between items-center pb-6 border-b border-border">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-3">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-44 w-full rounded-xl" />
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-9 w-32 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
