'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, BarChart3, Sparkles, FolderTree, Settings, type LucideIcon } from 'lucide-react';
import { STRINGS } from '@reelvault/shared';
import { cn } from '@/lib/utils';

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/home', label: STRINGS.nav.home, icon: Home },
  { href: '/library', label: STRINGS.nav.library, icon: Library },
  { href: '/stats', label: STRINGS.nav.stats, icon: BarChart3 },
  { href: '/digest', label: STRINGS.nav.digest, icon: Sparkles },
  { href: '/categories', label: STRINGS.nav.categories, icon: FolderTree },
  { href: '/settings', label: STRINGS.nav.settings, icon: Settings },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-smooth',
              active
                ? 'bg-accent-soft text-accent'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text',
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
