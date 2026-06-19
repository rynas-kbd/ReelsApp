import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import {
  ensureConnection,
  fetchProfile,
  updateProfile,
  STRINGS,
  type InstagramConnection,
  type Profile,
} from '@reelvault/shared';
import { Screen, GradientHeader, SectionLabel } from '../../components/Screen';
import { GradientButton, OutlineButton } from '../../components/GradientButton';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  registerForPushNotificationsAsync,
  unregisterPushToken,
} from '../../lib/notifications';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function SettingsScreen() {
  const { userId, signOut } = useAuth();
  const { show } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [notifBusy, setNotifBusy] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const [prof, conn] = await Promise.all([
      fetchProfile(supabase, userId),
      ensureConnection(supabase, userId),
    ]);
    setProfile(prof);
    setConnection(conn);
    setDisplayName(prof?.display_name ?? '');
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onSaveName() {
    if (!userId) return;
    setSavingName(true);
    try {
      await updateProfile(supabase, userId, { display_name: displayName.trim() || null });
      show(STRINGS.settings.saved, 'success');
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setSavingName(false);
    }
  }

  async function onToggleNotif(next: boolean) {
    if (!userId) return;
    setNotifBusy(true);
    try {
      if (next) {
        const token = await registerForPushNotificationsAsync(userId);
        if (!token) {
          show('Autorisation des notifications refusée.', 'error');
          setNotifBusy(false);
          return;
        }
        await updateProfile(supabase, userId, { notif_enabled: true });
      } else {
        await unregisterPushToken(userId);
        await updateProfile(supabase, userId, { notif_enabled: false });
      }
      setProfile((p) => (p ? { ...p, notif_enabled: next } : p));
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setNotifBusy(false);
    }
  }

  async function onCopyCode() {
    if (!connection) return;
    await Clipboard.setStringAsync(connection.activation_code);
    show(STRINGS.instagram.copied, 'success');
  }

  function statusLabel(): string {
    if (!connection) return STRINGS.instagram.statusPending;
    if (connection.status === 'active') return STRINGS.instagram.statusActive;
    if (connection.status === 'revoked') return STRINGS.instagram.statusRevoked;
    return STRINGS.instagram.statusPending;
  }

  function statusColor(): string {
    if (connection?.status === 'active') return colors.success;
    if (connection?.status === 'revoked') return colors.danger;
    return colors.warning;
  }

  if (loading) {
    return (
      <Screen>
        <GradientHeader title={STRINGS.settings.title} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader title={STRINGS.settings.title} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Compte */}
        <SectionLabel>{STRINGS.settings.account}</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.label}>{STRINGS.settings.displayName}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ton nom"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <GradientButton
            label={STRINGS.settings.save}
            onPress={onSaveName}
            loading={savingName}
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Préférences */}
        <SectionLabel>{STRINGS.settings.preferences}</SectionLabel>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.rowTitle}>{STRINGS.settings.notifications}</Text>
              <Text style={styles.rowHelp}>{STRINGS.settings.notificationsHelp}</Text>
            </View>
            {notifBusy ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Switch
                value={profile?.notif_enabled ?? false}
                onValueChange={onToggleNotif}
                trackColor={{ false: colors.surface3, true: colors.accent }}
                thumbColor={colors.white}
              />
            )}
          </View>
        </View>

        {/* Connexion Instagram */}
        <SectionLabel>{STRINGS.settings.instagram}</SectionLabel>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowTitle}>{STRINGS.instagram.title}</Text>
            <View style={[styles.statusPill, { borderColor: statusColor() }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor() }]} />
              <Text style={[styles.statusText, { color: statusColor() }]}>{statusLabel()}</Text>
            </View>
          </View>

          <Text style={styles.activationTitle}>{STRINGS.instagram.activationTitle}</Text>
          <Text style={styles.step}>1. {STRINGS.instagram.activationStep1}</Text>
          <Text style={styles.step}>2. {STRINGS.instagram.activationStep2}</Text>

          <Pressable style={styles.codeBox} onPress={onCopyCode}>
            <Text style={styles.code}>{connection?.activation_code ?? '—'}</Text>
            <Ionicons name="copy-outline" size={18} color={colors.accentTo} />
          </Pressable>

          <Text style={styles.step}>3. {STRINGS.instagram.activationStep3}</Text>

          <OutlineButton
            label={STRINGS.instagram.copyCode}
            onPress={onCopyCode}
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Déconnexion */}
        <Pressable style={styles.logout} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>{STRINGS.nav.logout}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: typography.sizes.base,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  rowHelp: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  activationTitle: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  step: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  code: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  logoutText: {
    color: colors.danger,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
