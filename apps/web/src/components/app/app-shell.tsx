'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { STRINGS } from '@reelvault/shared';
import { Logo } from '@/components/brand/logo';
import { NavLinks } from '@/components/app/nav-links';
import { UserMenu } from '@/components/app/user-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AppShell({
  email,
  displayName,
  children,
}: {
  email: string;
  displayName: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  function submitQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = quickSearch.trim();
    router.push(q ? `/library?q=${encodeURIComponent(q)}` : '/library');
  }

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu />
          </Button>

          <Link href="/library" className="shrink-0">
            <Logo />
          </Link>

          <form onSubmit={submitQuickSearch} className="ml-auto hidden max-w-sm flex-1 md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder={STRINGS.library.searchPlaceholder}
                className="pl-9"
              />
            </div>
          </form>

          <div className="ml-auto md:ml-0">
            <UserMenu email={email} displayName={displayName} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Sidebar desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border-subtle p-4 lg:block">
          <NavLinks />
        </aside>

        {/* Drawer mobile */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.aside
                className="fixed left-0 top-0 z-50 h-full w-72 border-r border-border-subtle bg-surface p-4 lg:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-6 px-1">
                  <Logo />
                </div>
                <NavLinks onNavigate={() => setDrawerOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
