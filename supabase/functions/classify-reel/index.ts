// classify-reel — classe un réel par IA puis met à jour sa catégorie + tags + résumé + embedding.
// Body: { reel_id: string }
// Pipeline :
//   1. Chargement du réel (title, caption, media_type, thumbnail_url, transcript, raw_metadata)
//   2. Si vidéo et transcript manquant → transcription Groq Whisper (rotation clés 'groq')
//   3. Classification Gemini multimodal (miniature + transcript/images + légende + arbre catégories)
//   4. Résolution hiérarchique : racine → sous-catégorie → category_id
//   5. Embedding texte (Gemini text-embedding-004) → reels.embedding
//   6. Notification push best-effort
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { classifyWithKey, UNSORTED_CATEGORY, type ClassifyResult } from '../_shared/classify.ts';
import { getApiKeys, runWithRotation } from '../_shared/keys.ts';
import { findOrCreateCategory, fetchCategoryTree } from '../_shared/reel.ts';
import { transcribeWithKey } from '../_shared/transcribe.ts';
import { embedWithKey } from '../_shared/embed.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { reel_id } = await req.json();
    if (!reel_id) return json({ error: 'reel_id requis' }, 400);

    const supabase = adminClient();
    const { data: reel, error } = await supabase
      .from('reels')
      .select('id, user_id, title, caption, author_username, author_name, media_type, thumbnail_url, transcript, raw_metadata')
      .eq('id', reel_id)
      .single();
    if (error || !reel) return json({ error: 'réel introuvable' }, 404);

    // ── 1. Transcription (vidéos sans transcript) ──────────────────────────────
    let transcript = (reel.transcript as string | null) ?? null;
    if (reel.media_type === 'video' && !transcript) {
      const videoUrl = (reel.raw_metadata as Record<string, unknown> | null)?.videoUrl as string | null;
      if (videoUrl) {
        const groqKeys = await getApiKeys(supabase, reel.user_id, 'groq');
        if (groqKeys.length > 0) {
          const result = await runWithRotation(supabase, groqKeys, (key) =>
            transcribeWithKey(videoUrl, key),
          );
          if (result) {
            transcript = result;
            // Stocker le transcript (utile pour reprocess + search_vector)
            await supabase.from('reels').update({ transcript }).eq('id', reel_id);
          }
        }
      }
    }

    // ── 2. Arbre des catégories existantes ────────────────────────────────────
    const categoryTree = await fetchCategoryTree(supabase, reel.user_id);

    // URLs images pour les posts photo
    const imageUrls: string[] = [];
    if (reel.media_type !== 'video' && reel.thumbnail_url) {
      imageUrls.push(reel.thumbnail_url as string);
    }

    const classifyInput = {
      title: reel.title as string | null,
      caption: reel.caption as string | null,
      transcript,
      author_username: reel.author_username as string | null,
      author_name: reel.author_name as string | null,
      media_type: (reel.media_type as 'video' | 'image' | null) ?? null,
      thumbnail_url: reel.thumbnail_url as string | null,
      image_urls: imageUrls,
      categoryTree,
    };

    // ── 3. Classification Gemini multimodale ──────────────────────────────────
    const geminiKeys = await getApiKeys(supabase, reel.user_id, 'gemini');
    const classifyResult: ClassifyResult | null = await runWithRotation(
      supabase,
      geminiKeys,
      (key) => classifyWithKey(classifyInput, key),
    );

    const result = classifyResult ?? {
      category: UNSORTED_CATEGORY,
      subcategory: null,
      tags: [],
      summary: '',
    };

    // ── 4. Résolution hiérarchique des catégories ─────────────────────────────
    const rootId = await findOrCreateCategory(supabase, reel.user_id, result.category, null);
    let categoryId = rootId;
    if (result.subcategory) {
      categoryId = await findOrCreateCategory(supabase, reel.user_id, result.subcategory, rootId);
    }

    // ── 5. Mise à jour catégorie + tags + résumé ──────────────────────────────
    await supabase
      .from('reels')
      .update({
        category_id: categoryId,
        tags: result.tags,
        summary: result.summary || null,
        status: 'classified',
      })
      .eq('id', reel_id);

    // ── 6. Embedding sémantique (best-effort) ─────────────────────────────────
    const textToEmbed = [
      reel.title,
      reel.caption,
      result.summary,
      transcript,
      result.tags.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 3000);

    if (textToEmbed) {
      const embedding = await runWithRotation(supabase, geminiKeys, (key) =>
        embedWithKey(textToEmbed, key),
      );
      if (embedding) {
        await supabase.from('reels').update({ embedding }).eq('id', reel_id);
      }
    }

    // ── 7. Notification push (best-effort) ────────────────────────────────────
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
        body: `Classé dans « ${result.subcategory ?? result.category} ».`,
        data: { reel_id },
      }),
    }).catch(() => {});

    return json({
      ok: true,
      category: result.category,
      subcategory: result.subcategory,
      tags: result.tags,
      summary: result.summary,
      categoryId,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
