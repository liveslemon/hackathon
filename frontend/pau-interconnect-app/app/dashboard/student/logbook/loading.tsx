import { Skeleton, Card, CardContent, Stack } from "@/components/ui";

export default function LogbookLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
