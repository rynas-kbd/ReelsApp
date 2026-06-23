/**
 * OAuth Instagram (Instagram API with Instagram Login) — version corrigée.
 * Tourne dans les route handlers Next.js (Vercel).
 *
 * Variables d'environnement (Vercel) :
 *   META_APP_ID        App ID de l'app Meta de ReelVault
 *   META_APP_SECRET    App Secret
 *   NEXT_PUBLIC_SITE_URL  (optionnel) origine publique stable
 *
 * Points importants sur cette API (≠ Basic Display, ≠ Instagram Graph API/FB Login) :
 *   - Tous les appels passent par l'hôte `graph.instagram.com`.
 *   - Cet hôte n'utilise PAS de préfixe de version (`/v21.0/`) dans le chemin.
 *     Le versioning (`/v21.0/...`) n'existe que sur `graph.facebook.com`.
 *   - L'échange du `code` (api.instagram.com/oauth/access_token) renvoie un token
 *     COURT (~1 h), SANS `expires_in`. Il faut ensuite l'échanger contre un token
 *     long (~60 j) via `ig_exchange_token` sur `graph.instagram.com/access_token`
 *     (sans `/oauth/`).
 */

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
].join(',');

// Durées réelles renvoyées par l'API, exprimées en secondes.
const SHORT_LIVED_TTL = 3600; // ~1 h : token issu de l'échange du `code`.

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
 * Échange le `code` contre un token COURT (~1 h).
 * ⚠️ Cette réponse ne contient PAS `expires_in` (d'où le `undefined` observé en log) :
 * c'est normal. On renvoie donc `expiresIn = SHORT_LIVED_TTL` pour refléter la réalité,
 * et c'est `exchangeForLongLivedToken` qui produira le token de 60 jours.
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
    // `expires_in` est absent pour un token court → on assume ~1 h.
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : SHORT_LIVED_TTL,
  };
}

/**
 * Échange le token court (~1 h) contre un token long (~60 j) via `ig_exchange_token`.
 *
 * ✅ Endpoint correct : `https://graph.instagram.com/access_token` (PAS `/oauth/access_token`).
 *    `/oauth/access_token` n'existe que sur `api.instagram.com` (échange du `code`).
 */
export async function exchangeForLongLivedToken(
  token: string,
  initialExpiresIn: number,
): Promise<{ accessToken: string; expiresIn: number }> {
  // Si le token dure déjà plus d'un jour, c'est déjà un long-lived : rien à faire.
  if (initialExpiresIn > 86400) {
    console.log(`[IG] token déjà long-lived (${initialExpiresIn}s), pas d'échange nécessaire`);
    return { accessToken: token, expiresIn: initialExpiresIn };
  }

  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.META_APP_SECRET!,
    access_token: token,
  });

  try {
    // ⚠️ Note le chemin SANS `/oauth/`.
    const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      console.warn(
        '[IG] échange long-lived échoué, repli sur token COURT (à reconnecter sous ~1 h):',
        JSON.stringify({ status: res.status, error: data.error ?? data }),
      );
      // ⚠️ On ne ment plus sur la durée : le token n'est valide que ~1 h.
      // Le stocker comme « 60 jours » masquerait son expiration imminente.
      return { accessToken: token, expiresIn: SHORT_LIVED_TTL };
    }
    return {
      accessToken: data.access_token as string,
      expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 5184000,
    };
  } catch (err) {
    console.error('[IG] échange long-lived exception, repli sur token COURT:', err);
    return { accessToken: token, expiresIn: SHORT_LIVED_TTL };
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
 * Enrichissement du compte (username) via `/me`. **Non bloquant** : l'ID du compte
 * vient déjà du token exchange, donc si `/me` échoue on renvoie `null` et on logge.
 *
 * ✅ Chemin SANS préfixe de version : `graph.instagram.com/me` (pas `/v21.0/me`).
 */
export async function getInstagramUserInfo(token: string): Promise<InstagramUser | null> {
  try {
    const params = new URLSearchParams({ fields: 'id,username', access_token: token });
    const res = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
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

/**
 * Abonne le compte aux webhooks (messages) — requis pour la capture des réels.
 *
 * ✅ Chemin SANS préfixe de version : `graph.instagram.com/{igUserId}/subscribed_apps`.
 */
export async function subscribeToWebhooks(igUserId: string, accessToken: string): Promise<void> {
  try {
    const url = `https://graph.instagram.com/${igUserId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`;
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