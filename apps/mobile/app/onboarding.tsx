import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  STRINGS,
  fetchConnection,
  startInstagramOAuth,
  updateProfile,
  type DigestFrequency,
  type InstagramConnection,
} from '@reelvault/shared';
import { Screen, GradientHeader } from '../components/Screen';
import { GradientButton, OutlineButton } from '../components/GradientButton';
import { Stepper } from '../components/Stepper';
import { InstagramPairing } from '../components/secondbrain/InstagramPairing';
import { KeysTutorial } from '../components/secondbrain/KeysTutorial';
import { ApiKeysManager } from '../components/secondbrain/ApiKeysManager';
import {
  GoalsPicker,
  InterestsPicker,
  PersonaPicker,
  AboutInput,
  FrequencyPicker,
} from '../components/secondbrain/pickers';
import { useToast } from '../components/Toast';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { SITE_URL } from '../lib/env';
import { colors, radius, spacing, typography } from '../lib/theme';

type StepId =
  | 'welcome'
  | 'connect'
  | 'pair'
  | 'keys'
  | 'goals'
  | 'interests'
  | 'persona'
  | 'about'
  | 'frequency'
  | 'howto'
  | 'done';

const STEPS: StepId[] = [
  'welcome',
  'connect',
  'pair',
  'keys',
  'goals',
  'interests',
  'persona',
  'about',
  'frequency',
  'howto',
  'done',
];

interface ProfileDraft {
  goals: string[];
  interests: string[];
  persona: string;
  expertise_level: string;
  time_per_week: string;
  digest_about: string;
  digest_frequency: DigestFrequency;
}

