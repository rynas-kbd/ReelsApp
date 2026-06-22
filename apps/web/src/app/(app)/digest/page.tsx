import { fetchDigests, fetchLatestDigest } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/server';
import { DigestView } from '@/components/digest/digest-view';

export default async function DigestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [latest, history] = await Promise.all([
    fetchLatestDigest(supabase).catch(() => null),
    fetchDigests(supabase).catch(() => []),
  ]);

  return <DigestView latest={latest} history={history} />;
}
