import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchCategoryTree,
  fetchAllTags,
  fetchReels,
  recordView,
  reelUrl,
  searchReelsHybrid,
  STRINGS,
  type CategoryWithChildren,
  type ReelWithCategory,
} from '@reelvault/shared';
import { Screen, GradientHeader } from '../../components/Screen';
import { ReelCard } from '../../components/ReelCard';
import { CategoryChip } from '../../components/CategoryChip';
import { EmptyState } from '../../components/EmptyState';
import { ReelCardSkeleton } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import { SUPABASE_URL } from '../../lib/env';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function LibraryScreen() {
  const router = useRouter();
  const [reels, setReels] = useState<ReelWithCategory[]>([]);
  const [tree, setTree] = useState<CategoryWithChildren[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Nœud racine actif (pour afficher les sous-catégories)
  const activeCategoryNode = useMemo(
    () => tree.find((r) => r.id === activeCategory) ?? null,
    [tree, activeCategory],
  );

  /**
   * Charge métadonnées (arbre + tags) + réels filtrés en un appel.
   * Prend les paramètres en argument (pas via closure) pour éviter les boucles.
   */
  const load = useCallback(
    async (catId: string | null, tags: string[]) => {
      const [treeData, tagsData] = await Promise.all([
        fetchCategoryTree(supabase),
        fetchAllTags(supabase),
      ]);
      setTree(treeData);
      setAllTags(tagsData);

      // Calculer les categoryIds depuis l'arbre fraîchement chargé
      let catIds: string[] | null = null;
      if (catId) {
        const root = treeData.find((r) => r.id === catId);
        if (root && root.children.length > 0) {
          catIds = [root.id, ...root.children.map((c) => c.id)];
        }
      }

      const data = await fetchReels(
        supabase,
        {
          categoryId: catIds ? null : catId,
          categoryIds: catIds ?? undefined,
          tags: tags.length ? tags : undefined,
          sort: 'recent',
        },
        { limit: 50 },
      );
      setReels(data);
    },
    [], // stable — paramètres passés en arguments
  );

  // Rechargement avec debounce sur recherche / filtres
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        if (search.trim()) {
          // Recherche hybride via l'edge function search-reels
          const {
            data: { session },
          } = await supabase.auth.getSession();
          let results: ReelWithCategory[];
          if (session) {
            results = await searchReelsHybrid(SUPABASE_URL, session.access_token, {
              query: search.trim(),
              tags: activeTags.length ? activeTags : undefined,
              limit: 50,
            });
          } else {
            // Repli ilike si pas de session (démarrage froid)
            results = await fetchReels(
              supabase,
              { search: search.trim(), tags: activeTags.length ? activeTags : undefined, sort: 'recent' },
              { limit: 50 },
            );
          }
          if (!cancelled) setReels(results);
        } else {
          await load(activeCategory, activeTags);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [load, search, activeCategory, activeTags]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(activeCategory, activeTags);
    } finally {
      setRefreshing(false);
    }
  }, [load, activeCategory, activeTags]);

  const openReel = useCallback(async (reel: ReelWithCategory) => {
    const url = reel.ig_url ?? (reel.shortcode ? reelUrl(reel.shortcode) : null);
    if (!url) return;
    void recordView(supabase, reel.id);
    await Linking.openURL(url);
  }, []);

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const hasFilters =
    activeCategory !== null || activeTags.length > 0 || search.trim().length > 0;

  const renderItem = useCallback(
    ({ item }: { item: ReelWithCategory }) => <ReelCard reel={item} onPress={openReel} />,
    [openReel],
  );

  const listEmpty = useMemo(() => {
    if (loading) return null;
    if (hasFilters) {
      return (
        <EmptyState
          icon="search-outline"
          title={STRINGS.library.emptyFiltered.title}
          subtitle={STRINGS.library.emptyFiltered.subtitle}
        />
      );
    }
    return (
      <EmptyState
        icon="film-outline"
        title={STRINGS.library.empty.title}
        subtitle={STRINGS.library.empty.subtitle}
        ctaLabel={STRINGS.library.empty.cta}
        onCta={() => router.push('/(tabs)/add')}
      />
    );
  }, [loading, hasFilters, router]);

  // Sous-catégories de la racine active (si elle en a)
  const subCategories = activeCategoryNode?.children ?? [];

  return (
    <Screen>
      <GradientHeader title={STRINGS.library.title} />

      {/* Barre de recherche */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={STRINGS.library.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.textMuted}
            onPress={() => setSearch('')}
          />
        ) : null}
      </View>

      {/* Rangée 1 : chips racines */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        <CategoryChip
          label={STRINGS.library.allCategories}
          active={activeCategory === null}
          onPress={() => {
            setActiveCategory(null);
            setActiveTags([]);
          }}
        />
        {tree.map((root) => (
          <CategoryChip
            key={root.id}
            label={root.name}
            color={root.color}
            active={
              activeCategory === root.id ||
              root.children.some((c) => c.id === activeCategory)
            }
            onPress={() =>
              setActiveCategory((prev) => (prev === root.id ? null : root.id))
            }
          />
        ))}
      </ScrollView>

      {/* Rangée 2 : sous-catégories (quand racine avec enfants active) */}
      {subCategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.subChipsScroll}
        >
          <CategoryChip
            label={`Tous — ${activeCategoryNode?.name ?? ''}`}
            active={activeCategory === activeCategoryNode?.id}
            onPress={() => setActiveCategory(activeCategoryNode?.id ?? null)}
          />
          {subCategories.map((sub) => (
            <CategoryChip
              key={sub.id}
              label={sub.name}
              color={sub.color}
              active={activeCategory === sub.id}
              onPress={() =>
                setActiveCategory((prev) =>
                  prev === sub.id ? (activeCategoryNode?.id ?? null) : sub.id,
                )
              }
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Rangée 3 : tags multi-select */}
      {allTags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.tagsScroll}
        >
          {allTags.map((tag) => (
            <CategoryChip
              key={tag}
              label={`#${tag}`}
              active={activeTags.includes(tag)}
              onPress={() => toggleTag(tag)}
            />
          ))}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={styles.listContent}>
          {[0, 1, 2].map((i) => (
            <ReelCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            reels.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={listEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.base,
    paddingVertical: spacing.md,
  },
  chipsScroll: {
    flexGrow: 0,
    marginTop: spacing.md,
  },
  subChipsScroll: {
    flexGrow: 0,
    marginTop: spacing.xs,
  },
  tagsScroll: {
    flexGrow: 0,
    marginTop: spacing.xs,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  emptyContainer: {
    flexGrow: 1,
  },
});
