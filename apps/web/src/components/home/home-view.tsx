'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Eye, Film, FolderTree, Plus, Users } from 'lucide-react';
import {
  STRINGS,
  fetchReels,
  fetchCategories,
  fetchCategoryCounts,
  fetchAuthors,
  placeholderThumbnail,
  reelUrl,
  type Category,
  type ReelWithCategory,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddReelDialog } from '@/components/library/add-reel-dialog';
import { CategoryIcon } from '@/components/category-icon';
import { formatDate } from '@/lib/utils';

export function HomeView({ displayName }: { displayName: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [recent, setRecent] = useState<ReelWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [authors, setAuthors] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, cats, c, auth] = await Promise.all([
          fetchReels(supabase, { sort: 'recent' }, { limit: 6, offset: 0 }),
          fetchCategories(supabase),
          fetchCategoryCounts(supabase),
          fetchAuthors(supabase),
        ]);
        setRecent(r);
        setCategories(cats);
        setCounts(c);
        setAuthors(auth.length);
      } catch {
        /* RLS / réseau */
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const topCategories = [...categories]
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-none bg-gradient-accent text-white shadow-glow">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-xl">
            <p className="text-sm/none font-medium text-white/80">
              {STRINGS.home.greeting}
              {displayName ? `, ${displayName}` : ''} 👋
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
              {STRINGS.home.heroTitle}
            </h1>
            <p className="mt-2 text-sm text-white/85">{STRINGS.home.heroSubtitle}</p>
          </div>
          <AddReelDialog
            trigger={
              <Button variant="secondary" size="lg" className="shrink-0 border-none bg-white text-text hover:bg-white/90">
                <Plus />
                {STRINGS.nav.add}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard icon={Film} label={STRINGS.home.statReels} value={total} loading={loading} />
        <KpiCard icon={FolderTree} label={STRINGS.home.statCategories} value={categories.length} loading={loading} />
        <KpiCard icon={Users} label={STRINGS.home.statAuthors} value={authors} loading={loading} />
      </div>

      {/* Catégories en vedette */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">{STRINGS.home.featuredCategories}</h2>
          <Link href="/categories" className="flex items-center gap-1 text-sm text-accent hover:underline">
            {STRINGS.home.seeAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : topCategories.length === 0 ? (
          <p className="text-sm text-text-muted">{STRINGS.categories.title}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/library?category=${cat.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                >
                  <CategoryIcon icon={cat.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{cat.name}</p>
                  <p className="text-xs text-text-muted">
                    {STRINGS.categories.reelCount(counts[cat.id] ?? 0)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Récemment ajoutés */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">{STRINGS.home.recent}</h2>
          <Link href="/library" className="flex items-center gap-1 text-sm text-accent hover:underline">
            {STRINGS.home.seeAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="font-display text-base font-semibold text-text">{STRINGS.home.emptyTitle}</p>
              <p className="text-sm text-text-secondary">{STRINGS.home.emptySubtitle}</p>
              <AddReelDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((reel) => {
              const thumb = reel.thumbnail_url || placeholderThumbnail(reel.shortcode ?? reel.id);
              const href = reel.ig_url || (reel.shortcode ? reelUrl(reel.shortcode) : '#');
              return (
                <a
                  key={reel.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
                    <Image
                      src={thumb}
                      alt={reel.title || 'Réel'}
                      fill
                      sizes="(max-width:640px) 50vw, 16vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    {reel.category && (
                      <span
                        className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-black/20"
                        style={{ backgroundColor: reel.category.color }}
                      />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-1 text-xs font-medium text-text">
                      {reel.title || 'Réel sans titre'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                      <Eye className="h-3 w-3" />
                      {reel.view_count} · {formatDate(reel.added_at)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Film;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="font-display text-xl font-bold text-text sm:text-2xl">{value}</p>
          )}
          <p className="text-xs text-text-secondary">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
