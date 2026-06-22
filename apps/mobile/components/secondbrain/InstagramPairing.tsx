import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS, fetchConnection, type InstagramConnection } from '@reelvault/shared';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { GradientButton, OutlineButton } from '../GradientButton';
import { colors, radius, spacing, typography } from '../../lib/theme';

interface Props {
  connection: InstagramConnection;
  onChange?: (c: InstagramConnection) => void;
}

/** Jumelage du compte principal — port mobile de instagram-pairing.tsx (web). */
export function InstagramPairing({ connection, onChange }: Props) {
  const { show } = useToast();
  const [conn, setConn] = useState(connection);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const paired = Boolean(conn.sender_id);
  const code = conn.sender_pairing_code ?? '—';
  const steps = STRINGS.pairing.steps(conn.ig_username);

  async function refresh() {
    setChecking(true);
    try {
      const fresh = await fetchConnection(supabase);
      if (fresh) {
        setConn(fresh);
        onChange?.(fresh);
        if (fresh.sender_id) show(STRINGS.pairing.paired, 'success');
      }
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setChecking(false);
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    show(STRINGS.pairing.copied, 'success');
    setTimeout(() => setCopied(false), 1500);
  }

  if (paired) {
    return (
      <View style={styles.pairedBox}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pairedTitle}>{STRINGS.pairing.paired}</Text>
          <Text style={styles.pairedHelp}>{STRINGS.pairing.pairedHelp}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{STRINGS.pairing.title}</Text>
      <Text style={styles.intro}>{STRINGS.pairing.intro}</Text>

      <Text style={styles.codeLabel}>{STRINGS.pairing.codeLabel}</Text>
      <View style={styles.codeRow}>
        <Text style={styles.code}>{code}</Text>
        <Pressable onPress={copy} style={styles.copyBtn}>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? colors.success : colors.accent}
          />
          <Text style={[styles.copyText, copied && { color: colors.success }]}>
            {STRINGS.pairing.copy}
          </Text>
        </Pressable>
      </View>

      {steps.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{s}</Text>
        </View>
      ))}

      <View style={styles.footerRow}>
        <Text style={styles.waiting}>{STRINGS.pairing.waiting}</Text>
        <OutlineButton
          label={checking ? STRINGS.common.loading : STRINGS.pairing.refresh}
          onPress={refresh}
          disabled={checking}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  code: {
    flex: 1,
    color: colors.accent,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: 3,
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  copyText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  waiting: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  // État relié
  pairedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
    backgroundColor: `${colors.success}18`,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  pairedTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  pairedHelp: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
    lineHeight: 18,
  },
});
