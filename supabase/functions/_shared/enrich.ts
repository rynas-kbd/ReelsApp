// Récupère les métadonnées d'un réel via RapidAPI (instagram120) et réhéberge la miniature.
// `fetchReelMetadata` fait UN appel avec UNE clé RapidAPI et signale les quotas (429)
// pour permettre la rotation côté appelant (voir _shared/keys.ts).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { Attempt } from './keys.ts';
import { reelUrl } from './reel.ts';

export interface ReelMetadata {
  thumbnail_url: string | null;
  title: string | null;
  author_username: string | null;
  author_name: string | null;
  raw: Record<string, unknown> | null;
}

export const PLACEHOLDER_THUMB = 'https://placehold.co/640x800/16161D/7C3AED/png?text=Reel';
const THUMBNAILS_BUCKET = 'thumbnails';

/**
 * Métadonnées d'un réel via RapidAPI instagram120 (endpoint `/api/instagram/links`).
 * La miniature CDN d'Instagram expire : on la télécharge et on la réhéberge dans le
 * bucket public `thumbnails` pour une URL durable.
 */
export async function fetchReelMetadata(
  shortcode: string,
  supabase: SupabaseClient,
  apiKey: string,
): Promise<Attempt<ReelMetadata>> {
  const url = reelUrl(shortcode);
  const host = Deno.env.get('RAPIDAPI_HOST') ?? 'instagram120.p.rapidapi.com';

  try {
    const res = await fetch(`https://${host}/api/instagram/links`, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, quota: res.status === 429, error: `HTTP ${res.status} ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return { ok: false, error: 'réponse vide' };

    const meta = (item.meta ?? {}) as Record<string, unknown>;
    const pictureUrl = (item.pictureUrl as string) ?? null;
    const username = (meta.username as string) ?? null;
    const stored = await storeThumbnail(supabase, shortcode, pictureUrl);

    return {
      ok: true,
      value: {
        thumbnail_url: stored ?? pictureUrl ?? PLACEHOLDER_THUMB,
        title: (meta.title as string) ?? null,
        author_username: username,
        author_name: username,
        raw: {
          likeCount: meta.likeCount ?? null,
          commentCount: meta.commentCount ?? null,
          takenAt: meta.takenAt ?? null,
          videoUrl: (item.urls as Array<{ url?: string }>)?.[0]?.url ?? null,
        },
      },
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Télécharge l'image Instagram et la réhéberge dans le bucket public, renvoie l'URL durable. */
async function storeThumbnail(
  supabase: SupabaseClient,
  shortcode: string,
  pictureUrl: string | null,
): Promise<string | null> {
  if (!pictureUrl) return null;
  try {
    const img = await fetch(pictureUrl);
    if (!img.ok) return null;
    const bytes = new Uint8Array(await img.arrayBuffer());
    const path = `${shortcode}.jpg`;

    const { error } = await supabase.storage
      .from(THUMBNAILS_BUCKET)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;

    const { data } = supabase.storage.from(THUMBNAILS_BUCKET).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch (_e) {
    return null;
  }
}
