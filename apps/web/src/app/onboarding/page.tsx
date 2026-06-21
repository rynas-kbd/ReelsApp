import { redirect } from 'next/navigation';
import { fetchConnection, fetchProfile } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profile, connection] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchConnection(supabase),
  ]);

  if (profile?.onboarded) redirect('/dashboard');

  const { ig } = await searchParams;

  return (
    <OnboardingWizard
      userId={user.id}
      igConnected={connection?.status === 'active'}
      igUsername={connection?.ig_username ?? null}
      igResult={ig ?? null}
    />
  );
}
