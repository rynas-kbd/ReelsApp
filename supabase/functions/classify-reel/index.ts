// classify-reel — classe un réel par IA puis met à jour sa catégorie. Envoie un push.
// Body: { reel_id: string }
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { classifyReel } from '../_shared/classify.ts';
import { findOrCreateCategory } from '../_shared/reel.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { reel_id } = await req.json();
    if (!reel_id) return json({ error: 'reel_id requis' }, 400);

    const supabase = adminClient();
    const { data: reel, error } = await supabase
      .from('reels')
      .select('id, user_id, title, caption, author_username, author_name')
      .eq('id', reel_id)
      .single();
    if (error || !reel) return json({ error: 'réel introuvable' }, 404);

    const { data: cats } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', reel.user_id);
    const existingCategories = (cats ?? []).map((c) => c.name as string);

    const result = await classifyReel({
      title: reel.title,
      caption: reel.caption,
      author_username: reel.author_username,
      author_name: reel.author_name,
      existingCategories,
    });

    const categoryId = await findOrCreateCategory(supabase, reel.user_id, result.category);

    await supabase
      .from('reels')
      .update({ category_id: categoryId, status: 'classified' })
      .eq('id', reel_id);

    // Notification push (best-effort, ne bloque pas la réponse).
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    fetch(`${supabaseUrl}/functions/v1/push-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_id: reel.user_id,
        title: 'Nouveau réel sauvegardé 🎬',
        body: `Un réel a été classé dans « ${result.category} ».`,
        data: { reel_id },
      }),
    }).catch(() => {});

    return json({ ok: true, category: result.category, isNew: result.isNew, categoryId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
