'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Library as LibraryIcon, SearchX } from 'lucide-react';
import {
  STRINGS,
  fetchReels,
  fetchCategories,
  fetchCategoryCounts,
  fetchAuthors,
  recordView,
  reelUrl,
  type Category,
  type LibraryFilters,
  type ReelWithCategory,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { ReelCard } from '@/components/library/reel-card';
import { ReelGridSkeleton } from '@/components/library/reel-card-skeleton';
import { CategoryChips } from '@/components/library/category-chips';
import { AddReelDialog } from '@/components/library/add-reel-dialog';

const PAGE_SIZE = 24;
const ALL = '__all__';

type SortValue = NonNullable<LibraryFilters['sort']>;

export function LibraryView() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 350);
  const autoAdd = searchParams.get('add') === '1';

  const [categoryId, setCategoryId] = useState<string | null>(searchParams.get('category'));
  const [authorUsername, setAuthorUsername] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>('recent');

  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [authors, setAuthors] = useState<
    { author_username: string; author_name: string | null }[]
  >([]);
  const [total, setTotal] = useState(0);

  const [reels, setReels] = useState<ReelWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const filters: LibraryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categoryId,
      authorUsername,
      sort,
    }),
    [debouncedSearch, categoryId, authorUsername, sort],
  );

  // Métadonnées (catégories, compteurs, auteurs) — chargées une fois / rafraîchies après ajout.
  const loadMeta = useCallback(async () => {
    try {
      const [cats, c, auth] = await Promise.all([
        fetchCategories(supabase),
        fetchCategoryCounts(supabase),
        fetchAuthors(supabase),
      ]);
      setCategories(cats);
      setCounts(c);
      setAuthors(auth);
      setTotal(Object.values(c).reduce((a, b) => a + b, 0));
    } catch {
      /* RLS / réseau : on garde l'état précédent */
    }
  }, [supabase]);

  // Premier chargement des réels (reset à chaque changement de filtre).
  const loadReels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReels(supabase, filters, { limit: PAGE_SIZE, offset: 0 });
      setReels(data);
      setOffset(data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setReels([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadReels();
  }, [loadReels]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await fetchReels(supabase, filters, { limit: PAGE_SIZE, offset });
      setReels((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  function openReel(reel: ReelWithCategory) {
    const url = reel.ig_url || (reel.shortcode ? reelUrl(reel.shortcode) : null);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    void recordView(supabase, reel.id);
    setReels((prev) =>
      prev.map((r) => (r.id === reel.id ? { ...r, view_count: r.view_count + 1 } : r)),
    );
  }

  const isFiltered =
    Boolean(debouncedSearch) || Boolean(categoryId) || Boolean(authorUsername);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {STRINGS.library.title}
        </h1>
        <AddReelDialog
          defaultOpen={autoAdd}
          onAdded={() => {
            loadMeta();
            loadReels();
          }}
        />
      </div>

      {/* Chips catégories */}
      <CategoryChips
        categories={categories}
        counts={counts}
        total={total}
        activeCategory={categoryId}
        onSelect={setCategoryId}
      />

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={STRINGS.library.searchPlaceholder}
            className="pl-9"
          />
        </div>

        <Select
          value={authorUsername ?? ALL}
          onValueChange={(v) => setAuthorUsername(v === ALL ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={STRINGS.library.filterByAuthor} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{STRINGS.library.filterByAuthor}</SelectItem>
            {authors.map((a) => (
              <SelectItem key={a.author_username} value={a.author_username}>
                @{a.author_username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{STRINGS.library.sortRecent}</SelectItem>
            <SelectItem value="oldest">{STRINGS.library.sortOldest}</SelectItem>
            <SelectItem value="most_viewed">{STRINGS.library.sortMostViewed}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grille */}
      {loading ? (
        <ReelGridSkeleton />
      ) : reels.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title={STRINGS.library.emptyFiltered.title}
            subtitle={STRINGS.library.emptyFiltered.subtitle}
          />
        ) : (
          <EmptyState
            icon={LibraryIcon}
            title={STRINGS.library.empty.title}
            subtitle={STRINGS.library.empty.subtitle}
            action={
              <AddReelDialog
                onAdded={() => {
                  loadMeta();
                  loadReels();
                }}
              />
            }
          />
        )
      ) : (
        <>
          <div className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4 xl:columns-5">
            {reels.map((reel, i) => (
              <ReelCard key={reel.id} reel={reel} index={i} onOpen={openReel} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? STRINGS.common.loading : 'Charger plus'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
