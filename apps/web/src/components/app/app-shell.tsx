'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { NavLinks } from '@/components/app/nav-links';
import { UserMenu } from '@/components/app/user-menu';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { CommandMenu } from '@/components/app/command-menu';
import { Button } from '@/components/ui/button';
import { AddReelDialog } from '@/components/library/add-reel-dialog';
import { Plus } from 'lucide-react';
import { STRINGS } from '@reelvault/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function AppShell({
  email,
  displayName,
  children,
}: {
  email: string;
  displayName: string | null;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const quickAdd = (
    <AddReelDialog
      trigger={
        <Button className="w-full justify-start">
          <Plus />
          {STRINGS.nav.add}
        </Button>
      }
    />
  );

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Logo />
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div onClick={() => setDrawerOpen(false)}>{quickAdd}</div>
                <NavLinks onNavigate={() => setDrawerOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/home" className="shrink-0">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <CommandMenu />
            <ThemeToggle />
            <UserMenu email={email} displayName={displayName} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Sidebar desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-4 border-r border-border-subtle p-4 lg:flex">
          {quickAdd}
          <NavLinks />
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
