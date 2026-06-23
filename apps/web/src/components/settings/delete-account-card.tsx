'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { STRINGS } from '@reelvault/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const S = STRINGS.settings;
const CONFIRM_WORD = S.deleteConfirmWord; // 'SUPPRIMER'

/**
 * Carte « Zone de danger » : suppression définitive du compte.
 * La confirmation exige de taper le mot SUPPRIMER avant de débloquer le bouton.
 */
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const confirmed = input === CONFIRM_WORD;

  async function handleDelete() {
    if (!confirmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? 'erreur');
      }
      // Rechargement complet → clear cookies + état React
      window.location.href = '/login';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : STRINGS.common.error);
      setLoading(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) setInput('');
    setOpen(v);
  }

  return (
    <Card className="border-danger/40">
      <CardHeader>
        <CardTitle className="text-danger">{S.deleteAccountTitle}</CardTitle>
        <CardDescription>{S.deleteAccountDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
              {S.deleteAccount}
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-danger">{S.deleteAccount}</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-1">
                  <p>{S.deleteAccountWarning}</p>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary text-xs ml-1">
                    {S.deleteAccountList.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <p className="text-sm text-text-secondary">{S.deleteConfirmHint}</p>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={CONFIRM_WORD}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                className="font-mono tracking-widest"
              />
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                {S.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!confirmed || loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {S.deleteAccountCta}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
