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
  fetchCategories,
  fetchReels,
  recordView,
  reelUrl,
  STRINGS,
  type Category,
  type ReelWithCategory,
} from '@reelvault/shared';
import { Screen, GradientHeader } from '../../components/Screen';
import { ReelCard } from '../../components/ReelCard';
import { CategoryChip } from '../../components/CategoryChip';
import { EmptyState } from '../../components/EmptyState';
import { ReelCardSkeleton } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function LibraryScreen() {
  const router = useRouter();
  const [reels, setReels] = useState<ReelWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [reelData, catData] = await Promise.all([
      fetchReels(
        supabase,
        { categoryId: activeCategory, search: search.trim() || undefined, sort: 'recent' },
        { limit: 50 },
      ),
      fetchCategories(supabase),
    ]);
    setReels(reelData);
    setCategories(catData);
  }, [activeCategory, search]);

  // Chargement + rechargement quand filtre/recherche change (avec debounce léger).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openReel = useCallback(async (reel: ReelWithCategory) => {
    const url = reel.ig_url ?? (reel.shortcode ? reelUrl(reel.shortcode) : null);
    if (!url) return;
    void recordView(supabase, reel.id);
    await Linking.openURL(url);
  }, []);

  const hasFilters = activeCategory !== null || search.trim().length > 0;

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

  return (
    <Screen>
      <GradientHeader title={STRINGS.library.title} />

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        <CategoryChip
          label={STRINGS.library.allCategories}
          active={activeCategory === null}
          onPress={() => setActiveCategory(null)}
        />
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.name}
            color={cat.color}
            active={activeCategory === cat.id}
            onPress={() => setActiveCategory(cat.id)}
          />
        ))}
      </ScrollView>

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
