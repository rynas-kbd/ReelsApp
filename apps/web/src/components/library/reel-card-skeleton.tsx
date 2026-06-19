import { Skeleton } from '@/components/ui/skeleton';

export function ReelCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-card">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ReelGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ReelCardSkeleton key={i} />
      ))}
    </div>
  );
}
