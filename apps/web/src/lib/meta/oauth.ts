/**
 * OAuth Instagram (Instagram API with Instagram Login) — version éprouvée
 * portée depuis InstaFlow. Tourne dans les route handlers Next.js (Vercel).
 *
 * Variables d'environnement (Vercel) :
 *   META_APP_ID        App ID de l'app Meta de ReelVault
 *   META_APP_SECRET    App Secret
 *   NEXT_PUBLIC_SITE_URL  (optionnel) origine publique stable
 *
 * Note : Instagram API with Instagram Login (depuis déc. 2023) retourne un token
 * de 60 jours directement depuis api.instagram.com/oauth/access_token.
 * L'échange ig_exchange_token (Basic Display API) ne s'applique plus.
 */

const GRAPH_API_VERSION = 'v21.0';

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
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
 * Échange le code contre un token.
 * Instagram API with Instagram Login retourne un token de ~60 jours directement.
 * On conserve `expiresIn` pour le stocker en base.
 */
export async function exchangeCodeForToken(
  request: Request,
  code: string,
): Promise<{ accessToken: string; userId: string | null; expiresIn: number }> {
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
  console.log('[IG] token exchange OK, expires_in:', data.expires_in, 'user_id:', data.user_id);
  return {
    accessToken: data.access_token as string,
    userId: data.user_id != null ? String(data.user_id) : null,
    // expires_in présent si déjà long-lived (≥86400s = 1 jour) ; sinon 0
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 0,
  };
}

/**
 * Tente d'échanger vers un token long (~60 j) si le token initial est court (< 1 h).
 * Pour Instagram API with Instagram Login, le token est déjà long-lived — on le passe
 * tel quel. L'échange ig_exchange_token ne s'applique qu'à l'ancienne Basic Display API.
 */
export async function exchangeForLongLivedToken(
  token: string,
  initialExpiresIn: number,
): Promise<{ accessToken: string; expiresIn: number }> {
  // Si le token initial dure plus d'un jour, c'est déjà un token long-lived.
  if (initialExpiresIn > 86400) {
    console.log('[IG] token déjà long-lived (' + initialExpiresIn + 's), pas d\'échange nécessaire');
    return { accessToken: token, expiresIn: initialExpiresIn };
  }
  // Fallback : tenter ig_exchange_token (Basic Display API / legacy)
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.META_APP_SECRET!,
    access_token: token,
  });
  try {
    const res = await fetch(`https://graph.instagram.com/oauth/access_token?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      console.warn(
        '[IG] échange long-lived échoué, repli sur token initial:',
        JSON.stringify({ status: res.status, error: data.error ?? data }),
      );
      return { accessToken: token, expiresIn: 5184000 };
    }
    return { accessToken: data.access_token as string, expiresIn: data.expires_in as number };
  } catch {
    return { accessToken: token, expiresIn: 5184000 };
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
 * Enrichissement du compte (username / name) via `/me`. **Non bloquant** : l'ID du compte
 * vient déjà du token, donc si `/me` échoue on renvoie `null` et on logge l'erreur complète.
 */
export async function getInstagramUserInfo(token: string): Promise<InstagramUser | null> {
  try {
    // `username` est la seule info que l'on récupère ici ; `user_id` vient du token exchange.
    const params = new URLSearchParams({ fields: 'username', access_token: token });
    const res = await fetch(`https://graph.instagram.com/${GRAPH_API_VERSION}/me?${params.toString()}`);
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

/** Abonne le compte aux webhooks (messages) — requis pour la capture des réels. */
export async function subscribeToWebhooks(igUserId: string, accessToken: string): Promise<void> {
  try {
    const url = `https://graph.instagram.com/${GRAPH_API_VERSION}/${igUserId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ subscribed_fields: 'messages' }).toString(),
    });
    const data = await res.json();
    if (!data.success) console.warn('[IG] subscription webhook échouée:', data);
  } catch (err) {
    console.error('[IG] subscription webhook erreur:', err);
  }
}
