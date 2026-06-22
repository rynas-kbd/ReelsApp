import { Skeleton } from '@/components/ui/skeleton';

const ASPECTS = ['aspect-[4/5]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[4/6]', 'aspect-[4/5]'];

export function ReelCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="mb-3 block break-inside-avoid overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-soft sm:mb-4">
      <Skeleton className={`w-full rounded-none ${ASPECTS[index % ASPECTS.length]}`} />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ReelGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4 xl:columns-5">
      {Array.from({ length: count }).map((_, i) => (
        <ReelCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
