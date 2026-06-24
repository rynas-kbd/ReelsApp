'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Search, Library as LibraryIcon, SearchX, X } from 'lucide-react';
import {
  STRINGS,
  fetchReels,
  fetchCategoryTree,
  fetchCategoryCounts,
  fetchAuthors,
  fetchAllTags,
  recordView,
  reelUrl,
  searchReelsHybrid,
  type CategoryWithChildren,
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
import { CategoryTree } from '@/components/library/category-tree';
import { TagFilter } from '@/components/library/tag-filter';
import { AddReelDialog } from '@/components/library/add-reel-dialog';

const PAGE_SIZE = 24;
const ALL = '__all__';

type SortValue = NonNullable<LibraryFilters['sort']>;

export function LibraryView() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 400);
  const autoAdd = searchParams.get('add') === '1';

  // Filtres
  const [categoryId, setCategoryId] = useState<string | null>(searchParams.get('category'));
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [authorUsername, setAuthorUsername] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>('recent');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Métadonnées
  const [tree, setTree] = useState<CategoryWithChildren[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [allTags, setAllTags] = useState<string[]>([]);
  const [authors, setAuthors] = useState<{ author_username: string; author_name: string | null }[]>([]);
  const [total, setTotal] = useState(0);

  // Réels
  const [reels, setReels] = useState<ReelWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searchType, setSearchType] = useState<'ilike' | 'fulltext' | 'hybrid' | null>(null);

  // Calcul des categoryIds depuis l'arbre (quand une racine est sélectionnée, inclure ses enfants)
  const categoryIds = useMemo(() => {
    if (!categoryId) return null;
    const root = tree.find((r) => r.id === categoryId);
    if (root && root.children.length > 0) {
      return [root.id, ...root.children.map((c) => c.id)];
    }
    return null; // catégorie feuille → filtre exact via categoryId
  }, [categoryId, tree]);

  const filters: LibraryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categoryId: categoryIds ? null : categoryId,
      categoryIds: categoryIds ?? undefined,
      tags: activeTags.length ? activeTags : undefined,
      authorUsername,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sort,
    }),
    [debouncedSearch, categoryId, categoryIds, activeTags, authorUsername, dateFrom, dateTo, sort],
  );

  // Métadonnées — chargées une fois / rafraîchies après ajout
  const loadMeta = useCallback(async () => {
    try {
      const [t, c, auth, tags] = await Promise.all([
        fetchCategoryTree(supabase),
        fetchCategoryCounts(supabase),
        fetchAuthors(supabase),
        fetchAllTags(supabase),
      ]);
      setTree(t);
      setCounts(c);
      setAuthors(auth);
      setAllTags(tags);
      setTotal(Object.values(c).reduce((a, b) => a + b, 0));
    } catch {
      /* réseau / RLS */
    }
  }, [supabase]);

  // Chargement des réels (reset à chaque changement de filtre)
  const loadReels = useCallback(async () => {
    setLoading(true);
    setSearchType(null);
    try {
      if (debouncedSearch) {
        // Recherche hybride via l'edge function search-reels (partagée web + mobile)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const reelResults = await searchReelsHybrid(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            session.access_token,
            {
              query: debouncedSearch,
              tags: activeTags.length ? activeTags : undefined,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
              limit: PAGE_SIZE,
            },
          );
          setReels(reelResults);
          setSearchType('hybrid');
          setHasMore(false); // la recherche hybride ne pagine pas
          setOffset(reelResults.length);
          return;
        }
      }
      // Fallback : fetchReels normal (sans recherche ou si /api/search a échoué)
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
  }, [supabase, filters, debouncedSearch, activeTags, dateFrom, dateTo]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadReels(); }, [loadReels]);

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

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const isFiltered =
    Boolean(debouncedSearch) || Boolean(categoryId) || Boolean(authorUsername) ||
    activeTags.length > 0 || Boolean(dateFrom) || Boolean(dateTo);

  const hasDateFilter = Boolean(dateFrom) || Boolean(dateTo);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {STRINGS.library.title}
        </h1>
        <AddReelDialog
          defaultOpen={autoAdd}
          onAdded={() => { loadMeta(); loadReels(); }}
        />
      </div>

      {/* Layout desktop : sidebar arbre + main */}
      <div className="lg:flex lg:gap-6">
        {/* Sidebar catégories (desktop uniquement) */}
        <aside className="hidden lg:block lg:w-52 lg:shrink-0">
          <CategoryTree
            tree={tree}
            counts={counts}
            total={total}
            activeCategory={categoryId}
            onSelect={setCategoryId}
          />
        </aside>

        {/* Contenu principal */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Barre de recherche + filtres */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={STRINGS.library.searchPlaceholder}
                className="pl-9"
              />
            </div>

            {/* Auteur */}
            <Select
              value={authorUsername ?? ALL}
              onValueChange={(v) => setAuthorUsername(v === ALL ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-48">
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

            {/* Date */}
            <Button
              variant={hasDateFilter ? 'default' : 'secondary'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowDateFilter((v) => !v)}
            >
              <CalendarDays className="h-4 w-4" />
              {hasDateFilter ? `${dateFrom || '…'} → ${dateTo || '…'}` : STRINGS.library.filterByDate}
            </Button>

            {/* Tri */}
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

          {/* Filtre date (inline repliable) */}
          {showDateFilter && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3">
              <span className="text-xs font-medium text-text-muted">{STRINGS.library.filterByDate}</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">{STRINGS.library.dateFrom}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">{STRINGS.library.dateTo}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {hasDateFilter && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
                >
                  <X className="h-3.5 w-3.5" /> {STRINGS.library.clearDate}
                </button>
              )}
            </div>
          )}

          {/* Tags filter */}
          <TagFilter tags={allTags} activeTags={activeTags} onToggle={toggleTag} />

          {/* Badge de type de recherche (debug/UX) */}
          {searchType === 'hybrid' && debouncedSearch && (
            <p className="text-xs text-text-muted">
              🔍 Recherche sémantique active
            </p>
          )}

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
                    onAdded={() => { loadMeta(); loadReels(); }}
                  />
                }
              />
            )
          ) : (
            <>
              <div className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-3 xl:columns-4">
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
      </div>
    </div>
  );
}
