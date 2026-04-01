import { Skeleton } from '@/components/ui/skeleton';

export const PageSkeleton = () => (
  <div className="flex flex-col gap-4 p-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  </div>
);
