import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="h-[88px] bg-white border-b border-slate-100 px-6 md:px-10 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 space-y-6">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <div className="flex-grow flex justify-end gap-3">
               <Skeleton className="h-11 w-[150px] rounded-xl" />
               <Skeleton className="h-11 w-[150px] rounded-xl" />
               <Skeleton className="h-11 w-[150px] rounded-xl" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
               <div className="flex justify-between items-start mb-6">
                 <Skeleton className="h-12 w-12 rounded-[20px]" />
                 <Skeleton className="h-8 w-20 rounded-xl" />
               </div>
               <Skeleton className="h-6 w-3/4 mb-3" />
               <Skeleton className="h-4 w-1/2 mb-6" />
               <div className="flex gap-2 mb-8">
                 <Skeleton className="h-6 w-20 rounded-lg" />
                 <Skeleton className="h-6 w-20 rounded-lg" />
               </div>
               <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
