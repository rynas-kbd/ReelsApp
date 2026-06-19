import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../lib/theme';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutDown}
          style={styles.wrap}
          pointerEvents="none"
        >
          <View style={[styles.toast, kindStyle(toast.kind)]}>
            <Ionicons name={iconFor(toast.kind)} size={18} color={colors.white} />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider');
  return ctx;
}

function iconFor(kind: ToastKind): keyof typeof Ionicons.glyphMap {
  if (kind === 'success') return 'checkmark-circle';
  if (kind === 'error') return 'alert-circle';
  return 'information-circle';
}

function kindStyle(kind: ToastKind) {
  if (kind === 'success') return { borderColor: colors.success };
  if (kind === 'error') return { borderColor: colors.danger };
  return { borderColor: colors.border };
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    maxWidth: 480,
  },
  text: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },
});
