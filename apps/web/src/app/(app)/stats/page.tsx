import { STRINGS } from '@reelvault/shared';
import { StatsView } from '@/components/dashboard/stats-view';

export default function StatsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {STRINGS.stats.title}
      </h1>
      <StatsView />
    </div>
  );
}