const EMPTY_DRAFT: ProfileDraft = {
  goals: [],
  interests: [],
  persona: '',
  expertise_level: '',
  time_per_week: '',
  digest_about: '',
  digest_frequency: 'weekly',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { show } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const step = STEPS[stepIndex];
  const igConnected = connection?.status === 'active';

  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const loadConnection = useCallback(async () => {
    const conn = await fetchConnection(supabase);
    setConnection(conn);
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  async function connectInstagram() {
    if (!userId) return;
    setConnecting(true);
    try {
      const url = await startInstagramOAuth(supabase, SITE_URL);
      const result = await WebBrowser.openAuthSessionAsync(url, 'reelvault://instagram');
      if (result.type === 'success') {
        const status = result.url.match(/[?&]status=([^&]+)/)?.[1];
        if (status === 'connected') {
          show(STRINGS.instagram.connectSuccess, 'success');
          await loadConnection();
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

  async function finish() {
    if (!userId) return;
    setFinishing(true);
    try {
      await updateProfile(supabase, userId, {
        goals: draft.goals.length ? draft.goals : null,
        interests: draft.interests.length ? draft.interests : null,
        persona: draft.persona || null,
        expertise_level: draft.expertise_level || null,
        time_per_week: draft.time_per_week || null,
        digest_about: draft.digest_about || null,
        digest_frequency: draft.digest_frequency,
        profile_completed: true,
        onboarded: true,
      });
      router.replace('/(tabs)/library');
    } catch {
      show(STRINGS.common.error, 'error');
      setFinishing(false);
    }
  }

  return (
    <Screen>
      <GradientHeader title={STRINGS.app.name} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Stepper total={STEPS.length} current={stepIndex} />

          {/* ── WELCOME ── */}
          {step === 'welcome' && (
            <View style={styles.stepCenter}>
              <View style={styles.iconWrap}>
                <Ionicons name="hand-left-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.welcome.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.welcome.subtitle}</Text>
              <GradientButton
                label={STRINGS.onboarding.welcome.cta}
                onPress={next}
                style={styles.fullBtn}
              />
            </View>
          )}

          {/* ── CONNECT ── */}
          {step === 'connect' && (
            <View style={styles.stepCenter}>
              <View style={styles.iconWrap}>
                <Ionicons name="logo-instagram" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.connect.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.connect.subtitle}</Text>
              {igConnected ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.successText}>
                    {STRINGS.onboarding.connect.connected}
                    {connection?.ig_username ? ` — @${connection.ig_username}` : ''}
                  </Text>
                </View>
              ) : (
                <GradientButton
                  label={connecting ? STRINGS.instagram.connecting : STRINGS.instagram.connect}
                  onPress={connectInstagram}
                  loading={connecting}
                  style={styles.fullBtn}
                />
              )}
              <View style={styles.navRow}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton
                  label={igConnected ? STRINGS.onboarding.next : STRINGS.onboarding.skip}
                  onPress={next}
                />
              </View>
            </View>
          )}

          {/* ── PAIR ── */}
          {step === 'pair' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="person-circle-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.pair.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.pair.subtitle}</Text>
              <View style={{ marginTop: spacing.md }}>
                {igConnected && connection ? (
                  <InstagramPairing connection={connection} onChange={setConnection} />
                ) : (
                  <View style={styles.needConnectBox}>
                    <Text style={styles.needConnectText}>{STRINGS.onboarding.pair.needConnect}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── KEYS ── */}
          {step === 'keys' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="key-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.keys.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.keys.subtitle}</Text>
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                <KeysTutorial />
                {userId && <ApiKeysManager userId={userId} />}
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── GOALS ── */}
          {step === 'goals' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="flag-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.goals.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.goals.subtitle}</Text>
              <View style={{ marginTop: spacing.md }}>
                <GoalsPicker
                  value={draft.goals}
                  onChange={(v) => setDraft((d) => ({ ...d, goals: v }))}
                />
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── INTERESTS ── */}
          {step === 'interests' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="sparkles-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.interests.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.interests.subtitle}</Text>
              <View style={{ marginTop: spacing.md }}>
                <InterestsPicker
                  value={draft.interests}
                  onChange={(v) => setDraft((d) => ({ ...d, interests: v }))}
                />
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── PERSONA ── */}
          {step === 'persona' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="person-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.persona.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.persona.subtitle}</Text>
              <View style={{ marginTop: spacing.md }}>
                <PersonaPicker
                  persona={draft.persona}
                  expertise_level={draft.expertise_level}
                  time_per_week={draft.time_per_week}
                  onPersonaChange={(v) => setDraft((d) => ({ ...d, persona: v }))}
                  onExpertiseChange={(v) => setDraft((d) => ({ ...d, expertise_level: v }))}
                  onTimeChange={(v) => setDraft((d) => ({ ...d, time_per_week: v }))}
                />
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── ABOUT ── */}
          {step === 'about' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="book-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.about.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.about.subtitle}</Text>
              <View style={{ marginTop: spacing.md }}>
                <AboutInput
                  value={draft.digest_about}
                  onChange={(v) => setDraft((d) => ({ ...d, digest_about: v }))}
                />
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── FREQUENCY ── */}
          {step === 'frequency' && (
            <View style={styles.stepStart}>
              <View style={styles.iconWrap}>
                <Ionicons name="calendar-outline" size={32} color={colors.accentTo} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.frequency.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.frequency.subtitle}</Text>
              <View style={{ marginTop: spacing.md }}>
                <FrequencyPicker
                  value={draft.digest_frequency}
                  onChange={(v) => setDraft((d) => ({ ...d, digest_frequency: v }))}
                />
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── HOWTO ── */}
          {step === 'howto' && (
            <View style={styles.stepStart}>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.howto.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.howto.subtitle}</Text>
              <View style={styles.howtoList}>
                {[
                  { icon: 'share-outline' as const, text: STRINGS.onboarding.howto.point1 },
                  { icon: 'sparkles-outline' as const, text: STRINGS.onboarding.howto.point2 },
                  { icon: 'search-outline' as const, text: STRINGS.onboarding.howto.point3 },
                ].map(({ icon, text }, i) => (
                  <View key={i} style={styles.howtoRow}>
                    <View style={styles.howtoIcon}>
                      <Ionicons name={icon} size={18} color={colors.accent} />
                    </View>
                    <Text style={styles.howtoText}>{text}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.navRow, { marginTop: spacing.xl }]}>
                <OutlineButton label={STRINGS.onboarding.back} onPress={back} />
                <GradientButton label={STRINGS.onboarding.next} onPress={next} />
              </View>
            </View>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <View style={styles.stepCenter}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
              </View>
              <Text style={styles.stepTitle}>{STRINGS.onboarding.done.title}</Text>
              <Text style={styles.stepSubtitle}>{STRINGS.onboarding.done.subtitle}</Text>
              <GradientButton
                label={finishing ? STRINGS.common.loading : STRINGS.onboarding.done.cta}
                onPress={finish}
                loading={finishing}
                style={styles.fullBtn}
              />
            </View>
          )}

          {/* Lien « Passer » */}
          {step !== 'done' && (
            <Pressable onPress={finish} disabled={finishing} style={styles.skipBtn}>
              <Text style={styles.skipText}>{STRINGS.onboarding.skip}</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  stepCenter: {
    alignItems: 'center',
    gap: spacing.md,
  },
  stepStart: {
    gap: spacing.xs,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius['2xl'],
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  stepTitle: {
    color: colors.text,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  fullBtn: {
    width: '100%',
    marginTop: spacing.lg,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
    backgroundColor: `${colors.success}18`,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  successText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  needConnectBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  needConnectText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  howtoList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  howtoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  howtoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  howtoText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 22,
    paddingTop: spacing.xs,
  },
  skipBtn: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  skipText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textDecorationLine: 'underline',
  },
});
