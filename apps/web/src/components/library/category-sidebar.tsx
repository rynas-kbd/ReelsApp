'use client';

import { Layers } from 'lucide-react';
import { STRINGS, type Category } from '@reelvault/shared';
import { CategoryIcon } from '@/components/category-icon';
import { cn } from '@/lib/utils';

export function CategorySidebar({
  categories,
  counts,
  activeCategory,
  total,
  onSelect,
}: {
  categories: Category[];
  counts: Record<string, number>;
  activeCategory: string | null;
  total: number;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          activeCategory === null
            ? 'bg-accent-soft text-text'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text',
        )}
      >
        <Layers className="h-4 w-4 text-text-muted" />
        <span className="flex-1 text-left">{STRINGS.library.allCategories}</span>
        <span className="text-xs text-text-muted">{total}</span>
      </button>

      {categories.map((cat) => {
        const active = activeCategory === cat.id;
        const count = counts[cat.id] ?? 0;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            style={
              active
                ? { backgroundColor: `${cat.color}1f`, color: cat.color }
                : undefined
            }
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              !active && 'text-text-secondary hover:bg-surface-2 hover:text-text',
            )}
          >
            <span
              className="flex h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <CategoryIcon
              icon={cat.icon}
              className={cn('h-4 w-4', !active && 'text-text-muted')}
            />
            <span className="flex-1 truncate text-left">{cat.name}</span>
            <span className={cn('text-xs', !active && 'text-text-muted')}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
