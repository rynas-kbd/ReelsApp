'use client';

import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useState } from 'react';
import { STRINGS, type CategoryWithChildren } from '@reelvault/shared';
import { cn } from '@/lib/utils';

/**
 * Sidebar arborescente des catégories (desktop).
 * Chaque racine est repliable pour afficher ses sous-catégories.
 * Cliquer sur une racine filtre toute la branche (racine + enfants).
 * Cliquer sur une sous-catégorie filtre uniquement cette sous-catégorie.
 */
export function CategoryTree({
  tree,
  counts,
  total,
  activeCategory,
  onSelect,
}: {
  tree: CategoryWithChildren[];
  counts: Record<string, number>;
  total: number;
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
}) {
  // Nœuds ouverts (initialement tout ouvert si la catégorie active est enfant)
  const initialOpen = new Set<string>(
    tree.filter((r) => r.children.some((c) => c.id === activeCategory)).map((r) => r.id),
  );
  const [openRoots, setOpenRoots] = useState<Set<string>>(initialOpen);

  function toggleRoot(id: string) {
    setOpenRoots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {/* Toutes les catégories */}
      <TreeItem
        active={activeCategory === null}
        onClick={() => onSelect(null)}
        label={STRINGS.library.allCategories}
        count={total}
        icon={<Layers className="h-4 w-4 shrink-0 text-text-muted" />}
      />

      {tree.map((root) => {
        const isOpen = openRoots.has(root.id);
        const rootActive = activeCategory === root.id;
        const childActive = root.children.some((c) => c.id === activeCategory);
        const count = counts[root.id] ?? 0;

        return (
          <div key={root.id}>
            {/* Racine */}
            <div className="flex items-center gap-1">
              {root.children.length > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleRoot(root.id)}
                  className="flex h-7 w-5 shrink-0 items-center justify-center rounded text-text-muted hover:text-text"
                  aria-label={isOpen ? 'Réduire' : 'Développer'}
                >
                  {isOpen
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
              <TreeItem
                active={rootActive || childActive}
                color={root.color}
                onClick={() => onSelect(rootActive ? null : root.id)}
                label={root.name}
                count={count}
                dot
                className="flex-1"
              />
            </div>

            {/* Sous-catégories */}
            {isOpen && root.children.map((child) => {
              const childCount = counts[child.id] ?? 0;
              const childSelected = activeCategory === child.id;
              return (
                <div key={child.id} className="ml-5 flex items-center gap-1">
                  <span className="w-5 shrink-0 text-border-subtle">└</span>
                  <TreeItem
                    active={childSelected}
                    color={child.color}
                    onClick={() => onSelect(childSelected ? null : child.id)}
                    label={child.name}
                    count={childCount}
                    dot
                    small
                    className="flex-1"
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function TreeItem({
  active,
  color,
  onClick,
  label,
  count,
  icon,
  dot,
  small,
  className,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
  dot?: boolean;
  small?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active && color ? { backgroundColor: `${color}1f`, color } : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
        small ? 'text-xs' : 'text-sm font-medium',
        active
          ? color
            ? ''
            : 'bg-accent-soft text-text'
          : 'text-text-secondary hover:bg-surface-2 hover:text-text',
        className,
      )}
    >
      {icon}
      {dot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: active ? color : (color ?? '#7C3AED') }}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      <span className={cn('shrink-0 tabular-nums', active ? 'opacity-80' : 'text-text-muted opacity-70')}>
        {count}
      </span>
    </button>
  );
}
