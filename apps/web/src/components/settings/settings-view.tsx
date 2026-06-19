'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FileDown, FileText, Instagram, Loader2, Moon } from 'lucide-react';
import { toast } from 'sonner';
import {
  STRINGS,
  ensureConnection,
  fetchProfile,
  updateProfile,
  fetchReels,
  type InstagramConnection,
  type Profile,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { reelsToCsv, downloadBlob } from '@/lib/export';

export function SettingsView({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const [savingName, setSavingName] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          fetchProfile(supabase, userId),
          ensureConnection(supabase, userId),
        ]);
        setProfile(p);
        setDisplayName(p?.display_name ?? '');
        setConnection(c);
      } catch {
        toast.error(STRINGS.common.error);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, userId]);

  async function saveName() {
    setSavingName(true);
    try {
      await updateProfile(supabase, userId, { display_name: displayName.trim() || null });
      toast.success(STRINGS.settings.saved);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setSavingName(false);
    }
  }

  async function toggleNotif(value: boolean) {
    setSavingNotif(true);
    setProfile((p) => (p ? { ...p, notif_enabled: value } : p));
    try {
      await updateProfile(supabase, userId, { notif_enabled: value });
      toast.success(STRINGS.settings.saved);
    } catch {
      setProfile((p) => (p ? { ...p, notif_enabled: !value } : p));
      toast.error(STRINGS.common.error);
    } finally {
      setSavingNotif(false);
    }
  }

  async function copyCode() {
    if (!connection) return;
    try {
      await navigator.clipboard.writeText(connection.activation_code);
      setCopied(true);
      toast.success(STRINGS.instagram.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(STRINGS.common.error);
    }
  }

  async function exportCsv() {
    setExporting('csv');
    try {
      const reels = await fetchReels(supabase, {}, { limit: 1000, offset: 0 });
      const csv = reelsToCsv(reels);
      downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), 'reelvault.csv');
      toast.success(STRINGS.settings.saved);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    setExporting('pdf');
    try {
      const reels = await fetchReels(supabase, {}, { limit: 1000, offset: 0 });
      // Import dynamique : @react-pdf/renderer reste hors du bundle initial.
      const [{ pdf }, { ReelsPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/settings/reels-pdf'),
      ]);
      const blob = await pdf(<ReelsPdf reels={reels} />).toBlob();
      downloadBlob(blob, 'reelvault.pdf');
      toast.success(STRINGS.settings.saved);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const status = connection?.status ?? 'pending';
  const statusBadge =
    status === 'active'
      ? { label: STRINGS.instagram.statusActive, variant: 'success' as const }
      : status === 'revoked'
        ? { label: STRINGS.instagram.statusRevoked, variant: 'danger' as const }
        : { label: STRINGS.instagram.statusPending, variant: 'warning' as const };

  return (
    <div className="space-y-6">
      {/* Compte */}
      <Card>
        <CardHeader>
          <CardTitle>{STRINGS.settings.account}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">{STRINGS.settings.displayName}</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={STRINGS.settings.displayName}
              />
              <Button onClick={saveName} disabled={savingName}>
                {savingName && <Loader2 className="animate-spin" />}
                {STRINGS.settings.save}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connexion Instagram */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-accent" />
              {STRINGS.settings.instagram}
            </CardTitle>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'active' && connection?.ig_username ? (
            <p className="text-sm text-text-secondary">
              {STRINGS.instagram.connectedAs}{' '}
              <span className="font-medium text-text">@{connection.ig_username}</span>
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-text">{STRINGS.instagram.activationTitle}</p>
              <ol className="space-y-3 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">1.</span>
                  {STRINGS.instagram.activationStep1}
                </li>
                <li className="flex flex-col gap-2">
                  <span className="flex gap-2">
                    <span className="font-semibold text-accent">2.</span>
                    {STRINGS.instagram.activationStep2}
                  </span>
                  <div className="ml-5 flex items-center gap-2">
                    <code className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 font-mono text-base tracking-widest text-text">
                      {connection?.activation_code ?? '—'}
                    </code>
                    <Button variant="secondary" size="sm" onClick={copyCode}>
                      {copied ? <Check className="text-success" /> : <Copy />}
                      {STRINGS.instagram.copyCode}
                    </Button>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">3.</span>
                  {STRINGS.instagram.activationStep3}
                </li>
              </ol>
            </>
          )}
        </CardContent>
      </Card>

      {/* Préférences */}
      <Card>
        <CardHeader>
          <CardTitle>{STRINGS.settings.preferences}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-text">{STRINGS.settings.notifications}</Label>
              <p className="mt-1 text-xs text-text-muted">{STRINGS.settings.notificationsHelp}</p>
            </div>
            <Switch
              checked={profile?.notif_enabled ?? false}
              disabled={savingNotif}
              onCheckedChange={toggleNotif}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border-subtle pt-5">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-text-muted" />
              <Label className="text-text">{STRINGS.settings.theme}</Label>
            </div>
            <Badge variant="secondary">{STRINGS.settings.darkMode}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>{STRINGS.settings.export}</CardTitle>
          <CardDescription>{STRINGS.app.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={exportCsv} disabled={exporting !== null}>
            {exporting === 'csv' ? <Loader2 className="animate-spin" /> : <FileDown />}
            {STRINGS.settings.exportCsv}
          </Button>
          <Button variant="secondary" onClick={exportPdf} disabled={exporting !== null}>
            {exporting === 'pdf' ? <Loader2 className="animate-spin" /> : <FileText />}
            {STRINGS.settings.exportPdf}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
