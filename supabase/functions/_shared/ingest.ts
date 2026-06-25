// Module d'ingestion partagé — capture un attachment Instagram (réel ou post photo/carrousel)
// et crée la ligne dans `reels`. Utilisé par meta-webhook (live) et backfill-shares (replay).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { extractShortcode, reelUrl } from './reel.ts';
import { rehostImage, PLACEHOLDER_THUMB } from './enrich.ts';

export interface IgAttachment {
  type?: string;
  payload?: {
    url?: string;
    title?: string;
    reel_video_id?: string;
    ig_post_media_id?: string;
  };
}

export interface IngestResult {
  reelId: string;
  /** 'reel' = enrich+classify ; 'image' = classify seulement */
  kind: 'reel' | 'image';
}

/**
 * Ingère un attachment Instagram dans la table `reels`.
 * Gère deux chemins :
 *   • réel vidéo  (`ig_reel` / lien instagram.com/reel/) → shortcode → insert + enrich + classify
 *   • post photo  (`ig_post`)                            → media_id   → insert + classify seul
 *
 * Dédoublonnage :
 *   • Réels : index unique (user_id, shortcode) — INSERT échoue silencieusement si doublon.
 *   • Posts image : lookup explicite sur raw_metadata->>'media_id'.
 *
 * Renvoie null si rien n'a été inséré (doublon, type inconnu, payload vide).
 */
export async function ingestSharedAttachment(
  supabase: SupabaseClient,
  userId: string,
  att: IgAttachment,
): Promise<IngestResult | null> {
  const type = att.type;
  const payload = att.payload;
  if (!payload) return null;

  // ── Chemin 1 : réel / lien IG propre ──────────────────────────────────────
  const url = payload.url ?? '';
  const shortcode = extractShortcode(url);
  if (shortcode) {
    const { data, error } = await supabase
      .from('reels')
      .insert({
        user_id: userId,
        ig_url: reelUrl(shortcode),
        shortcode,
        source: 'webhook',
        status: 'pending',
      })
      .select('id')
      .single();

    // Doublon (unique constraint) → on ignore proprement.
    if (error || !data) return null;
    return { reelId: data.id as string, kind: 'reel' };
  }

  // ── Chemin 2 : post photo / carrousel (`ig_post`) ─────────────────────────
  if (type === 'ig_post' && payload.ig_post_media_id && url) {
    const mediaId = payload.ig_post_media_id;

    // Dédoublonnage explicite par media_id (shortcode = null → unique index inefficace).
    const { data: existing } = await supabase
      .from('reels')
      .select('id')
      .eq('user_id', userId)
      .filter('raw_metadata->>media_id', 'eq', mediaId)
      .maybeSingle();
    if (existing) return null;

    // Ré-héberger la couverture (signature peut expirer sur d'anciens events).
    const thumbnail_url = (await rehostImage(supabase, mediaId, url)) ?? PLACEHOLDER_THUMB;

    // Légende : première ligne comme titre, légende complète.
    const fullCaption = payload.title ?? null;
    const title = fullCaption
      ? fullCaption.split('\n')[0].slice(0, 80) || null
      : null;

    const { data, error } = await supabase
      .from('reels')
      .insert({
        user_id: userId,
        ig_url: null,     // pas d'URL instagram.com exploitable pour un ig_post
        shortcode: null,
        source: 'webhook',
        status: 'pending',
        media_type: 'image',
        title,
        caption: fullCaption,
        thumbnail_url,
        raw_metadata: { media_id: mediaId, source: 'ig_post' },
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return { reelId: data.id as string, kind: 'image' };
  }

  return null;
}

/**
 * Lance le pipeline asynchrone après insertion :
 *   kind 'reel'  → enrich-reel (RapidAPI) PUIS classify-reel (Gemini)
 *   kind 'image' → classify-reel seulement (thumbnail déjà en place, pas de shortcode pour RapidAPI)
 */
export async function orchestrate(
  reelId: string,
  kind: 'reel' | 'image',
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
  };
  const body = JSON.stringify({ reel_id: reelId });

  if (kind === 'reel') {
    await fetch(`${supabaseUrl}/functions/v1/enrich-reel`, {
      method: 'POST', headers, body,
    }).catch(() => {});
  }

  await fetch(`${supabaseUrl}/functions/v1/classify-reel`, {
    method: 'POST', headers, body,
  }).catch(() => {});
}
