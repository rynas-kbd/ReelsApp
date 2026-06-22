import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { STRINGS, updateProfile, type DigestFrequency, type Profile } from '@reelvault/shared';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { GradientButton } from '../GradientButton';
import { SectionLabel } from '../Screen';
import {
  GoalsPicker,
  InterestsPicker,
  PersonaPicker,
  AboutInput,
  FrequencyPicker,
} from './pickers';
import { colors, spacing, typography } from '../../lib/theme';

interface Draft {
  goals: string[];
  interests: string[];
  persona: string;
  expertise_level: string;
  time_per_week: string;
  digest_about: string;
  digest_frequency: DigestFrequency;
}

function initDraft(profile: Profile | null): Draft {
  return {
    goals: profile?.goals ?? [],
    interests: profile?.interests ?? [],
    persona: profile?.persona ?? '',
    expertise_level: profile?.expertise_level ?? '',
    time_per_week: profile?.time_per_week ?? '',
    digest_about: profile?.digest_about ?? '',
    digest_frequency: profile?.digest_frequency ?? 'weekly',
  };
}

interface Props {
  userId: string;
  profile: Profile | null;
  onSaved?: (patch: Partial<Profile>) => void;
}

/**
 * Formulaire complet du profil Second Brain — utilisé dans les Réglages.
 * Compose les 5 pickers + bouton Enregistrer.
 */
export function ProfileForm({ userId, profile, onSaved }: Props) {
  const { show } = useToast();
  const [draft, setDraft] = useState<Draft>(() => initDraft(profile));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const patch = {
      goals: draft.goals.length ? draft.goals : null,
      interests: draft.interests.length ? draft.interests : null,
      persona: draft.persona || null,
      expertise_level: draft.expertise_level || null,
      time_per_week: draft.time_per_week || null,
      digest_about: draft.digest_about || null,
      digest_frequency: draft.digest_frequency,
      profile_completed: true,
    };
    try {
      await updateProfile(supabase, userId, patch);
      show(STRINGS.settings.profileSaved, 'success');
      onSaved?.(patch);
    } catch {
      show(STRINGS.common.error, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {/* Objectifs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.onboarding.goals.title}</Text>
        <Text style={styles.sectionSub}>{STRINGS.onboarding.goals.subtitle}</Text>
        <GoalsPicker
          value={draft.goals}
          onChange={(v) => setDraft((d) => ({ ...d, goals: v }))}
        />
      </View>

      {/* Intérêts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.onboarding.interests.title}</Text>
        <Text style={styles.sectionSub}>{STRINGS.onboarding.interests.subtitle}</Text>
        <InterestsPicker
          value={draft.interests}
          onChange={(v) => setDraft((d) => ({ ...d, interests: v }))}
        />
      </View>

      {/* Persona */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.onboarding.persona.title}</Text>
        <PersonaPicker
          persona={draft.persona}
          expertise_level={draft.expertise_level}
          time_per_week={draft.time_per_week}
          onPersonaChange={(v) => setDraft((d) => ({ ...d, persona: v }))}
          onExpertiseChange={(v) => setDraft((d) => ({ ...d, expertise_level: v }))}
          onTimeChange={(v) => setDraft((d) => ({ ...d, time_per_week: v }))}
        />
      </View>

      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.onboarding.about.title}</Text>
        <Text style={styles.sectionSub}>{STRINGS.onboarding.about.subtitle}</Text>
        <AboutInput
          value={draft.digest_about}
          onChange={(v) => setDraft((d) => ({ ...d, digest_about: v }))}
        />
      </View>

      {/* Fréquence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.onboarding.frequency.title}</Text>
        <Text style={styles.sectionSub}>{STRINGS.onboarding.frequency.subtitle}</Text>
        <FrequencyPicker
          value={draft.digest_frequency}
          onChange={(v) => setDraft((d) => ({ ...d, digest_frequency: v }))}
        />
      </View>

      <GradientButton
        label={saving ? STRINGS.common.loading : STRINGS.settings.save}
        onPress={save}
        loading={saving}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
});
