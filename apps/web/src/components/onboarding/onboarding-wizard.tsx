'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  Check,
  FolderTree,
  Instagram,
  KeyRound,
  Loader2,
  Search,
  Share2,
  Sparkles,
  Target,
  User,
  UserCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { STRINGS, updateProfile, type DigestFrequency, type InstagramConnection, type Profile } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApiKeysCard } from '@/components/settings/api-keys-card';
import { InstagramPairing } from '@/components/settings/instagram-pairing';
import { cn } from '@/lib/utils';

type StepId = 'welcome' | 'connect' | 'pair' | 'keys' | 'goals' | 'interests' | 'persona' | 'about' | 'frequency' | 'howto' | 'done';
const STEPS: StepId[] = ['welcome', 'connect', 'pair', 'keys', 'goals', 'interests', 'persona', 'about', 'frequency', 'howto', 'done'];

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

export function OnboardingWizard({
  userId,
  connection,
  igResult,
  profile,
}: {
  userId: string;
  connection: InstagramConnection | null;
  igResult: string | null;
  profile: Profile | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const igConnected = connection?.status === 'active';
  const igUsername = connection?.ig_username ?? null;

  const [stepIndex, setStepIndex] = useState(igResult ? 1 : 0);
  const [connecting, setConnecting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => initDraft(profile));

  useEffect(() => {
    if (!igResult) return;
    const map: Record<string, () => void> = {
      connected: () => toast.success(STRINGS.instagram.connectSuccess),
      denied: () => toast.error(STRINGS.instagram.errorDenied),
      state: () => toast.error(STRINGS.instagram.errorState),
      exchange: () => toast.error(STRINGS.instagram.errorExchange),
      config: () => toast.error(STRINGS.instagram.errorConfig),
    };
    (map[igResult] ?? (() => {}))();
    window.history.replaceState({}, '', window.location.pathname);
  }, [igResult]);

  const step = STEPS[stepIndex];
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  function connectInstagram() {
    setConnecting(true);
    // Ouvre le flux OAuth dans un nouvel onglet (le retour ?ig=… s'affichera là-bas).
    window.open('/api/instagram/connect?next=/onboarding', '_blank', 'noopener,noreferrer');
    // L'authentification se poursuit dans le nouvel onglet : on réactive le bouton ici.
    setTimeout(() => setConnecting(false), 1500);
  }

  async function finish() {
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
      router.replace('/dashboard');
    } catch {
      setFinishing(false);
      toast.error(STRINGS.common.error);
    }
  }

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

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-x-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-brand-to/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" showName />
        </div>

        {/* Indicateur d'étapes */}
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i <= stepIndex ? 'w-8 bg-accent' : 'w-3 bg-border-strong'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-8 shadow-xl">

          {/* ── WELCOME ── */}
          {step === 'welcome' && (
            <div className="flex flex-col items-center text-center">
              <h1 className="font-display text-2xl font-bold text-text">{STRINGS.onboarding.welcome.title}</h1>
              <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.welcome.subtitle}</p>
              <Button className="mt-8 w-full" onClick={next}>{STRINGS.onboarding.welcome.cta}</Button>
            </div>
          )}

          {/* ── CONNECT INSTAGRAM ── */}
          {step === 'connect' && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                <Instagram className="h-7 w-7 text-accent" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.connect.title}</h1>
              <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.connect.subtitle}</p>
              {igConnected ? (
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-text">
                  <Check className="h-4 w-4 text-success" />
                  <span>{STRINGS.onboarding.connect.connected}{igUsername ? ` — @${igUsername}` : ''}</span>
                </div>
              ) : (
                <Button className="mt-6 w-full" onClick={connectInstagram} disabled={connecting}>
                  {connecting ? <Loader2 className="animate-spin" /> : <Instagram />}
                  {connecting ? STRINGS.instagram.connecting : STRINGS.instagram.connect}
                </Button>
              )}
              <div className="mt-6 flex w-full items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button variant={igConnected ? 'default' : 'secondary'} onClick={next}>
                  {igConnected ? STRINGS.onboarding.next : STRINGS.onboarding.skip}
                </Button>
              </div>
            </div>
          )}

          {/* ── PAIR ── */}
          {step === 'pair' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <UserCheck className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.pair.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.pair.subtitle}</p>
              </div>
              <div className="mt-6">
                {igConnected && connection ? (
                  <InstagramPairing connection={connection} />
                ) : (
                  <p className="rounded-xl border border-border-subtle bg-surface-2/50 px-4 py-3 text-sm text-text-muted">
                    {STRINGS.onboarding.pair.needConnect}
                  </p>
                )}
              </div>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── KEYS ── */}
          {step === 'keys' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <KeyRound className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.keys.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.keys.subtitle}</p>
              </div>
              <div className="mt-6 space-y-4">
                <Tutorial title={STRINGS.onboarding.keys.geminiTitle} steps={STRINGS.onboarding.keys.geminiSteps} />
                <Tutorial title={STRINGS.onboarding.keys.rapidTitle} steps={STRINGS.onboarding.keys.rapidSteps} />
                <p className="text-xs text-text-muted">{STRINGS.onboarding.keys.optional}</p>
                <ApiKeysCard userId={userId} />
              </div>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── GOALS ── */}
          {step === 'goals' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <Target className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.goals.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.goals.subtitle}</p>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STRINGS.onboarding.goals.options.map((opt) => {
                  const active = draft.goals.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleGoal(opt.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                        active
                          ? 'border-accent bg-accent/10 text-accent font-medium'
                          : 'border-border-subtle bg-surface-2/50 text-text-secondary hover:border-border-strong hover:text-text',
                      )}
                    >
                      <span className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                        active ? 'border-accent bg-accent' : 'border-border-strong',
                      )}>
                        {active && <Check className="h-3 w-3 text-white" />}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── INTERESTS ── */}
          {step === 'interests' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <Sparkles className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.interests.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.interests.subtitle}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 max-h-72 overflow-y-auto pr-1">
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
                <p className="mt-3 text-xs text-text-muted">{draft.interests.length} centre{draft.interests.length > 1 ? 's' : ''} d&apos;intérêt sélectionné{draft.interests.length > 1 ? 's' : ''}</p>
              )}
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── PERSONA ── */}
          {step === 'persona' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <User className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.persona.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.persona.subtitle}</p>
              </div>

              <div className="mt-5 space-y-5">
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
                          'rounded-xl border px-4 py-3 text-sm text-left transition-all',
                          active
                            ? 'border-accent bg-accent/10 text-accent font-medium'
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
                  <p className="mb-2 text-xs font-semibold text-text-secondary">{STRINGS.onboarding.persona.expertiseLabel}</p>
                  <div className="flex gap-2">
                    {STRINGS.onboarding.persona.expertiseOptions.map((opt) => {
                      const active = draft.expertise_level === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, expertise_level: opt.id }))}
                          className={cn(
                            'flex-1 rounded-xl border px-3 py-2.5 text-xs text-center transition-all',
                            active
                              ? 'border-accent bg-accent/10 text-accent font-medium'
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
                  <p className="mb-2 text-xs font-semibold text-text-secondary">{STRINGS.onboarding.persona.timeLabel}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {STRINGS.onboarding.persona.timeOptions.map((opt) => {
                      const active = draft.time_per_week === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, time_per_week: opt.id }))}
                          className={cn(
                            'rounded-xl border px-4 py-2.5 text-sm text-left transition-all',
                            active
                              ? 'border-accent bg-accent/10 text-accent font-medium'
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

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── ABOUT ── */}
          {step === 'about' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <BookOpen className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.about.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.about.subtitle}</p>
              </div>
              <div className="mt-6">
                <Textarea
                  value={draft.digest_about}
                  onChange={(e) => setDraft((d) => ({ ...d, digest_about: e.target.value }))}
                  placeholder={STRINGS.onboarding.about.placeholder}
                  rows={5}
                  className="resize-none text-sm"
                />
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── FREQUENCY ── */}
          {step === 'frequency' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <Calendar className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.frequency.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.frequency.subtitle}</p>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3">
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
                        'flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                        active
                          ? 'border-accent bg-accent/10'
                          : 'border-border-subtle bg-surface-2/50 hover:border-border-strong',
                      )}
                    >
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        active ? 'bg-accent/20' : 'bg-surface-2',
                      )}>
                        <Icon className={cn('h-5 w-5', active ? 'text-accent' : 'text-text-muted')} />
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold', active ? 'text-accent' : 'text-text')}>{label}</p>
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
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── HOWTO ── */}
          {step === 'howto' && (
            <div className="flex flex-col">
              <div className="text-center">
                <h1 className="font-display text-2xl font-bold text-text">{STRINGS.onboarding.howto.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.howto.subtitle}</p>
              </div>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: Share2, text: STRINGS.onboarding.howto.point1 },
                  { icon: Sparkles, text: STRINGS.onboarding.howto.point2 },
                  { icon: Search, text: STRINGS.onboarding.howto.point3 },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <p className="pt-1.5 text-sm text-text-secondary">{text}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>{STRINGS.onboarding.back}</Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
                <FolderTree className="h-7 w-7 text-success" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold text-text">{STRINGS.onboarding.done.title}</h1>
              <p className="mt-3 text-sm text-text-secondary">{STRINGS.onboarding.done.subtitle}</p>
              <Button className="mt-8 w-full" onClick={finish} disabled={finishing}>
                {finishing && <Loader2 className="animate-spin" />}
                {STRINGS.onboarding.done.cta}
              </Button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={finish}
              disabled={finishing}
              className="text-xs text-text-muted underline-offset-4 hover:underline disabled:opacity-50"
            >
              {STRINGS.onboarding.skip}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Tutorial({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2/50 p-4">
      <p className="text-sm font-semibold text-text">{title}</p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-xs text-text-secondary">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
