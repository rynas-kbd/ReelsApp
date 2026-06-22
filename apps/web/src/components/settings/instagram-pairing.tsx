'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Loader2, RefreshCw, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { STRINGS, fetchConnection, type InstagramConnection } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

/**
 * Jumelage du compte principal : affiche le code à envoyer en DM depuis le compte
 * principal, ou l'état « relié » une fois le sender reconnu par le webhook.
 */
export function InstagramPairing({
  connection,
  onChange,
}: {
  connection: InstagramConnection;
  onChange?: (c: InstagramConnection) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
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
        if (fresh.sender_id) toast.success(STRINGS.pairing.paired);
      }
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setChecking(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(STRINGS.pairing.copied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible : l'utilisateur peut recopier à la main */
    }
  }

  if (paired) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-medium text-text">{STRINGS.pairing.paired}</p>
          <p className="mt-0.5 text-xs text-text-muted">{STRINGS.pairing.pairedHelp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border-subtle bg-surface-2/50 p-4">
      <div>
        <p className="text-sm font-medium text-text">{STRINGS.pairing.title}</p>
        <p className="mt-1 text-xs text-text-muted">{STRINGS.pairing.intro}</p>
      </div>

      <div>
        <p className="text-xs text-text-muted">{STRINGS.pairing.codeLabel}</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="rounded-lg bg-bg px-3 py-2 text-lg font-bold tracking-widest text-accent">
            {code}
          </code>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {STRINGS.pairing.copy}
          </Button>
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-secondary">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              {i + 1}
            </span>
            <span className="pt-px">{s}</span>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">{STRINGS.pairing.waiting}</span>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={checking}>
          {checking ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {STRINGS.pairing.refresh}
        </Button>
      </div>
    </div>
  );
}
