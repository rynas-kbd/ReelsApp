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

/**
 * Échange le code contre un jeton court.
 * Renvoie AUSSI le `user_id` fourni par Instagram dans la réponse du token : c'est la
 * source autoritaire de l'ID du compte, on n'a donc pas besoin de `/me` pour l'obtenir.
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
    // Instagram API with Instagram Login uses /oauth/access_token (not /access_token)
    const res = await fetch(`https://graph.instagram.com/oauth/access_token?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      console.warn(
        '[IG] échange long-lived échoué, repli sur token court:',
        JSON.stringify({ status: res.status, error: data.error ?? data }),
      );
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
 * Enrichissement du compte (username / name) via `/me`. **Non bloquant** : l'ID du compte
 * vient déjà du token (cf. exchangeCodeForToken), donc si `/me` échoue on renvoie `null` et
 * on logge l'erreur Graph COMPLÈTE — la connexion ne doit jamais casser à cause de ça.
 */
export async function getInstagramUserInfo(token: string): Promise<InstagramUser | null> {
  try {
    const params = new URLSearchParams({ fields: 'user_id,username', access_token: token });
    // Instagram API with Instagram Login requires versioned endpoint
    const res = await fetch(`https://graph.instagram.com/${GRAPH_API_VERSION}/me?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error(
        '[IG] /me a échoué (enrichissement ignoré):',
        JSON.stringify({ httpStatus: res.status, error: data.error ?? data, tokenPrefix: token?.slice(0, 10) }),
      );
      return null;
    }
    // Best-effort : nom + photo (peuvent ne pas être supportés selon le compte).
    try {
      const extraParams = new URLSearchParams({ fields: 'name,profile_picture_url', access_token: token });
      const extraRes = await fetch(`https://graph.instagram.com/${GRAPH_API_VERSION}/me?${extraParams.toString()}`);
      const extra = await extraRes.json();
      if (extraRes.ok && !extra.error) {
        data.name = extra.name;
        data.profile_picture_url = extra.profile_picture_url;
      }
    } catch {
      /* champs optionnels indisponibles : on continue */
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
    // Meta Graph API requires form-encoded body + access_token in query string
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
