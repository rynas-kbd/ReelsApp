import { Suspense } from 'react';
import { LibraryView } from '@/components/library/library-view';
import { ReelGridSkeleton } from '@/components/library/reel-card-skeleton';

export default function LibraryPage() {
  return (
    <Suspense fallback={<ReelGridSkeleton />}>
      <LibraryView />
    </Suspense>
  );
}
