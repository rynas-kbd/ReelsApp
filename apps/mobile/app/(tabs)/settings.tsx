import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  fetchConnection,
  fetchProfile,
  updateProfile,
  startInstagramOAuth,
  disconnectInstagram,
  STRINGS,
  type InstagramConnection,
  type Profile,
} from '@reelvault/shared';
import { Screen, GradientHeader, SectionLabel } from '../../components/Screen';
import { GradientButton, OutlineButton } from '../../components/GradientButton';
import { ProfileForm } from '../../components/secondbrain/ProfileForm';
import { ApiKeysManager } from '../../components/secondbrain/ApiKeysManager';
import { InstagramPairing } from '../../components/secondbrain/InstagramPairing';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { SITE_URL } from '../../lib/env';
import {
  registerForPushNotificationsAsync,
  unregisterPushToken,
} from '../../lib/notifications';
import { reprocessLibrary } from '../../lib/reprocessLibrary';
import { useTheme, useThemeControl } from '../../lib/theme';
import type { Theme } from '@reelvault/design-tokens';

export default function SettingsScreen() {
  const { userId, signOut } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const theme = useTheme();
  const { scheme, setScheme } = useThemeControl();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [notifBusy, setNotifBusy] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const [prof, conn] = await Promise.all([
      fetchProfile(supabase, userId),
      fetchConnection(supabase),
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

  async function connectInstagram() {
    setConnecting(true);
    try {
      const url = await startInstagramOAuth(supabase, SITE_URL);
      const result = await WebBrowser.openAuthSessionAsync(url, 'reelvault://instagram');
      if (result.type === 'success') {
        const status = result.url.match(/[?&]status=([^&]+)/)?.[1];
        if (status === 'connected') {
          show(STRINGS.instagram.connectSuccess, 'success');
          await load();
        } else if (status === 'denied') {
          show(STRINGS.instagram.errorDenied, 'error');
        } else {
          show(STRINGS.instagram.errorExchange, 'error');
        }
      }
    } catch {
      show(STRINGS.instagram.errorConfig, 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await disconnectInstagram(supabase);
      setConnection((c) => (c ? { ...c, status: 'revoked' } : c));
      show(STRINGS.instagram.disconnectSuccess, 'success');
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setDisconnecting(false);
    }
  }

  function statusLabel(): string {
    if (!connection) return STRINGS.instagram.statusPending;
    if (connection.status === 'active') return STRINGS.instagram.statusActive;
    if (connection.status === 'revoked') return STRINGS.instagram.statusRevoked;
    return STRINGS.instagram.statusPending;
  }

  function statusColor(): string {
    if (connection?.status === 'active') return theme.colors.success;
    if (connection?.status === 'revoked') return theme.colors.danger;
    return theme.colors.warning;
  }

  if (loading) {
    return (
      <Screen>
        <GradientHeader title={STRINGS.settings.title} />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader title={STRINGS.settings.title} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Apparence */}
        <SectionLabel>Apparence</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Thème</Text>
          <View style={styles.themeRow}>
            {(['light', 'dark', 'system'] as const).map((opt) => {
              const labels = { light: 'Clair', dark: 'Sombre', system: 'Système' };
              const active = scheme === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setScheme(opt)}
                  style={[
                    styles.themeBtn,
                    active && {
                      backgroundColor: theme.colors.brandSoft,
                      borderColor: theme.colors.brand,
                    },
                  ]}
                >
                  {active ? (
                    <Ionicons name="checkmark" size={14} color={theme.colors.brand} />
                  ) : null}
                  <Text style={[
                    styles.themeBtnText,
                    active && { color: theme.colors.brand, fontWeight: theme.typography.weights.semibold },
                  ]}>
                    {labels[opt]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Compte */}
        <SectionLabel>{STRINGS.settings.account}</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.label}>{STRINGS.settings.displayName}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ton nom"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />
          <GradientButton
            label={STRINGS.settings.save}
            onPress={onSaveName}
            loading={savingName}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>

        {/* Préférences */}
        <SectionLabel>{STRINGS.settings.preferences}</SectionLabel>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
              <Text style={styles.rowTitle}>{STRINGS.settings.notifications}</Text>
              <Text style={styles.rowHelp}>{STRINGS.settings.notificationsHelp}</Text>
            </View>
            {notifBusy ? (
              <ActivityIndicator color={theme.colors.brand} />
            ) : (
              <Switch
                value={profile?.notif_enabled ?? false}
                onValueChange={onToggleNotif}
                trackColor={{ false: theme.colors.surface3, true: theme.colors.brand }}
                thumbColor={theme.colors.white}
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

          {connection?.status === 'active' ? (
            <>
              <Text style={styles.activationTitle}>
                {STRINGS.instagram.connectedAs}{' '}
                <Text style={[styles.connectedUser, { color: theme.colors.brand2 }]}>
                  @{connection.ig_username ?? '—'}
                </Text>
              </Text>
              <OutlineButton
                label={disconnecting ? STRINGS.instagram.disconnecting : STRINGS.instagram.disconnect}
                onPress={disconnect}
                disabled={disconnecting}
                style={{ marginTop: theme.spacing.md }}
              />
            </>
          ) : (
            <>
              <Text style={[styles.step, { marginTop: theme.spacing.md }]}>{STRINGS.instagram.intro}</Text>
              <GradientButton
                label={STRINGS.instagram.connect}
                onPress={connectInstagram}
                loading={connecting}
                style={{ marginTop: theme.spacing.md }}
              />
            </>
          )}
        </View>

        {/* Second Brain — profil */}
        <SectionLabel>{STRINGS.settings.profileTitle}</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.label}>{STRINGS.settings.profileSubtitle}</Text>
          {userId && (
            <ProfileForm
              userId={userId}
              profile={profile}
              onSaved={(patch) => setProfile((p) => (p ? { ...p, ...patch } : p))}
            />
          )}
        </View>

        {/* Clés API */}
        <SectionLabel>{STRINGS.apiKeys.title}</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.label}>{STRINGS.apiKeys.intro}</Text>
          {userId && <ApiKeysManager userId={userId} />}
        </View>

        {/* Jumelage Instagram */}
        {connection?.status === 'active' && (
          <>
            <SectionLabel>{STRINGS.pairing.title}</SectionLabel>
            <InstagramPairing
              connection={connection}
              onChange={(c) => setConnection(c)}
            />
          </>
        )}

        {/* Gestion des catégories */}
        <SectionLabel>{STRINGS.nav.categories}</SectionLabel>
        <Pressable style={styles.card} onPress={() => router.push('/categories')}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowTitle}>{STRINGS.categories.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </Pressable>

        {/* Re-classement IA */}
        <SectionLabel>{STRINGS.reprocess.buttonLabel}</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.label}>{STRINGS.reprocess.buttonHelp}</Text>
          <GradientButton
            label={reprocessing ? STRINGS.reprocess.running : STRINGS.reprocess.buttonLabel}
            onPress={async () => {
              setReprocessing(true);
              try {
                const result = await reprocessLibrary();
                if (result.ok) {
                  show(STRINGS.reprocess.done, 'success');
                } else {
                  show(STRINGS.reprocess.error, 'error');
                }
              } catch {
                show(STRINGS.reprocess.error, 'error');
              } finally {
                setReprocessing(false);
              }
            }}
            loading={reprocessing}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>

        {/* Déconnexion */}
        <Pressable style={styles.logout} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>{STRINGS.nav.logout}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  const { colors, radius, spacing, typography } = theme;
  return StyleSheet.create({
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
    connectedUser: {
      fontWeight: typography.weights.bold,
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
    // Apparence / thème
    themeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    themeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    themeBtnText: {
      color: colors.textSecondary,
      fontSize: typography.sizes.sm,
    },
  });
}
