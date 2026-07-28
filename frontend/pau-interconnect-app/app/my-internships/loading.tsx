import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <header className="flex items-center justify-between mb-8 px-4 sm:px-0 mt-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="hidden sm:flex px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-md" />
        </div>
      </header>

      <div className="space-y-10 px-4 sm:px-0 pb-12">
        <Skeleton className="h-40 rounded-3xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-[24px]" />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
