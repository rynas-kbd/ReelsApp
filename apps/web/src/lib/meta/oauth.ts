/**
 * OAuth Instagram (Instagram API with Instagram Login) — version éprouvée
 * portée depuis InstaFlow. Tourne dans les route handlers Next.js (Vercel).
 *
 * Variables d'environnement (Vercel) :
 *   META_APP_ID        App ID de l'app Meta de ReelVault
 *   META_APP_SECRET    App Secret
 *   NEXT_PUBLIC_SITE_URL  (optionnel) origine publique stable
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

/** Échange le code contre un jeton court. */
export async function exchangeCodeForToken(request: Request, code: string): Promise<string> {
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
  return data.access_token as string;
}

/** Échange le jeton court contre un jeton long (~60 j). Repli sur le court si échec. */
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

/** Infos du compte Instagram Business. */
export async function getInstagramUserInfo(token: string): Promise<InstagramUser> {
  // Champs essentiels uniquement. Sur graph.instagram.com/me (Instagram API with
  // Instagram Login), demander `name`/`profile_picture_url` fait échouer TOUTE la
  // requête avec « Unsupported request - method type: get ». On ne demande donc que
  // ce qui est garanti et réellement utilisé ensuite (user_id + username).
  const res = await fetch(
    `https://graph.instagram.com/me?fields=user_id,username&access_token=${token}`,
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Infos Instagram: ${data.error?.message ?? 'inconnu'}`);
  }
  // Best-effort : on tente d'enrichir avec le nom et la photo, sans bloquer la
  // connexion si ces champs ne sont pas disponibles pour ce compte.
  try {
    const extraRes = await fetch(
      `https://graph.instagram.com/me?fields=name,profile_picture_url&access_token=${token}`,
    );
    const extra = await extraRes.json();
    if (extraRes.ok && !extra.error) {
      data.name = extra.name;
      data.profile_picture_url = extra.profile_picture_url;
    }
  } catch {
    /* champs optionnels indisponibles : on continue avec user_id + username */
  }
  return data as InstagramUser;
}

/** Abonne le compte aux webhooks (messages) — requis pour la capture des réels. */
export async function subscribeToWebhooks(igUserId: string, accessToken: string): Promise<void> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/${GRAPH_API_VERSION}/${igUserId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed_fields: 'messages', access_token: accessToken }),
      },
    );
    const data = await res.json();
    if (!data.success) console.warn('[IG] subscription webhook échouée:', data);
  } catch (err) {
    console.error('[IG] subscription webhook erreur:', err);
  }
}
