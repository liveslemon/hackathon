import { Skeleton, Container, Stack } from "@/components/ui";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60 py-12">
      <Container maxWidth="xl">
        <Stack spacing={8}>
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </Stack>
      </Container>
    </div>
  );
}
