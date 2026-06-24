import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ReelWithCategory } from '@reelvault/shared';
import { placeholderThumbnail, STRINGS } from '@reelvault/shared';
import { colors, radius, spacing, typography, formatDateFr } from '../lib/theme';

interface Props {
  reel: ReelWithCategory;
  onPress: (reel: ReelWithCategory) => void;
}

/** Card d'un réel : miniature en haut, titre, @auteur, date, badge catégorie. */
export function ReelCard({ reel, onPress }: Props) {
  const thumb = reel.thumbnail_url ?? placeholderThumbnail(reel.shortcode ?? reel.id);
  const title = reel.title ?? reel.caption ?? STRINGS.app.name;
  const author = reel.author_username ? `@${reel.author_username}` : null;

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <Pressable
        onPress={() => onPress(reel)}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${STRINGS.library.openInInstagram}`}
      >
        <View style={styles.thumbWrap}>
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
          <View style={styles.playBadge}>
            <Ionicons name="play" size={16} color={colors.white} />
          </View>
          {reel.category ? (
            <View style={[styles.catBadge, { backgroundColor: catBg(reel.category.color) }]}>
              <View style={[styles.catDot, { backgroundColor: reel.category.color }]} />
              <Text style={styles.catText} numberOfLines={1}>
                {reel.category.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {/* Fil d'ariane catégorie (parent › enfant ou catégorie seule) */}
          {reel.category ? (
            <Text style={styles.breadcrumb} numberOfLines={1}>
              {reel.category.parent
                ? `${reel.category.parent.name} › ${reel.category.name}`
                : reel.category.name}
            </Text>
          ) : null}

          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {/* Résumé IA */}
          {reel.summary ? (
            <Text style={styles.summary} numberOfLines={2}>
              {reel.summary}
            </Text>
          ) : null}

          {/* Tags */}
          {reel.tags && reel.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {reel.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {author ? (
              <Text style={styles.author} numberOfLines={1}>
                {author}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatDateFr(reel.added_at)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Couleur de fond translucide dérivée de la couleur de catégorie. */
function catBg(hex: string): string {
  return 'rgba(11,11,15,0.72)';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: colors.surface2,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
    padding: spacing.sm,
  },
  catBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  catDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  catText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    maxWidth: 130,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  breadcrumb: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  author: {
    color: colors.accentTo,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
});
