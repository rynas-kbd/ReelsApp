// add-reel — ajout manuel par lien ou partage Android (authentifié via JWT user).
// Body: { url: string, source?: 'manual' | 'share' }
import { userClient, adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { extractShortcode, reelUrl } from '../_shared/reel.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'méthode non autorisée' }, 405);

  try {
    const supabase = userClient(req);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: 'non authentifié' }, 401);

    const { url, source = 'manual' } = await req.json();
    const shortcode = extractShortcode(url ?? '');
    if (!shortcode) return json({ error: 'Lien Instagram invalide' }, 422);

    // Insère (RLS garantit user_id = auth.uid()).
    const { data: reel, error } = await supabase
      .from('reels')
      .insert({
        user_id: user.id,
        ig_url: reelUrl(shortcode),
        shortcode,
        source,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      // 23505 = doublon (unique user_id, shortcode)
      if ((error as { code?: string }).code === '23505') {
        return json({ error: 'duplicate', message: 'Ce réel est déjà dans ta bibliothèque.' }, 409);
      }
      throw error;
    }

    // Enrichissement + classification en chaîne (via service role, en arrière-plan).
    await orchestrate(reel.id);

    return json({ ok: true, reel_id: reel.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function orchestrate(reelId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
  };
  try {
    await fetch(`${supabaseUrl}/functions/v1/enrich-reel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reel_id: reelId }),
    });
    await fetch(`${supabaseUrl}/functions/v1/classify-reel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reel_id: reelId }),
    });
  } catch (_e) {
    // best-effort : le réel reste en 'pending' et pourra être rejoué.
    void adminClient; // garde l'import utilisé si l'orchestration évolue
  }
}
