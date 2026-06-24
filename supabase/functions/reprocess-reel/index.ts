// reprocess-reel — re-enrichit + re-classe un réel existant (backfill + correction manuelle).
// Body: { reel_id: string }
// Orchestre enrich-reel → classify-reel (même pipeline que meta-webhook pour les nouveaux réels).
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { reel_id } = await req.json();
    if (!reel_id) return json({ error: 'reel_id requis' }, 400);

    const supabase = adminClient();
    // Vérifier l'existence du réel
    const { data: reel } = await supabase
      .from('reels')
      .select('id')
      .eq('id', reel_id)
      .single();
    if (!reel) return json({ error: 'réel introuvable' }, 404);

    // Remettre en 'pending' pour signaler qu'un retraitement est en cours
    await supabase
      .from('reels')
      .update({ status: 'pending', transcript: null })
      .eq('id', reel_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    };

    // enrich → classify (séquentiels : classify lit le résultat d'enrich)
    await fetch(`${supabaseUrl}/functions/v1/enrich-reel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reel_id }),
    });
    await fetch(`${supabaseUrl}/functions/v1/classify-reel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reel_id }),
    });

    return json({ ok: true, reel_id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
