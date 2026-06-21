/**
 * Helpers OAuth Instagram (Instagram Login API / Business Login).
 *
 * Flux :
 *  1. /api/instagram/connect  → redirige vers la page d'autorisation Instagram
 *  2. Instagram redirige vers /api/instagram/callback?code=…
 *  3. on échange le code contre un jeton court, puis un jeton long (60 j)
 *  4. on récupère l'id + username du compte, on stocke la connexion
 *
 * Variables d'environnement requises (Vercel) :
 *  - INSTAGRAM_CLIENT_ID       : « App ID » Instagram de l'app Meta
 *  - INSTAGRAM_CLIENT_SECRET   : « App Secret » Instagram
 *  - NEXT_PUBLIC_SITE_URL      : (optionnel) origine publique, ex. https://reelvault.app
 *  - INSTAGRAM_SCOPES          : (optionnel) scopes séparés par des virgules
 */

const AUTH_BASE = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = 'https://graph.instagram.com';

const DEFAULT_SCOPES = 'instagram_business_basic,instagram_business_manage_messages';

export const IG_STATE_COOKIE = 'ig_oauth_state';
export const IG_NEXT_COOKIE = 'ig_oauth_next';

/** Origine publique de l'app (prod = NEXT_PUBLIC_SITE_URL, sinon origine de la requête). */
export function siteOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? new URL(request.url).origin;
}

/** URI de redirection enregistrée côté Meta. Doit correspondre exactement. */
export function redirectUri(request: Request): string {
  return `${siteOrigin(request)}/api/instagram/callback`;
}

/** Construit l'URL d'autorisation Instagram. */
export function buildAuthUrl(request: Request, state: string): string {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  if (!clientId) throw new Error('INSTAGRAM_CLIENT_ID manquant');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(request),
    response_type: 'code',
    scope: process.env.INSTAGRAM_SCOPES ?? DEFAULT_SCOPES,
    state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export interface IgTokenResult {
  igAccountId: string;
  username: string | null;
  accessToken: string;
  expiresAt: string | null;
}

/** Échange le code d'autorisation contre un jeton long + les infos du compte. */
export async function exchangeCode(request: Request, code: string): Promise<IgTokenResult> {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Identifiants Instagram manquants');

  // 1) Code → jeton court
  const shortRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(request),
      code,
    }),
  });
  if (!shortRes.ok) {
    throw new Error(`Échange du code échoué : ${await shortRes.text()}`);
  }
  const shortJson = (await shortRes.json()) as {
    access_token: string;
    user_id?: string | number;
    permissions?: string[];
  };

  // 2) Jeton court → jeton long (≈ 60 jours)
  const longParams = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: clientSecret,
    access_token: shortJson.access_token,
  });
  const longRes = await fetch(`${GRAPH_BASE}/access_token?${longParams.toString()}`);
  let accessToken = shortJson.access_token;
  let expiresAt: string | null = null;
  if (longRes.ok) {
    const longJson = (await longRes.json()) as { access_token: string; expires_in?: number };
    accessToken = longJson.access_token;
    if (longJson.expires_in) {
      expiresAt = new Date(Date.now() + longJson.expires_in * 1000).toISOString();
    }
  }

  // 3) Infos du compte (id + username)
  const meParams = new URLSearchParams({
    fields: 'user_id,username',
    access_token: accessToken,
  });
  const meRes = await fetch(`${GRAPH_BASE}/me?${meParams.toString()}`);
  let igAccountId = shortJson.user_id ? String(shortJson.user_id) : '';
  let username: string | null = null;
  if (meRes.ok) {
    const meJson = (await meRes.json()) as { user_id?: string; id?: string; username?: string };
    igAccountId = meJson.user_id ?? meJson.id ?? igAccountId;
    username = meJson.username ?? null;
  }

  if (!igAccountId) throw new Error('Impossible de récupérer le compte Instagram');

  return { igAccountId, username, accessToken, expiresAt };
}
