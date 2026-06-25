import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchReelById,
  updateReelNotes,
  recordView,
  reelUrl,
  placeholderThumbnail,
  type ReelWithCategory,
} from '@reelvault/shared';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../lib/theme';
import type { Theme } from '@reelvault/design-tokens';
import { supabase } from '../../lib/supabase';
import { formatDateFr } from '../../lib/theme';

export default function ReelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [reel, setReel] = useState<ReelWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchReelById(supabase, id as string).then((data) => {
      if (!data) {
        show('Réel introuvable', 'error');
        router.back();
        return;
      }
      setReel(data);
      setNotes(data.notes ?? '');
    }).catch(() => {
      show('Erreur de chargement', 'error');
      router.back();
    }).finally(() => setLoading(false));
  }, [id]);

  const openInInstagram = useCallback(async () => {
    if (!reel) return;
    const url = reel.ig_url ?? (reel.shortcode ? reelUrl(reel.shortcode) : null);
    if (!url) return;
    void recordView(supabase, reel.id);
    await Linking.openURL(url);
  }, [reel]);

  const saveNotes = useCallback(async () => {
    if (!reel) return;
    setSavingNotes(true);
    try {
      await updateReelNotes(supabase, reel.id, notes.trim() || null);
      show('Notes sauvegardées', 'success');
    } catch {
      show('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSavingNotes(false);
    }
  }, [reel, notes]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!reel) return null;

  const title = reel.title ?? reel.caption ?? 'Réel Instagram';
  const thumb = reel.thumbnail_url ?? placeholderThumbnail(reel.shortcode ?? reel.id);
  const catColor = reel.category?.color;
  const breadcrumb = reel.category
    ? reel.category.parent
      ? `${reel.category.parent.name} › ${reel.category.name}`
      : reel.category.name
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          <Text style={styles.backText}>Bibliothèque</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail */}
        <View style={styles.thumbWrap}>
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
          {/* Category badge overlay */}
          {catColor && breadcrumb ? (
            <View style={[styles.catBadge, {
              backgroundColor: hexAlpha(catColor, 0.18),
              borderColor: hexAlpha(catColor, 0.35),
            }]}>
              <View style={[styles.catDot, { backgroundColor: catColor }]} />
              <Text style={[styles.catText, { color: catColor }]} numberOfLines={1}>
                {breadcrumb}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {reel.author_username ? (
              <Text style={styles.author}>@{reel.author_username}</Text>
            ) : null}
            <View style={styles.metaRight}>
              {reel.view_count > 0 ? (
                <View style={styles.viewsWrap}>
                  <Ionicons name="eye-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.views}>{reel.view_count}</Text>
                </View>
              ) : null}
              <Text style={styles.date}>{formatDateFr(reel.added_at)}</Text>
            </View>
          </View>

          {/* Open in Instagram CTA — masqué pour les posts sans URL (photos/carrousels) */}
          {(reel.ig_url || reel.shortcode) ? (
            <Pressable
              onPress={openInInstagram}
              style={({ pressed }) => [styles.igBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="logo-instagram" size={16} color={theme.colors.white} />
              <Text style={styles.igBtnText}>Ouvrir dans Instagram</Text>
            </Pressable>
          ) : null}

          {/* AI Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Résumé IA</Text>
            {reel.summary ? (
              <Text style={styles.summaryText}>{reel.summary}</Text>
            ) : (
              <Text style={styles.mutedText}>Résumé IA non disponible</Text>
            )}
          </View>

          {/* Tags */}
          {reel.tags && reel.tags.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagRow}>
                {reel.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Transcript (collapsible) */}
          {reel.transcript ? (
            <View style={styles.section}>
              <Pressable
                onPress={() => setShowTranscript((v) => !v)}
                style={styles.transcriptToggle}
              >
                <Text style={styles.sectionLabel}>Transcription</Text>
                <Ionicons
                  name={showTranscript ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.textMuted}
                />
              </Pressable>
              {showTranscript ? (
                <Text style={styles.transcriptText}>{reel.transcript}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mes notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              onBlur={saveNotes}
              placeholder="Ajouter une note personnelle…"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {savingNotes ? (
              <Text style={styles.savingText}>Sauvegarde…</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return hex;
  }
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radius, typography } = theme;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    backText: {
      color: colors.text,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    scroll: {
      paddingBottom: spacing['3xl'],
    },
    thumbWrap: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: colors.surface2,
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    catBadge: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      gap: 6,
    },
    catDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    catText: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.medium,
      maxWidth: 140,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    title: {
      color: colors.text,
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.bold,
      lineHeight: 30,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    author: {
      color: colors.brand2,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    metaRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    viewsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    views: {
      color: colors.textMuted,
      fontSize: typography.sizes.xs,
    },
    date: {
      color: colors.textMuted,
      fontSize: typography.sizes.xs,
    },
    igBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    igBtnText: {
      color: colors.white,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.semibold,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    summaryText: {
      color: colors.textSecondary,
      fontSize: typography.sizes.sm,
      lineHeight: 20,
    },
    mutedText: {
      color: colors.textMuted,
      fontSize: typography.sizes.sm,
      fontStyle: 'italic',
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tagChip: {
      backgroundColor: colors.surface2,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    tagText: {
      color: colors.textMuted,
      fontSize: typography.sizes.xs,
    },
    transcriptToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    transcriptText: {
      color: colors.textMuted,
      fontSize: typography.sizes.xs,
      lineHeight: 18,
    },
    notesInput: {
      backgroundColor: colors.surface2,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: typography.sizes.sm,
      padding: spacing.md,
      minHeight: 100,
    },
    savingText: {
      color: colors.textMuted,
      fontSize: typography.sizes.xs,
      alignSelf: 'flex-end',
    },
  });
}
