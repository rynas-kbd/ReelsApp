'use client';

import { STRINGS } from '@reelvault/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryManager } from '@/components/dashboard/category-manager';
import { StatsView } from '@/components/dashboard/stats-view';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {STRINGS.nav.dashboard}
      </h1>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">{STRINGS.stats.title}</TabsTrigger>
          <TabsTrigger value="categories">{STRINGS.categories.title}</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <StatsView />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
