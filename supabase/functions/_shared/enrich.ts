// Récupère les métadonnées d'un réel via RapidAPI (instagram120) et réhéberge la miniature.
// `fetchReelMetadata` fait UN appel avec UNE clé RapidAPI et signale les quotas (429)
// pour permettre la rotation côté appelant (voir _shared/keys.ts).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { Attempt } from './keys.ts';
import { reelUrl } from './reel.ts';

export interface ReelMetadata {
  thumbnail_url: string | null;
  title: string | null;
  caption: string | null;         // légende complète (incluant les hashtags)
  author_username: string | null;
  author_name: string | null;
  media_type: 'video' | 'image';  // type détecté depuis la présence d'une URL vidéo
  image_urls: string[];           // URLs des images (post photo ou carrousel)
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
  const host = Deno.env.get('RAPIDAPI_HOST') ?? 'instagram-media-api.p.rapidapi.com';

  const isMediaApi = host.includes('instagram-media-api');
  const isFlashApi = host.includes('flashapi');
  const isStableScraper = host.includes('instagram-scraper-stable-api');

  let method = 'POST';
  let endpoint = `https://${host}/api/instagram/links`;
  const headers: Record<string, string> = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': host,
  };
  let body: string | undefined = undefined;

  if (isMediaApi) {
    method = 'POST';
    endpoint = `https://${host}/user/post`;
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ url, shortcode, limit: 1 });
  } else if (isFlashApi) {
    method = 'GET';
    endpoint = `https://${host}/ig/post_info/?shortcode=${shortcode}&url=${encodeURIComponent(url)}&nocors=false`;
    headers['Content-Type'] = 'application/json';
  } else if (isStableScraper) {
    method = 'POST';
    endpoint = `https://${host}/get_ig_post_details.php`;
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams({
      shortcode_or_url: url,
      url: url,
      shortcode: shortcode,
    }).toString();
  } else {
    method = 'POST';
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ url });
  }

  try {
    const res = await fetch(endpoint, {
      method,
      headers,
      body,
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      return { ok: false, quota: res.status === 429, error: `HTTP ${res.status} ${bodyText.slice(0, 200)}` };
    }

    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return { ok: false, error: 'réponse vide' };

    const meta = (item.meta ?? item.owner ?? item.user ?? item) as Record<string, unknown>;
    const pictureUrl =
      (item.pictureUrl as string) ??
      (item.thumbnail_url as string) ??
      (item.display_url as string) ??
      (item.cover_url as string) ??
      (item.image_versions2?.candidates?.[0]?.url as string) ??
      null;

    const username =
      (meta.username as string) ??
      (item.author_username as string) ??
      (item.username as string) ??
      null;

    const rawCaption =
      (meta.caption as string) ??
      (meta.text as string) ??
      (meta.description as string) ??
      (meta.title as string) ??
      (item.caption?.text as string) ??
      (item.caption as string) ??
      null;

    const videoUrl =
      (item.urls as Array<{ url?: string }>)?.[0]?.url ??
      (item.video_url as string) ??
      (item.video_versions?.[0]?.url as string) ??
      null;

    const media_type: 'video' | 'image' = videoUrl ? 'video' : 'image';

    const imageUrls: string[] = [];
    if (Array.isArray(item.images)) {
      for (const img of item.images as Array<unknown>) {
        const u = typeof img === 'string' ? img : (img as Record<string, unknown>)?.url as string;
        if (u) imageUrls.push(u);
      }
    }
    if (imageUrls.length === 0 && pictureUrl) imageUrls.push(pictureUrl);

    const stored = await storeThumbnail(supabase, shortcode, pictureUrl);

    return {
      ok: true,
      value: {
        thumbnail_url: stored ?? pictureUrl ?? PLACEHOLDER_THUMB,
        title: (meta.title as string) ?? (rawCaption ? rawCaption.split('\n')[0].slice(0, 80) : null),
        caption: rawCaption,
        author_username: username,
        author_name: (meta.full_name as string) ?? username,
        media_type,
        image_urls: imageUrls,
        raw: {
          likeCount: meta.likeCount ?? item.like_count ?? null,
          commentCount: meta.commentCount ?? item.comment_count ?? null,
          takenAt: meta.takenAt ?? item.taken_at ?? null,
          videoUrl,
        },
      },
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Télécharge une image distante et la réhéberge dans le bucket public `thumbnails`.
 * @param key  Nom de fichier sans extension (ex : shortcode ou media_id).
 * @param srcUrl  URL source de l'image à télécharger.
 * @returns URL publique durable, ou null en cas d'échec.
 */
export async function rehostImage(
  supabase: SupabaseClient,
  key: string,
  srcUrl: string,
): Promise<string | null> {
  try {
    const img = await fetch(srcUrl);
    if (!img.ok) return null;
    const bytes = new Uint8Array(await img.arrayBuffer());
    const path = `${key}.jpg`;

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

/** Télécharge l'image Instagram et la réhéberge dans le bucket public, renvoie l'URL durable. */
async function storeThumbnail(
  supabase: SupabaseClient,
  shortcode: string,
  pictureUrl: string | null,
): Promise<string | null> {
  if (!pictureUrl) return null;
  return rehostImage(supabase, shortcode, pictureUrl);
}
