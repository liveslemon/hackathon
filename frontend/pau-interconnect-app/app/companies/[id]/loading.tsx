import { Skeleton } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-24 rounded-full mb-6" />{" "}
          {/* Back button */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm mb-8 space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-[28px]" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-1/3 rounded-lg" />
                <Skeleton className="h-5 w-1/4 rounded-md" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-4/6 rounded-md" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm h-[200px] flex flex-col"
                >
                  <Skeleton className="h-6 w-3/4 mb-3 rounded-md" />
                  <Skeleton className="h-4 w-1/2 mb-6 rounded-md" />
                  <div className="mt-auto">
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
