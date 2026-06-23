/**
 * OAuth Instagram (Instagram API with Instagram Login)
 * Porté depuis le projet de référence Instagram-automation.
 *
 * Variables d'environnement (Vercel) :
 *   META_APP_ID           App ID Meta
 *   META_APP_SECRET       App Secret Meta
 *   NEXT_PUBLIC_SITE_URL  Origine publique stable (ex: https://reels-web-app.vercel.app)
 */

const GRAPH_API_VERSION = 'v21.0';

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
].join(',');

/** Origine publique (prod stable si NEXT_PUBLIC_SITE_URL, sinon origine de la requête). */
export function siteOrigin(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? new URL(request.url).origin
  );
}

/** URI de redirection OAuth (sur le domaine de l'app, comme InstaFlow). */
export function redirectUri(request: Request): string {
  return `${siteOrigin(request)}/api/instagram/callback`;
}

/** URL d'autorisation Instagram. */
export function getLoginUrl(request: Request, state: string): string {
  const params = new URLSearchParams({
    force_reauth: 'true',
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri(request),
    scope: SCOPES,
    response_type: 'code',
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/**
 * Échange le code contre un token court.
 * Retourne aussi le user_id fourni par Instagram — source autoritaire de l'ID du compte.
 */
export async function exchangeCodeForToken(
  request: Request,
  code: string,
): Promise<{ accessToken: string; userId: string | null }> {
  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(request),
      code,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error_type || data.error) {
    throw new Error(
      `Token exchange failed: ${data.error_message ?? data.error?.message ?? 'inconnu'}`,
    );
  }
  return {
    accessToken: data.access_token as string,
    userId: data.user_id != null ? String(data.user_id) : null,
  };
}

/**
 * Échange le token court contre un token long (~60 j) via ig_exchange_token.
 * Endpoint : graph.instagram.com/access_token (sans /oauth/).
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.META_APP_SECRET!,
    access_token: shortLivedToken,
  });
  try {
    const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      console.warn('[IG] échange long-lived échoué, repli sur token court:', data.error?.message);
      return { accessToken: shortLivedToken, expiresIn: 5184000 };
    }
    return { accessToken: data.access_token as string, expiresIn: data.expires_in as number };
  } catch {
    return { accessToken: shortLivedToken, expiresIn: 5184000 };
  }
}

export interface InstagramUser {
  id: string;
  user_id?: string;
  name?: string;
  username: string;
  profile_picture_url?: string;
}

/**
 * Récupère les infos du compte via graph.instagram.com/me (sans version).
 * Non bloquant : si ça échoue, on renvoie null et la connexion continue.
 */
export async function getInstagramUserInfo(token: string): Promise<InstagramUser | null> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/me?fields=id,user_id,name,username,profile_picture_url&access_token=${token}`,
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error(
        '[IG] /me a échoué (enrichissement ignoré):',
        JSON.stringify({ httpStatus: res.status, error: data.error ?? data, tokenPrefix: token?.slice(0, 10) }),
      );
      return null;
    }
    return data as InstagramUser;
  } catch (err) {
    console.error('[IG] /me exception (enrichissement ignoré):', err);
    return null;
  }
}

/** Abonne le compte aux webhooks (messages) — requis pour la capture des réels partagés en DM. */
export async function subscribeToWebhooks(igUserId: string, accessToken: string): Promise<void> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/${GRAPH_API_VERSION}/${igUserId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages',
          access_token: accessToken,
        }),
      },
    );
    const data = await res.json();
    if (!data.success) {
      console.warn('[IG] subscription webhook échouée:', data);
    } else {
      console.log('[IG] webhook souscrit pour le compte', igUserId);
    }
  } catch (err) {
    console.error('[IG] subscription webhook erreur:', err);
  }
}