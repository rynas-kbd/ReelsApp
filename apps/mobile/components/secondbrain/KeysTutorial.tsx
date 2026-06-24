import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STRINGS } from '@reelvault/shared';
import { colors, radius, spacing, typography } from '../../lib/theme';

function Tutorial({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

/** Encart tutoriel pour obtenir les clés Gemini et RapidAPI. */
export function KeysTutorial() {
  return (
    <View style={styles.wrap}>
      <Tutorial
        title={STRINGS.onboarding.keys.geminiTitle}
        steps={STRINGS.onboarding.keys.geminiSteps}
      />
      <Tutorial
        title={STRINGS.onboarding.keys.rapidTitle}
        steps={STRINGS.onboarding.keys.rapidSteps}
      />
      <Tutorial
        title={STRINGS.onboarding.keys.groqTitle}
        steps={STRINGS.onboarding.keys.groqSteps}
      />
      <Text style={styles.optional}>{STRINGS.onboarding.keys.optional}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    flex: 1,
    lineHeight: 18,
  },
  optional: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
});
