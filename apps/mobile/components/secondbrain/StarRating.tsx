import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS } from '@reelvault/shared';
import { colors, spacing } from '../../lib/theme';

interface Props {
  value: number | null;  // note actuelle (null = pas encore noté)
  disabled?: boolean;
  onRate: (stars: number) => void;
}

/** 5 étoiles cliquables — désactivé après vote. */
export function StarRating({ value, disabled, onRate }: Props) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const alreadyRated = value !== null;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered ?? value ?? 0);
        return (
          <Pressable
            key={star}
            accessibilityLabel={STRINGS.digest.stars(star)}
            disabled={alreadyRated || disabled}
            onPress={() => onRate(star)}
            onPressIn={() => !alreadyRated && setHovered(star)}
            onPressOut={() => setHovered(null)}
            style={({ pressed }) => [
              styles.star,
              pressed && !alreadyRated && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={32}
              color={filled ? colors.warning : colors.borderStrong}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  star: {
    padding: 2,
  },
});
