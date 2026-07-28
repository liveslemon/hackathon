import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header matching AdminClient */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-[20px]" />
            ))}
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <Skeleton className="h-10 w-10 rounded-[20px]" />
            <Skeleton className="h-10 w-32 rounded-[20px]" />
          </div>
        </header>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-3xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-3xl" />
          </div>

          <div className="space-y-8">
            <Skeleton className="h-[500px] rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
