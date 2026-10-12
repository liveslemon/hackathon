import { Skeleton, Card } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";

export default function Loading() {
  return (
    <DashboardShell userProfile={{ role: "student" }}>
      <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">
        <div>
          <Skeleton className="h-9 w-24 rounded-full mb-6" />

          {/* Company Card Skeleton */}
          <Card className="p-8 border border-border shadow-xs mb-8 space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-2xl" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-1/3 rounded-lg" />
                <Skeleton className="h-5 w-1/4 rounded-md" />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-4/6 rounded-md" />
            </div>
          </Card>

          {/* Open Roles Grid Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card
                  key={i}
                  className="p-6 border border-border shadow-xs h-[200px] flex flex-col justify-between"
                >
                  <div>
                    <Skeleton className="h-6 w-3/4 mb-3 rounded-md" />
                    <Skeleton className="h-4 w-1/2 mb-4 rounded-md" />
                  </div>
                  <div className="mt-auto">
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
