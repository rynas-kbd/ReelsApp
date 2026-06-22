'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, FolderTree, Home, Library, Plus, Search, Settings } from 'lucide-react';
import { STRINGS, fetchCategories, type Category } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

const NAV = [
  { href: '/home', label: STRINGS.nav.home, icon: Home },
  { href: '/library', label: STRINGS.nav.library, icon: Library },
  { href: '/stats', label: STRINGS.nav.stats, icon: BarChart3 },
  { href: '/categories', label: STRINGS.nav.categories, icon: FolderTree },
  { href: '/settings', label: STRINGS.nav.settings, icon: Settings },
];

/** Recherche / navigation globale (⌘K). Rend son propre déclencheur + le dialog. */
export function CommandMenu() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Raccourci clavier ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Catégories chargées à la première ouverture
  useEffect(() => {
    if (!open || categories.length) return;
    fetchCategories(supabase).then(setCategories).catch(() => {});
  }, [open, categories.length, supabase]);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-2 px-3 text-sm text-text-muted transition-colors hover:bg-surface-3 md:w-64 md:justify-start"
        aria-label={STRINGS.nav.search}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 text-left md:inline">{STRINGS.nav.search}</span>
        <kbd className="hidden rounded border border-border-subtle bg-bg px-1.5 py-0.5 text-[10px] font-medium text-text-muted md:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={STRINGS.library.searchPlaceholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>

          {query.trim() && (
            <CommandGroup heading="Recherche">
              <CommandItem
                value={`__search__ ${query}`}
                onSelect={() => go(`/library?q=${encodeURIComponent(query.trim())}`)}
              >
                <Search />
                Rechercher « {query.trim()} » dans la bibliothèque
              </CommandItem>
            </CommandGroup>
          )}

          <CommandGroup heading="Aller à">
            {NAV.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={label} onSelect={() => go(href)}>
                <Icon />
                {label}
              </CommandItem>
            ))}
            <CommandItem value="Ajouter un réel" onSelect={() => go('/library?add=1')}>
              <Plus />
              {STRINGS.nav.add}
            </CommandItem>
          </CommandGroup>

          {categories.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={STRINGS.nav.categories}>
                {categories.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={`cat ${cat.name}`}
                    onSelect={() => go(`/library?category=${cat.id}`)}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
