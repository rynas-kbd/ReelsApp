'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchReelById,
  updateReelNotes,
  recordView,
  placeholderThumbnail,
  type ReelWithCategory,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatNumber } from '@/lib/utils';

export default function ReelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const supabase = useMemo(() => createClient(), []);

  const [reel, setReel] = useState<ReelWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchReelById(supabase, id)
      .then((data) => {
        if (!data) {
          router.replace('/library');
          return;
        }
        setReel(data);
        setNotes(data.notes ?? '');
      })
      .catch(() => {
        router.replace('/library');
      })
      .finally(() => setLoading(false));
  }, [id, supabase, router]);

  async function handleOpenInstagram() {
    if (!reel) return;
    const url = reel.ig_url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    try {
      await recordView(supabase, reel.id);
    } catch {
      /* ignore */
    }
  }

  async function handleNoteBlur() {
    if (!reel) return;
    setSavingNotes(true);
    try {
      await updateReelNotes(supabase, reel.id, notes || null);
      toast.success('Sauvegardé ✓');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: '4/3' }} />
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!reel) return null;

  const thumb = reel.thumbnail_url || placeholderThumbnail(reel.shortcode ?? reel.id);
  const author = reel.author_username ? `@${reel.author_username}` : null;

  const catParent = reel.category?.parent;
  const catLabel = reel.category
    ? catParent
      ? `${catParent.name} › ${reel.category.name}`
      : reel.category.name
    : null;
  const catColor = catParent ? catParent.color : reel.category?.color;

  const title = reel.title ?? reel.caption ?? 'Réel Instagram';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Bibliothèque
      </Link>

      {/* Thumbnail */}
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
        <img
          src={thumb}
          alt={title}
          loading="lazy"
          style={{ aspectRatio: '4/3', objectFit: 'cover', width: '100%', borderRadius: 'var(--radius)' }}
        />
      </div>

      {/* Main content card */}
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-4">
        {/* Category badge */}
        {catLabel && reel.category && (
          <div>
            <Badge
              style={{
                backgroundColor: `${catColor}26`,
                color: catColor,
                borderColor: `${catColor}40`,
              }}
              className="max-w-[240px] truncate"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: catColor }}
              />
              <span className="truncate">{catLabel}</span>
            </Badge>
          </div>
        )}

        {/* Title */}
        <h1 className="font-display text-2xl font-bold text-text leading-tight">
          {title}
        </h1>

        {/* Author + meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {author && (
            <span className="font-medium text-accent">{author}</span>
          )}
          <span className="flex items-center gap-1 text-text-muted">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(reel.view_count)}
          </span>
          <span className="text-text-muted">
            Ajouté le {formatDate(reel.added_at)}
          </span>
        </div>

        {/* Open in Instagram button */}
        {reel.ig_url && (
          <div>
            <Button
              onClick={handleOpenInstagram}
              className="gap-2 bg-gradient-accent text-white hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir dans Instagram
            </Button>
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Résumé IA
        </p>
        {reel.summary ? (
          <p className="text-sm leading-relaxed text-text-secondary">{reel.summary}</p>
        ) : (
          <p className="text-sm text-text-muted italic">Résumé IA non disponible.</p>
        )}
      </div>

      {/* Tags */}
      {reel.tags && reel.tags.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reel.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {reel.transcript && (
        <div className="rounded-2xl border border-border-subtle bg-surface p-6">
          <details>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text transition-colors select-none">
              Transcription
            </summary>
            <p className="mt-3 text-xs text-text-muted whitespace-pre-wrap leading-relaxed">
              {reel.transcript}
            </p>
          </details>
        </div>
      )}

      {/* Notes */}
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Mes notes
          {savingNotes && (
            <span className="ml-2 font-normal normal-case text-text-muted opacity-60">
              Sauvegarde…
            </span>
          )}
        </p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Ajouter une note personnelle…"
          rows={4}
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
}
