import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <Skeleton className="h-12 w-1/3 mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-8 w-1/4 mb-6" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
