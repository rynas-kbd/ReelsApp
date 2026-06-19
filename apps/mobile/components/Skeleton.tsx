import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../lib/theme';

/** Bloc skeleton animé (pulse) générique. */
export function SkeletonBlock({
  width,
  height,
  rounded = radius.md,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  rounded?: number;
  style?: object;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: rounded, backgroundColor: colors.surface2 },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton d'une card de réel (placeholder de chargement). */
export function ReelCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width="100%" height={170} rounded={0} />
      <View style={styles.body}>
        <SkeletonBlock width="80%" height={16} />
        <View style={{ height: spacing.sm }} />
        <SkeletonBlock width="50%" height={12} />
      </View>
    </View>
  );
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
  body: {
    padding: spacing.md,
  },
});
