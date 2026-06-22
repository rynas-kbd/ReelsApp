import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../lib/theme';

interface Props {
  total: number;
  current: number; // 0-indexed current step
}

/** Barre de progression de l'onboarding — points/pills horizontaux. */
export function Stepper({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i <= current ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.xl,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 10,
    backgroundColor: colors.borderStrong,
  },
});
