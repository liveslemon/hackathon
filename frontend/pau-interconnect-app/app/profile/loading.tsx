import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0">
        <header className="mb-8 space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </header>

        <div className="space-y-6">
          <Skeleton className="h-12 w-full rounded-2xl" />

          <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-border flex justify-end">
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
