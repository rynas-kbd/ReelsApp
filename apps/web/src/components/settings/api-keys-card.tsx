'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  STRINGS,
  addApiKey,
  deleteApiKey,
  fetchApiKeys,
  maskApiKey,
  type ApiKeyProvider,
  type UserApiKey,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const PROVIDERS: { id: ApiKeyProvider; label: string; help: string }[] = [
  { id: 'gemini', label: STRINGS.apiKeys.gemini, help: STRINGS.apiKeys.geminiHelp },
  { id: 'rapidapi', label: STRINGS.apiKeys.rapidapi, help: STRINGS.apiKeys.rapidapiHelp },
  { id: 'groq', label: STRINGS.apiKeys.groq, help: STRINGS.apiKeys.groqHelp },
];

export function ApiKeysCard({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<ApiKeyProvider, string>>({ gemini: '', rapidapi: '', groq: '' });
  const [saving, setSaving] = useState<ApiKeyProvider | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setKeys(await fetchApiKeys(supabase));
      } catch {
        toast.error(STRINGS.common.error);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  async function add(provider: ApiKeyProvider) {
    const value = drafts[provider].trim();
    if (!value) return;
    setSaving(provider);
    try {
      await addApiKey(supabase, userId, provider, value);
      setDrafts((d) => ({ ...d, [provider]: '' }));
      setKeys(await fetchApiKeys(supabase));
      toast.success(STRINGS.apiKeys.added);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setSaving(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(STRINGS.apiKeys.deleteConfirm)) return;
    setDeleting(id);
    try {
      await deleteApiKey(supabase, id);
      setKeys((k) => k.filter((x) => x.id !== id));
      toast.success(STRINGS.apiKeys.deleted);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-accent" />
          {STRINGS.apiKeys.title}
        </CardTitle>
        <CardDescription>{STRINGS.apiKeys.intro}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PROVIDERS.map((p) => {
          const list = keys.filter((k) => k.provider === p.id);
          const now = Date.now();
          return (
            <div key={p.id} className="space-y-3">
              <div>
                <Label className="text-text">{p.label}</Label>
                <p className="mt-1 text-xs text-text-muted">{p.help}</p>
              </div>

              {!loading && list.length === 0 && (
                <p className="text-xs text-text-muted">{STRINGS.apiKeys.none}</p>
              )}

              <ul className="space-y-2">
                {list.map((k) => {
                  const cooling = k.cooldown_until && new Date(k.cooldown_until).getTime() > now;
                  return (
                    <li
                      key={k.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border-subtle px-3 py-2"
                    >
                      <div className="min-w-0">
                        <code className="text-sm text-text">{maskApiKey(k.key)}</code>
                        {cooling && (
                          <Badge variant="warning" className="ml-2">
                            {STRINGS.apiKeys.inCooldown}
                          </Badge>
                        )}
                        {k.last_error && !cooling && (
                          <p className="truncate text-xs text-text-muted">
                            {STRINGS.apiKeys.lastError}: {k.last_error}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleting === k.id}
                        onClick={() => remove(k.id)}
                        aria-label={STRINGS.common.delete}
                      >
                        {deleting === k.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex gap-2">
                <Input
                  type="password"
                  value={drafts[p.id]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  placeholder={STRINGS.apiKeys.placeholder}
                  onKeyDown={(e) => e.key === 'Enter' && add(p.id)}
                />
                <Button onClick={() => add(p.id)} disabled={saving === p.id || !drafts[p.id].trim()}>
                  {saving === p.id ? <Loader2 className="animate-spin" /> : <Plus />}
                  {STRINGS.apiKeys.add}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
