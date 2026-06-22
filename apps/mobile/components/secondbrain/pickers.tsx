/**
 * Pickers contrôlés du profil Second Brain — partagés entre l'onboarding et les Réglages.
 * Chacun est un composant autonome qui reçoit `value` + `onChange`.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS, type DigestFrequency } from '@reelvault/shared';
import { colors, radius, spacing, typography } from '../../lib/theme';

// ──────────────────────────── GoalsPicker ─────────────────────────────────

interface GoalsPickerProps {
  value: string[];
  onChange: (goals: string[]) => void;
}

export function GoalsPicker({ value, onChange }: GoalsPickerProps) {
  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((g) => g !== id) : [...value, id],
    );
  }

  return (
    <View style={styles.grid}>
      {STRINGS.onboarding.goals.options.map((opt) => {
        const active = value.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            onPress={() => toggle(opt.id)}
            style={[styles.optionRow, active && styles.optionRowActive]}
          >
            <View style={[styles.checkbox, active && styles.checkboxActive]}>
              {active && <Ionicons name="checkmark" size={12} color={colors.white} />}
            </View>
            <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ──────────────────────────── InterestsPicker ─────────────────────────────

interface InterestsPickerProps {
  value: string[];
  onChange: (interests: string[]) => void;
}

export function InterestsPicker({ value, onChange }: InterestsPickerProps) {
  function toggle(label: string) {
    onChange(
      value.includes(label) ? value.filter((i) => i !== label) : [...value, label],
    );
  }

  return (
    <View>
      <View style={styles.chipWrap}>
        {STRINGS.onboarding.interests.options.map((label) => {
          const active = value.includes(label);
          return (
            <Pressable
              key={label}
              onPress={() => toggle(label)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value.length > 0 && (
        <Text style={styles.counter}>
          {value.length} centre{value.length > 1 ? 's' : ''} d&apos;intérêt sélectionné{value.length > 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

// ──────────────────────────── PersonaPicker ────────────────────────────────

interface PersonaPickerProps {
  persona: string;
  expertise_level: string;
  time_per_week: string;
  onPersonaChange: (v: string) => void;
  onExpertiseChange: (v: string) => void;
  onTimeChange: (v: string) => void;
}

export function PersonaPicker({
  persona,
  expertise_level,
  time_per_week,
  onPersonaChange,
  onExpertiseChange,
  onTimeChange,
}: PersonaPickerProps) {
  return (
    <View style={styles.personaWrap}>
      {/* Qui es-tu */}
      <View style={styles.grid}>
        {STRINGS.onboarding.persona.personaOptions.map((opt) => {
          const active = persona === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onPersonaChange(opt.id)}
              style={[styles.optionRow, active && styles.optionRowActive]}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Niveau */}
      <View>
        <Text style={styles.subLabel}>{STRINGS.onboarding.persona.expertiseLabel}</Text>
        <View style={styles.levelRow}>
          {STRINGS.onboarding.persona.expertiseOptions.map((opt) => {
            const active = expertise_level === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onExpertiseChange(opt.id)}
                style={[styles.levelBtn, active && styles.levelBtnActive]}
              >
                <Text style={[styles.levelText, active && styles.levelTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Temps */}
      <View>
        <Text style={styles.subLabel}>{STRINGS.onboarding.persona.timeLabel}</Text>
        {STRINGS.onboarding.persona.timeOptions.map((opt) => {
          const active = time_per_week === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onTimeChange(opt.id)}
              style={[styles.optionRow, active && styles.optionRowActive, { marginBottom: spacing.xs }]}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ──────────────────────────── AboutInput ──────────────────────────────────

interface AboutInputProps {
  value: string;
  onChange: (v: string) => void;
}

export function AboutInput({ value, onChange }: AboutInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={STRINGS.onboarding.about.placeholder}
      placeholderTextColor={colors.textMuted}
      multiline
      numberOfLines={4}
      style={styles.textarea}
    />
  );
}

// ──────────────────────────── FrequencyPicker ─────────────────────────────

interface FrequencyPickerProps {
  value: DigestFrequency;
  onChange: (v: DigestFrequency) => void;
}

type FreqOption = {
  id: DigestFrequency;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const FREQ_OPTIONS: FreqOption[] = [
  {
    id: 'weekly',
    label: STRINGS.onboarding.frequency.weekly.label,
    desc: STRINGS.onboarding.frequency.weekly.desc,
    icon: 'flash-outline',
  },
  {
    id: 'monthly',
    label: STRINGS.onboarding.frequency.monthly.label,
    desc: STRINGS.onboarding.frequency.monthly.desc,
    icon: 'calendar-outline',
  },
  {
    id: 'off',
    label: STRINGS.onboarding.frequency.off.label,
    desc: STRINGS.onboarding.frequency.off.desc,
    icon: 'remove-circle-outline',
  },
];

export function FrequencyPicker({ value, onChange }: FrequencyPickerProps) {
  return (
    <View style={styles.freqWrap}>
      {FREQ_OPTIONS.map(({ id, label, desc, icon }) => {
        const active = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={[styles.freqRow, active && styles.freqRowActive]}
          >
            <View style={[styles.freqIcon, active && styles.freqIconActive]}>
              <Ionicons
                name={icon}
                size={20}
                color={active ? colors.accent : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.freqLabel, active && styles.freqLabelActive]}>
                {label}
              </Text>
              <Text style={styles.freqDesc}>{desc}</Text>
            </View>
            {active && (
              <View style={styles.freqCheck}>
                <Ionicons name="checkmark" size={12} color={colors.white} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────── Styles ───────────────────────────────────────

const styles = StyleSheet.create({
  // Options (objectifs, persona, temps)
  grid: {
    gap: spacing.xs + 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  optionLabelActive: {
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  // Checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  // Chips intérêts
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  chipTextActive: {
    color: colors.accent,
  },
  counter: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  // Persona
  personaWrap: {
    gap: spacing.lg,
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  levelRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  levelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  levelBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  levelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  levelTextActive: {
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  // Textarea
  textarea: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: typography.sizes.sm,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Fréquence
  freqWrap: {
    gap: spacing.sm,
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  freqRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  freqIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  freqIconActive: {
    backgroundColor: colors.accentSoft,
  },
  freqLabel: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  freqLabelActive: {
    color: colors.accent,
  },
  freqDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  freqCheck: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
