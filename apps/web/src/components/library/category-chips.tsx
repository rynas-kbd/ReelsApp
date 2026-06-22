'use client';

import { STRINGS, type Category } from '@reelvault/shared';
import { cn } from '@/lib/utils';

/** Barre horizontale de filtres catégories (multicolores), scrollable sur mobile. */
export function CategoryChips({
  categories,
  counts,
  total,
  activeCategory,
  onSelect,
}: {
  categories: Category[];
  counts: Record<string, number>;
  total: number;
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip active={activeCategory === null} onClick={() => onSelect(null)}>
        {STRINGS.library.allCategories}
        <Count>{total}</Count>
      </Chip>
      {categories.map((cat) => {
        const active = activeCategory === cat.id;
        return (
          <Chip
            key={cat.id}
            active={active}
            color={cat.color}
            onClick={() => onSelect(active ? null : cat.id)}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
            <Count>{counts[cat.id] ?? 0}</Count>
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active && color ? { backgroundColor: `${color}1f`, color, borderColor: `${color}55` } : undefined}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? color
            ? ''
            : 'border-transparent bg-text text-bg'
          : 'border-border-subtle bg-surface text-text-secondary hover:bg-surface-2 hover:text-text',
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="text-xs opacity-70">{children}</span>;
}
