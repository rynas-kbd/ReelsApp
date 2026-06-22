'use client';

import Image from 'next/image';
import { Eye, ExternalLink } from 'lucide-react';
import { STRINGS, placeholderThumbnail, type ReelWithCategory } from '@reelvault/shared';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatNumber } from '@/lib/utils';

// Variation d'aspect pour un rythme éditorial (bento/masonry).
const ASPECTS = ['aspect-[4/5]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[4/6]', 'aspect-[4/5]'];

export function ReelCard({
  reel,
  index = 0,
  onOpen,
}: {
  reel: ReelWithCategory;
  index?: number;
  onOpen: (reel: ReelWithCategory) => void;
}) {
  const thumb = reel.thumbnail_url || placeholderThumbnail(reel.shortcode ?? reel.id);
  const author = reel.author_username ? `@${reel.author_username}` : null;
  const aspect = ASPECTS[index % ASPECTS.length];

  return (
    <button
      type="button"
      onClick={() => onOpen(reel)}
      className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border-subtle bg-surface text-left shadow-soft transition-all duration-200 ease-smooth animate-fade-up hover:-translate-y-0.5 hover:border-border-strong hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mb-4"
    >
      {/* Miniature (aspect variable) */}
      <div className={`relative w-full overflow-hidden bg-surface-2 ${aspect}`}>
        <Image
          src={thumb}
          alt={reel.title || 'Réel Instagram'}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 ease-smooth group-hover:scale-[1.04]"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />

        {reel.category && (
          <div className="absolute left-2.5 top-2.5">
            <Badge
              style={{
                backgroundColor: `${reel.category.color}26`,
                color: reel.category.color,
                borderColor: `${reel.category.color}40`,
              }}
              className="backdrop-blur-md"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: reel.category.color }}
              />
              {reel.category.name}
            </Badge>
          </div>
        )}

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          {formatNumber(reel.view_count)}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-accent px-3 py-1.5 text-xs font-medium text-white shadow-glow">
            <ExternalLink className="h-3.5 w-3.5" />
            {STRINGS.library.openInInstagram}
          </span>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="flex flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-sm font-medium text-text">
          {reel.title || reel.caption || 'Réel sans titre'}
        </h3>
        {author && <p className="text-xs text-text-secondary">{author}</p>}
        <p className="pt-1 text-xs text-text-muted">
          {STRINGS.library.addedOn} {formatDate(reel.added_at)}
        </p>
      </div>
    </button>
  );
}
