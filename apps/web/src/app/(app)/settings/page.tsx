import { redirect } from 'next/navigation';
import { STRINGS } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/server';
import { SettingsView } from '@/components/settings/settings-view';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {STRINGS.settings.title}
      </h1>
      <SettingsView userId={user.id} />
    </div>
  );
}
