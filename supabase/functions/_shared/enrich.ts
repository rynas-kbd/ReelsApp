// Récupère les métadonnées d'un réel via l'oEmbed officiel de Meta, avec fallback.
import { reelUrl } from './reel.ts';

export interface ReelMetadata {
  thumbnail_url: string | null;
  title: string | null;
  author_username: string | null;
  author_name: string | null;
  raw: Record<string, unknown> | null;
}

const GRAPH_VERSION = 'v19.0';
const PLACEHOLDER = 'https://placehold.co/640x800/16161D/7C3AED/png?text=Reel';

/**
 * oEmbed Instagram via Graph API.
 *
 * Identifiants DÉDIÉS à l'app oEmbed Read (séparée de l'app messaging/webhook) :
 *   - META_OEMBED_APP_ID        (obligatoire)
 *   - META_OEMBED_CLIENT_TOKEN  (recommandé pour oEmbed Read)  → token = `${appId}|${clientToken}`
 *   - META_OEMBED_APP_SECRET    (alternative au client token)  → token = `${appId}|${appSecret}`
 *
 * À défaut, on retombe sur l'app principale (META_APP_ID / META_APP_SECRET).
 * L'app doit avoir la fonctionnalité « oEmbed Read » activée (validée par Meta).
 */
export async function fetchReelMetadata(shortcode: string): Promise<ReelMetadata> {
  const url = reelUrl(shortcode);
  const appId = Deno.env.get('META_OEMBED_APP_ID') ?? Deno.env.get('META_APP_ID');
  const clientToken = Deno.env.get('META_OEMBED_CLIENT_TOKEN');
  const appSecret = Deno.env.get('META_OEMBED_APP_SECRET') ?? Deno.env.get('META_APP_SECRET');
  const secretPart = clientToken ?? appSecret;

  const fallback: ReelMetadata = {
    thumbnail_url: PLACEHOLDER,
    title: null,
    author_username: null,
    author_name: null,
    raw: null,
  };

  if (!appId || !secretPart) return fallback;

  try {
    const accessToken = `${appId}|${secretPart}`;
    const endpoint =
      `https://graph.facebook.com/${GRAPH_VERSION}/instagram_oembed` +
      `?url=${encodeURIComponent(url)}&omitscript=true&access_token=${accessToken}`;

    const res = await fetch(endpoint);
    if (!res.ok) return fallback;
    const data = await res.json() as Record<string, unknown>;

    return {
      thumbnail_url: (data.thumbnail_url as string) ?? PLACEHOLDER,
      title: (data.title as string) ?? null,
      author_username: (data.author_name as string) ?? null,
      author_name: (data.author_name as string) ?? null,
      raw: data,
    };
  } catch (_e) {
    return fallback;
  }
}
