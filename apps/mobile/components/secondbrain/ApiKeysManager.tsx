import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  STRINGS,
  addApiKey,
  deleteApiKey,
  fetchApiKeys,
  maskApiKey,
  type ApiKeyProvider,
  type UserApiKey,
} from '@reelvault/shared';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { GradientButton } from '../GradientButton';
import { colors, radius, spacing, typography } from '../../lib/theme';

const PROVIDERS: { id: ApiKeyProvider; label: string; help: string }[] = [
  { id: 'gemini',   label: STRINGS.apiKeys.gemini,   help: STRINGS.apiKeys.geminiHelp },
  { id: 'rapidapi', label: STRINGS.apiKeys.rapidapi, help: STRINGS.apiKeys.rapidapiHelp },
  { id: 'groq',     label: STRINGS.apiKeys.groq,     help: STRINGS.apiKeys.groqHelp },
];

interface Props {
  userId: string;
}

/** Gestion BYOK des clés Gemini/RapidAPI — port mobile de api-keys-card.tsx (web). */
export function ApiKeysManager({ userId }: Props) {
  const { show } = useToast();
  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<ApiKeyProvider, string>>({ gemini: '', rapidapi: '', groq: '' });
  const [saving, setSaving] = useState<ApiKeyProvider | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setKeys(await fetchApiKeys(supabase));
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadKeys(); }, [loadKeys]);

  async function add(provider: ApiKeyProvider) {
    const value = drafts[provider].trim();
    if (!value) return;
    setSaving(provider);
    try {
      await addApiKey(supabase, userId, provider, value);
      setDrafts((d) => ({ ...d, [provider]: '' }));
      await loadKeys();
      show(STRINGS.apiKeys.added, 'success');
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setSaving(null);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert(STRINGS.apiKeys.deleteConfirm, undefined, [
      { text: STRINGS.common.cancel, style: 'cancel' },
      {
        text: STRINGS.common.delete,
        style: 'destructive',
        onPress: async () => {
          setDeleting(id);
          try {
            await deleteApiKey(supabase, id);
            setKeys((k) => k.filter((x) => x.id !== id));
            show(STRINGS.apiKeys.deleted, 'success');
          } catch {
            show(STRINGS.common.error, 'error');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }

  const now = Date.now();

  return (
    <View style={styles.wrap}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        PROVIDERS.map((p) => {
          const list = keys.filter((k) => k.provider === p.id);
          return (
            <View key={p.id} style={styles.providerBlock}>
              <Text style={styles.providerLabel}>{p.label}</Text>
              <Text style={styles.providerHelp}>{p.help}</Text>

              {list.length === 0 && (
                <Text style={styles.none}>{STRINGS.apiKeys.none}</Text>
              )}

              {list.map((k) => {
                const cooling = k.cooldown_until && new Date(k.cooldown_until).getTime() > now;
                return (
                  <View key={k.id} style={styles.keyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.keyMask}>{maskApiKey(k.key)}</Text>
                      {cooling && (
                        <Text style={[styles.badge, { color: colors.warning }]}>
                          {STRINGS.apiKeys.inCooldown}
                        </Text>
                      )}
                      {k.last_error && !cooling && (
                        <Text style={styles.lastError} numberOfLines={1}>
                          {STRINGS.apiKeys.lastError} : {k.last_error}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => confirmDelete(k.id)}
                      disabled={deleting === k.id}
                      style={styles.deleteBtn}
                    >
                      {deleting === k.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      )}
                    </Pressable>
                  </View>
                );
              })}

              <View style={styles.inputRow}>
                <TextInput
                  value={drafts[p.id]}
                  onChangeText={(v) => setDrafts((d) => ({ ...d, [p.id]: v }))}
                  placeholder={STRINGS.apiKeys.placeholder}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <GradientButton
                  label={STRINGS.apiKeys.add}
                  onPress={() => add(p.id)}
                  loading={saving === p.id}
                  disabled={!drafts[p.id].trim()}
                  style={{ flex: 0, minWidth: 80 }}
                />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xl,
  },
  providerBlock: {
    gap: spacing.sm,
  },
  providerLabel: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  providerHelp: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  none: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  keyMask: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontFamily: 'monospace',
  },
  badge: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  lastError: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
});
