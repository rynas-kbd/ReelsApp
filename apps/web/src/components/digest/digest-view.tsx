'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Calendar, ExternalLink, Loader2, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  STRINGS,
  rateDigest,
  placeholderThumbnail,
  type Digest,
  type DigestWithReels,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export function DigestView({
  latest,
  history,
}: {
  latest: DigestWithReels | null;
  history: Digest[];
}) {
  const supabase = createClient();
  const [digest, setDigest] = useState<DigestWithReels | null>(latest);
  const [historyList, setHistoryList] = useState<Digest[]>(history);
  const [rating, setRating] = useState<number | null>(latest?.rating ?? null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleRate(stars: number) {
    if (!digest || rating !== null) return;
    setSaving(true);
    try {
      await rateDigest(supabase, digest.id, stars);
      setRating(stars);
      setDigest((d) => (d ? { ...d, rating: stars } : d));
      toast.success(STRINGS.digest.thanks);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/digest/generate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { tooFew?: boolean };
        toast.error(data.tooFew ? STRINGS.digest.tooFewReels : STRINGS.digest.generateError);
        return;
      }
      // Recharge la page pour afficher le nouveau digest.
      window.location.reload();
    } catch {
      toast.error(STRINGS.digest.generateError);
    } finally {
      setGenerating(false);
    }
  }

  const alreadyRated = rating !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 lg:px-6">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-text">{STRINGS.digest.title}</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? STRINGS.digest.generating : STRINGS.digest.generateNow}
        </Button>
      </div>

      {!digest ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-10 text-center">
          <p className="text-sm text-text-secondary">{STRINGS.digest.empty}</p>
        </div>
      ) : (
        <>
          {/* Synthèse IA */}
          {digest.summary && (
            <div className="rounded-2xl border border-border-subtle bg-surface p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {STRINGS.digest.summaryTitle}
              </p>
              <p className="text-sm leading-relaxed text-text">{digest.summary}</p>
              {/* Méta */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                {digest.frequency && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {STRINGS.digest.frequencyLabel(digest.frequency)}
                  </span>
                )}
                {digest.period_start && digest.period_end && (
                  <span>{STRINGS.digest.periodLabel(
                    formatDate(digest.period_start),
                    formatDate(digest.period_end),
                  )}</span>
                )}
              </div>
            </div>
          )}

          {/* Sélection */}
          <div>
            <p className="mb-4 text-sm font-semibold text-text">{STRINGS.digest.selectionTitle}</p>
            <div className="columns-2 gap-3 sm:columns-3">
              {digest.reels.map((reel) => {
                const thumb = reel.thumbnail_url || placeholderThumbnail(reel.shortcode ?? reel.id);
                return (
                  <a
                    key={reel.id}
                    href={reel.ig_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mb-3 block break-inside-avoid overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-glow"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-2">
                      <Image
                        src={thumb}
                        alt={reel.title || 'Réel'}
                        fill
                        sizes="(max-width:640px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      {reel.category && (
                        <div className="absolute left-2.5 top-2.5">
                          <Badge
                            style={{
                              backgroundColor: `${reel.category.color}26`,
                              color: reel.category.color,
                              borderColor: `${reel.category.color}40`,
                            }}
                            className="backdrop-blur-md text-[10px]"
                          >
                            {reel.category.name}
                          </Badge>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 rounded-full bg-gradient-accent px-3 py-1.5 text-xs font-medium text-white">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {STRINGS.library.openInInstagram}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-medium text-text">
                        {reel.title || reel.caption || 'Réel'}
                      </p>
                      {reel.reason && (
                        <p className="mt-1.5 text-[10px] italic text-text-secondary line-clamp-2">
                          {reel.reason}
                        </p>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Vote */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6">
            <p className="text-sm font-semibold text-text">{STRINGS.digest.rateTitle}</p>
            <p className="mt-1 text-xs text-text-muted">{alreadyRated ? STRINGS.digest.rated : STRINGS.digest.rateHelp}</p>
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={alreadyRated || saving}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => !alreadyRated && setHovered(star)}
                  onMouseLeave={() => setHovered(null)}
                  className="transition-transform disabled:cursor-default enabled:hover:scale-110"
                  aria-label={STRINGS.digest.stars(star)}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hovered ?? rating ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-border-strong'
                    }`}
                  />
                </button>
              ))}
              {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin text-text-muted" />}
            </div>
          </div>
        </>
      )}

      {/* Historique */}
      {historyList.length > 1 && (
        <div>
          <p className="mb-4 text-sm font-semibold text-text">{STRINGS.digest.history}</p>
          <div className="space-y-2">
            {historyList.slice(1).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm text-text">
                    {d.frequency ? STRINGS.digest.period[d.frequency as 'weekly' | 'monthly'] ?? d.frequency : '—'}
                  </p>
                  {d.period_start && d.period_end && (
                    <p className="text-xs text-text-muted">
                      {STRINGS.digest.periodLabel(formatDate(d.period_start), formatDate(d.period_end))}
                    </p>
                  )}
                </div>
                {d.rating ? (
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="h-4 w-4 fill-amber-400" />
                    <span className="text-sm font-medium">{d.rating}/5</span>
                  </div>
                ) : (
                  <span className="text-xs text-text-muted">Non noté</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {historyList.length === 0 && !digest && (
        <p className="text-center text-xs text-text-muted">{STRINGS.digest.noHistory}</p>
      )}
    </div>
  );
}
