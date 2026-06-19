import { redirect } from 'next/navigation';
import { fetchProfile } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let displayName: string | null = null;
  try {
    const profile = await fetchProfile(supabase, user.id);
    displayName = profile?.display_name ?? null;
  } catch {
    displayName = null;
  }

  return (
    <AppShell email={user.email ?? ''} displayName={displayName}>
      {children}
    </AppShell>
  );
}
