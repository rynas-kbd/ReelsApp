import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  STRINGS,
  fetchDigests,
  fetchLatestDigest,
  placeholderThumbnail,
  rateDigest,
  recordView,
  type Digest,
  type DigestWithReels,
} from '@reelvault/shared';
import { Screen, GradientHeader, SectionLabel } from '../../components/Screen';
import { GradientButton } from '../../components/GradientButton';
import { StarRating } from '../../components/secondbrain/StarRating';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { formatDateFr } from '../../lib/theme';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function DigestScreen() {
  const { userId } = useAuth();
  const { show } = useToast();

  const [digest, setDigest] = useState<DigestWithReels | null>(null);
  const [history, setHistory] = useState<Digest[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [latest, hist] = await Promise.all([
        fetchLatestDigest(supabase),
        fetchDigests(supabase),
      ]);
      setDigest(latest);
      setRating(latest?.rating ?? null);
      setHistory(hist);
    } catch {
      show(STRINGS.common.error, 'error');
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  React.useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleRate(stars: number) {
    if (!digest || rating !== null) return;
    setRatingSaving(true);
    try {
      await rateDigest(supabase, digest.id, stars);
      setRating(stars);
      setDigest((d) => (d ? { ...d, rating: stars } : d));
      show(STRINGS.digest.thanks, 'success');
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setRatingSaving(false);
    }
  }

  async function handleGenerate() {
    if (!userId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-digest', { body: {} });
      if (error) throw error;
      // Vérifie si < 3 réels (la fonction renvoie un message textuel dans results)
      const results = (data as { results?: Record<string, string> })?.results ?? {};
      const msg = Object.values(results)[0] ?? '';
      if (msg.includes('seulement')) {
        show(STRINGS.digest.tooFewReels, 'error');
        return;
      }
      show('Sélection générée !', 'success');
      await load();
    } catch {
      show(STRINGS.digest.generateError, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function openReel(igUrl: string, reelId: string) {
    await recordView(supabase, reelId);
    await Linking.openURL(igUrl).catch(() => {});
  }

  if (loading) {
    return (
      <Screen>
        <GradientHeader title={STRINGS.digest.title} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader
        title={STRINGS.digest.title}
        right={
          <Pressable onPress={handleGenerate} disabled={generating} style={styles.genBtn}>
            {generating ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={colors.accent} />
            )}
          </Pressable>
        }
      />
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.body}>
            {!digest ? (
              <View style={styles.emptyCard}>
                <Ionicons name="sparkles-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyText}>{STRINGS.digest.empty}</Text>
                <GradientButton
                  label={generating ? STRINGS.digest.generating : STRINGS.digest.generateNow}
                  onPress={handleGenerate}
                  loading={generating}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              <>
                {/* Synthèse IA */}
                {digest.summary && (
                  <View style={styles.card}>
                    <Text style={styles.labelUpper}>{STRINGS.digest.summaryTitle}</Text>
                    <Text style={styles.summary}>{digest.summary}</Text>
                    <View style={styles.metaRow}>
                      {digest.frequency && (
                        <View style={styles.metaChip}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.metaText}>
                            {STRINGS.digest.frequencyLabel(digest.frequency)}
                          </Text>
                        </View>
                      )}
                      {digest.period_start && digest.period_end && (
                        <Text style={styles.metaText}>
                          {STRINGS.digest.periodLabel(
                            formatDateFr(digest.period_start),
                            formatDateFr(digest.period_end),
                          )}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Sélection — grille 2 colonnes */}
                <SectionLabel>{STRINGS.digest.selectionTitle}</SectionLabel>
                <View style={styles.grid}>
                  {digest.reels.map((reel) => {
                    const thumb =
                      reel.thumbnail_url || placeholderThumbnail(reel.shortcode ?? reel.id);
                    return (
                      <Pressable
                        key={reel.id}
                        style={({ pressed }) => [
                          styles.reelCard,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                        onPress={() => openReel(reel.ig_url, reel.id)}
                      >
                        <Image
                          source={{ uri: thumb }}
                          style={styles.reelThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.reelOverlay} />
                        {reel.category && (
                          <View
                            style={[
                              styles.catBadge,
                              { backgroundColor: `${reel.category.color}30` },
                            ]}
                          >
                            <Text
                              style={[styles.catText, { color: reel.category.color }]}
                              numberOfLines={1}
                            >
                              {reel.category.name}
                            </Text>
                          </View>
                        )}
                        <View style={styles.reelInfo}>
                          <Text style={styles.reelTitle} numberOfLines={2}>
                            {reel.title || reel.caption || 'Réel'}
                          </Text>
                          {reel.reason && (
                            <Text style={styles.reelReason} numberOfLines={2}>
                              {reel.reason}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Vote */}
                <View style={styles.card}>
                  <Text style={styles.rateTitle}>{STRINGS.digest.rateTitle}</Text>
                  <Text style={styles.rateHelp}>
                    {rating !== null ? STRINGS.digest.rated : STRINGS.digest.rateHelp}
                  </Text>
                  <View style={styles.starsRow}>
                    <StarRating
                      value={rating}
                      disabled={ratingSaving}
                      onRate={handleRate}
                    />
                    {ratingSaving && (
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    )}
                  </View>
                </View>
              </>
            )}

            {/* Historique */}
            {history.length > 1 && (
              <View>
                <SectionLabel>{STRINGS.digest.history}</SectionLabel>
                {history.slice(1).map((d) => (
                  <View key={d.id} style={styles.historyRow}>
                    <View>
                      <Text style={styles.historyPeriod}>
                        {d.frequency
                          ? STRINGS.digest.period[
                              d.frequency as 'weekly' | 'monthly'
                            ] ?? d.frequency
                          : '—'}
                      </Text>
                      {d.period_start && d.period_end && (
                        <Text style={styles.historyDate}>
                          {STRINGS.digest.periodLabel(
                            formatDateFr(d.period_start),
                            formatDateFr(d.period_end),
                          )}
                        </Text>
                      )}
                    </View>
                    {d.rating ? (
                      <View style={styles.historyRating}>
                        <Ionicons name="star" size={14} color={colors.warning} />
                        <Text style={styles.historyRatingText}>{d.rating}/5</Text>
                      </View>
                    ) : (
                      <Text style={styles.notRated}>Non noté</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {history.length === 0 && !digest && (
              <Text style={styles.noHistory}>{STRINGS.digest.noHistory}</Text>
            )}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  labelUpper: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  // Grille réels
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reelCard: {
    width: '48%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reelThumb: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.surface3,
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  catBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  catText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
  },
  reelInfo: {
    padding: spacing.sm,
    gap: 3,
  },
  reelTitle: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    lineHeight: 16,
  },
  reelReason: {
    color: colors.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  // Vote
  rateTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  rateHelp: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  // Historique
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  historyPeriod: {
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  historyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyRatingText: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  notRated: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  // Vide
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  noHistory: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
});
