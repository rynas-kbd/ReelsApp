// enrich-reel — récupère miniature/titre/auteur d'un réel et met à jour la ligne.
// Body: { reel_id: string }
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { fetchReelMetadata } from '../_shared/enrich.ts';
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
      .select('id, ig_url, shortcode')
      .eq('id', reel_id)
      .single();
    if (error || !reel) return json({ error: 'réel introuvable' }, 404);

    const shortcode = reel.shortcode ?? extractShortcode(reel.ig_url);
    if (!shortcode) return json({ error: 'shortcode introuvable' }, 422);

    const meta = await fetchReelMetadata(shortcode);

    await supabase
      .from('reels')
      .update({
        shortcode,
        thumbnail_url: meta.thumbnail_url,
        title: meta.title,
        author_username: meta.author_username,
        author_name: meta.author_name,
        raw_metadata: meta.raw,
        status: 'enriched',
      })
      .eq('id', reel_id);

    return json({ ok: true, meta });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
