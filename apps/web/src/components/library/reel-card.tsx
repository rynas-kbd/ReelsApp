'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
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
  onOpen?: (reel: ReelWithCategory) => void;
}) {
  const router = useRouter();
  const thumb = reel.thumbnail_url || placeholderThumbnail(reel.shortcode ?? reel.id);
  const author = reel.author_username ? `@${reel.author_username}` : null;
  const aspect = ASPECTS[index % ASPECTS.length];

  // Fil d'Ariane hiérarchique : Parent › Sous-catégorie
  const catParent = reel.category?.parent;
  const catLabel = reel.category
    ? catParent
      ? `${catParent.name} › ${reel.category.name}`
      : reel.category.name
    : null;
  const catColor = catParent ? catParent.color : reel.category?.color;

  // Tags : max 3 affichés
  const visibleTags = (reel.tags ?? []).slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => router.push(`/reel/${reel.id}`)}
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

        {catLabel && reel.category && (
          <div className="absolute left-2.5 top-2.5">
            <Badge
              style={{
                backgroundColor: `${catColor}26`,
                color: catColor,
                borderColor: `${catColor}40`,
              }}
              className="backdrop-blur-md max-w-[160px] truncate"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: catColor }}
              />
              <span className="truncate">{catLabel}</span>
            </Badge>
          </div>
        )}

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          {formatNumber(reel.view_count)}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-accent px-3 py-1.5 text-xs font-medium text-white shadow-glow">
            Voir le détail
          </span>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="flex flex-col gap-1 p-3.5">
        <h3 className="line-clamp-2 text-sm font-medium text-text">
          {reel.title || reel.caption || 'Réel sans titre'}
        </h3>

        {/* Résumé IA */}
        {reel.summary && (
          <p className="line-clamp-2 text-xs text-text-secondary leading-relaxed">
            {reel.summary}
          </p>
        )}

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {author && <p className="text-xs text-text-secondary">{author}</p>}
        <p className="pt-0.5 text-xs text-text-muted">
          {STRINGS.library.addedOn} {formatDate(reel.added_at)}
        </p>
      </div>
    </button>
  );
}
