// classify-reel — classe un réel par IA puis met à jour sa catégorie. Envoie un push.
// Body: { reel_id: string }
// Utilise les clés Gemini de l'utilisateur (rotation sur quota), avec repli sur GEMINI_API_KEY.
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { classifyWithKey, UNSORTED_CATEGORY } from '../_shared/classify.ts';
import { getApiKeys, runWithRotation } from '../_shared/keys.ts';
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

    const input = {
      title: reel.title,
      caption: reel.caption,
      author_username: reel.author_username,
      author_name: reel.author_name,
      existingCategories,
    };

    // Rotation sur les clés Gemini de l'utilisateur (+ repli env).
    const keys = await getApiKeys(supabase, reel.user_id, 'gemini');
    const category =
      (await runWithRotation(supabase, keys, (key) => classifyWithKey(input, key))) ??
      UNSORTED_CATEGORY;

    const categoryId = await findOrCreateCategory(supabase, reel.user_id, category);

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
        body: `Un réel a été classé dans « ${category} ».`,
        data: { reel_id },
      }),
    }).catch(() => {});

    const isNew = !existingCategories.some((c) => c.toLowerCase() === category.toLowerCase());
    return json({ ok: true, category, isNew, categoryId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
