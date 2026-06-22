'use client';

import { useMemo, useState } from 'react';
import { Calendar, Check, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  STRINGS,
  updateProfile,
  type DigestFrequency,
  type Profile,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProfileDraft {
  goals: string[];
  interests: string[];
  persona: string;
  expertise_level: string;
  time_per_week: string;
  digest_about: string;
  digest_frequency: DigestFrequency;
}

function initDraft(profile: Profile | null): ProfileDraft {
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

export function ProfileCard({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: Profile | null;
  onSaved?: (updated: Partial<Profile>) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<ProfileDraft>(() => initDraft(profile));
  const [saving, setSaving] = useState(false);

  function toggleGoal(id: string) {
    setDraft((d) => ({
      ...d,
      goals: d.goals.includes(id) ? d.goals.filter((g) => g !== id) : [...d.goals, id],
    }));
  }

  function toggleInterest(label: string) {
    setDraft((d) => ({
      ...d,
      interests: d.interests.includes(label)
        ? d.interests.filter((i) => i !== label)
        : [...d.interests, label],
    }));
  }

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
      toast.success(STRINGS.settings.profileSaved);
      onSaved?.(patch);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STRINGS.settings.profileTitle}</CardTitle>
        <CardDescription>{STRINGS.settings.profileSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">

        {/* ── Objectifs ── */}
        <section>
          <p className="mb-1 text-sm font-semibold text-text">{STRINGS.onboarding.goals.title}</p>
          <p className="mb-3 text-xs text-text-muted">{STRINGS.onboarding.goals.subtitle}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STRINGS.onboarding.goals.options.map((opt) => {
              const active = draft.goals.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleGoal(opt.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all',
                    active
                      ? 'border-accent bg-accent/10 font-medium text-accent'
                      : 'border-border-subtle bg-surface-2/50 text-text-secondary hover:border-border-strong hover:text-text',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      active ? 'border-accent bg-accent' : 'border-border-strong',
                    )}
                  >
                    {active && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Centres d'intérêt ── */}
        <section>
          <p className="mb-1 text-sm font-semibold text-text">{STRINGS.onboarding.interests.title}</p>
          <p className="mb-3 text-xs text-text-muted">{STRINGS.onboarding.interests.subtitle}</p>
          <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto pr-1">
            {STRINGS.onboarding.interests.options.map((label) => {
              const active = draft.interests.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleInterest(label)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border-subtle bg-surface-2 text-text-secondary hover:border-border-strong hover:text-text',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {draft.interests.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              {draft.interests.length} centre{draft.interests.length > 1 ? 's' : ''} d&apos;intérêt sélectionné{draft.interests.length > 1 ? 's' : ''}
            </p>
          )}
        </section>

        {/* ── Persona ── */}
        <section>
          <p className="mb-3 text-sm font-semibold text-text">{STRINGS.onboarding.persona.title}</p>
          <div className="space-y-4">
            {/* Qui es-tu */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STRINGS.onboarding.persona.personaOptions.map((opt) => {
                const active = draft.persona === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, persona: opt.id }))}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-left text-sm transition-all',
                      active
                        ? 'border-accent bg-accent/10 font-medium text-accent'
                        : 'border-border-subtle bg-surface-2/50 text-text-secondary hover:border-border-strong hover:text-text',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Niveau */}
            <div>
              <p className="mb-2 text-xs font-semibold text-text-secondary">
                {STRINGS.onboarding.persona.expertiseLabel}
              </p>
              <div className="flex gap-2">
                {STRINGS.onboarding.persona.expertiseOptions.map((opt) => {
                  const active = draft.expertise_level === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, expertise_level: opt.id }))}
                      className={cn(
                        'flex-1 rounded-xl border px-3 py-2 text-center text-xs transition-all',
                        active
                          ? 'border-accent bg-accent/10 font-medium text-accent'
                          : 'border-border-subtle bg-surface-2/50 text-text-secondary hover:border-border-strong hover:text-text',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temps */}
            <div>
              <p className="mb-2 text-xs font-semibold text-text-secondary">
                {STRINGS.onboarding.persona.timeLabel}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {STRINGS.onboarding.persona.timeOptions.map((opt) => {
                  const active = draft.time_per_week === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, time_per_week: opt.id }))}
                      className={cn(
                        'rounded-xl border px-4 py-2.5 text-left text-sm transition-all',
                        active
                          ? 'border-accent bg-accent/10 font-medium text-accent'
                          : 'border-border-subtle bg-surface-2/50 text-text-secondary hover:border-border-strong hover:text-text',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── À propos ── */}
        <section>
          <p className="mb-1 text-sm font-semibold text-text">{STRINGS.onboarding.about.title}</p>
          <p className="mb-3 text-xs text-text-muted">{STRINGS.onboarding.about.subtitle}</p>
          <Textarea
            value={draft.digest_about}
            onChange={(e) => setDraft((d) => ({ ...d, digest_about: e.target.value }))}
            placeholder={STRINGS.onboarding.about.placeholder}
            rows={4}
            className="resize-none text-sm"
          />
        </section>

        {/* ── Fréquence ── */}
        <section>
          <p className="mb-1 text-sm font-semibold text-text">{STRINGS.onboarding.frequency.title}</p>
          <p className="mb-3 text-xs text-text-muted">{STRINGS.onboarding.frequency.subtitle}</p>
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                { id: 'weekly' as DigestFrequency, ...STRINGS.onboarding.frequency.weekly, icon: Zap },
                { id: 'monthly' as DigestFrequency, ...STRINGS.onboarding.frequency.monthly, icon: Calendar },
                { id: 'off' as DigestFrequency, ...STRINGS.onboarding.frequency.off, icon: Check },
              ] as const
            ).map(({ id, label, desc, icon: Icon }) => {
              const active = draft.digest_frequency === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, digest_frequency: id }))}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border p-3.5 text-left transition-all',
                    active
                      ? 'border-accent bg-accent/10'
                      : 'border-border-subtle bg-surface-2/50 hover:border-border-strong',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      active ? 'bg-accent/20' : 'bg-surface-2',
                    )}
                  >
                    <Icon className={cn('h-4.5 w-4.5', active ? 'text-accent' : 'text-text-muted')} />
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', active ? 'text-accent' : 'text-text')}>
                      {label}
                    </p>
                    <p className="text-xs text-text-secondary">{desc}</p>
                  </div>
                  {active && (
                    <div className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Bouton Enregistrer ── */}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving && <Loader2 className="animate-spin" />}
          {saving ? STRINGS.common.loading : STRINGS.settings.save}
        </Button>
      </CardContent>
    </Card>
  );
}
