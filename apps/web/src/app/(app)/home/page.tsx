import { fetchProfile } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/server';
import { HomeView } from '@/components/home/home-view';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let displayName: string | null = null;
  if (user) {
    try {
      const profile = await fetchProfile(supabase, user.id);
      displayName = profile?.display_name ?? null;
    } catch {
      /* ignore */
    }
  }
  return <HomeView displayName={displayName} />;
}
