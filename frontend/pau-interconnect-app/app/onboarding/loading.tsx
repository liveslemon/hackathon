import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 md:p-12">
        <div className="flex justify-center mb-8">
          <Skeleton className="h-16 w-16 rounded-2xl" />
        </div>

        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4 rounded-lg" />
          <Skeleton className="h-4 w-96 mx-auto rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border-2 border-slate-100 p-6 flex flex-col items-center text-center"
            >
              <Skeleton className="h-12 w-12 rounded-full mb-4" />
              <Skeleton className="h-6 w-32 mb-2 rounded-md" />
              <Skeleton className="h-4 w-48 mb-6 rounded-md" />
              <Skeleton className="h-px w-full bg-slate-100 mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
