// enrich-reel — récupère miniature/titre/légende/auteur/type d'un réel et met à jour la ligne.
// Body: { reel_id: string }
// Utilise les clés RapidAPI de l'utilisateur (rotation sur quota), avec repli sur RAPIDAPI_KEY.
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { fetchReelMetadata, PLACEHOLDER_THUMB, type ReelMetadata } from '../_shared/enrich.ts';
import { getApiKeys, runWithRotation } from '../_shared/keys.ts';
import { extractShortcode } from '../_shared/reel.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { reel_id } = await req.json();
    if (!reel_id) return json({ error: 'reel_id requis' }, 400);

    const supabase = adminClient();
    const { data: reel, error } = await supabase
      .from('reels')
      .select('id, user_id, ig_url, shortcode')
      .eq('id', reel_id)
      .single();
    if (error || !reel) return json({ error: 'réel introuvable' }, 404);

    const shortcode = reel.shortcode ?? extractShortcode(reel.ig_url);
    if (!shortcode) return json({ error: 'shortcode introuvable' }, 422);

    // Rotation sur les clés RapidAPI de l'utilisateur (+ repli env).
    const keys = await getApiKeys(supabase, reel.user_id, 'rapidapi');
    const meta: ReelMetadata | null = await runWithRotation(supabase, keys, (key) =>
      fetchReelMetadata(shortcode, supabase, key),
    );

    if (!meta) {
      // Aucune clé n'a fonctionné : on garde au moins le shortcode + placeholder.
      await supabase
        .from('reels')
        .update({ shortcode, thumbnail_url: PLACEHOLDER_THUMB, status: 'enriched' })
        .eq('id', reel_id);
      return json({ ok: true, meta: null, note: 'aucune clé RapidAPI disponible' });
    }

    await supabase
      .from('reels')
      .update({
        shortcode,
        thumbnail_url: meta.thumbnail_url,
        title: meta.title,
        caption: meta.caption,
        author_username: meta.author_username,
        author_name: meta.author_name,
        media_type: meta.media_type,
        raw_metadata: meta.raw,
        status: 'enriched',
      })
      .eq('id', reel_id);

    return json({ ok: true, meta });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
