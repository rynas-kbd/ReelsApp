'use client';

import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Chips de tags multi-sélection pour la bibliothèque.
 * Croiser plusieurs tags retourne les réels qui possèdent AU MOINS l'un d'eux (overlaps).
 */
export function TagFilter({
  tags,
  activeTags,
  onToggle,
}: {
  tags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  const activeSet = new Set(activeTags);

  return (
    <div className="flex items-center gap-2">
      <Tag className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {tags.map((tag) => {
          const active = activeSet.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border-subtle bg-surface text-text-muted hover:border-border-strong hover:text-text-secondary',
              )}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
