'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  FolderTree,
  Instagram,
  KeyRound,
  Loader2,
  Search,
  Share2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { STRINGS, updateProfile, type InstagramConnection } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { ApiKeysCard } from '@/components/settings/api-keys-card';
import { InstagramPairing } from '@/components/settings/instagram-pairing';

type StepId = 'welcome' | 'connect' | 'pair' | 'keys' | 'howto' | 'done';
const STEPS: StepId[] = ['welcome', 'connect', 'pair', 'keys', 'howto', 'done'];

export function OnboardingWizard({
  userId,
  connection,
  igResult,
}: {
  userId: string;
  connection: InstagramConnection | null;
  igResult: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const igConnected = connection?.status === 'active';
  const igUsername = connection?.ig_username ?? null;

  // Au retour d'OAuth (?ig=…), on reprend directement à l'étape « connexion ».
  const [stepIndex, setStepIndex] = useState(igResult ? 1 : 0);
  const [connecting, setConnecting] = useState(false);
  const [finishing, setFinishing] = useState(false);

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
    window.location.href = '/api/instagram/connect?next=/onboarding';
  }

  async function finish() {
    setFinishing(true);
    try {
      await updateProfile(supabase, userId, { onboarded: true });
      router.replace('/dashboard');
    } catch {
      setFinishing(false);
      toast.error(STRINGS.common.error);
    }
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-x-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-[120px]"
        style={{ background: 'rgba(217, 70, 239, 0.18)' }}
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" showName />
        </div>

        {/* Indicateur d'étapes */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i <= stepIndex ? 'w-8 bg-accent' : 'w-4 bg-border-strong'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-8 shadow-xl">
          {step === 'welcome' && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold text-text">{STRINGS.onboarding.welcome.title}</h1>
              <p className="mt-3 text-sm text-text-secondary">
                {STRINGS.onboarding.welcome.subtitle}
              </p>
              <Button className="mt-8 w-full" onClick={next}>
                {STRINGS.onboarding.welcome.cta}
              </Button>
            </div>
          )}

          {step === 'connect' && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                <Instagram className="h-7 w-7 text-accent" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-text">
                {STRINGS.onboarding.connect.title}
              </h1>
              <p className="mt-3 text-sm text-text-secondary">
                {STRINGS.onboarding.connect.subtitle}
              </p>

              {igConnected ? (
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-text">
                  <Check className="h-4 w-4 text-success" />
                  <span>
                    {STRINGS.onboarding.connect.connected}
                    {igUsername ? ` — @${igUsername}` : ''}
                  </span>
                </div>
              ) : (
                <Button className="mt-6 w-full" onClick={connectInstagram} disabled={connecting}>
                  {connecting ? <Loader2 className="animate-spin" /> : <Instagram />}
                  {connecting ? STRINGS.instagram.connecting : STRINGS.instagram.connect}
                </Button>
              )}

              <div className="mt-6 flex w-full items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>
                  {STRINGS.onboarding.back}
                </Button>
                <Button variant={igConnected ? 'default' : 'secondary'} onClick={next}>
                  {igConnected ? STRINGS.onboarding.next : STRINGS.onboarding.skip}
                </Button>
              </div>
            </div>
          )}

          {step === 'pair' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <UserCheck className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-text">
                  {STRINGS.onboarding.pair.title}
                </h1>
                <p className="mt-3 text-sm text-text-secondary">
                  {STRINGS.onboarding.pair.subtitle}
                </p>
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
                <Button variant="ghost" onClick={back}>
                  {STRINGS.onboarding.back}
                </Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {step === 'keys' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                  <KeyRound className="h-7 w-7 text-accent" />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-text">
                  {STRINGS.onboarding.keys.title}
                </h1>
                <p className="mt-3 text-sm text-text-secondary">
                  {STRINGS.onboarding.keys.subtitle}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <Tutorial
                  title={STRINGS.onboarding.keys.geminiTitle}
                  steps={STRINGS.onboarding.keys.geminiSteps}
                />
                <Tutorial
                  title={STRINGS.onboarding.keys.rapidTitle}
                  steps={STRINGS.onboarding.keys.rapidSteps}
                />
                <p className="text-xs text-text-muted">{STRINGS.onboarding.keys.optional}</p>
                <ApiKeysCard userId={userId} />
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>
                  {STRINGS.onboarding.back}
                </Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {step === 'howto' && (
            <div className="flex flex-col">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-text">{STRINGS.onboarding.howto.title}</h1>
                <p className="mt-3 text-sm text-text-secondary">
                  {STRINGS.onboarding.howto.subtitle}
                </p>
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
                <Button variant="ghost" onClick={back}>
                  {STRINGS.onboarding.back}
                </Button>
                <Button onClick={next}>{STRINGS.onboarding.next}</Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
                <FolderTree className="h-7 w-7 text-success" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-text">{STRINGS.onboarding.done.title}</h1>
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

/** Petit bloc « comment obtenir la clé » : titre + étapes numérotées. */
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
