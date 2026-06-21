// Helpers OAuth Instagram (Instagram API with Instagram Login) — côté Edge Function.
//
// Variables d'environnement (Supabase secrets) :
//   INSTAGRAM_CLIENT_ID      App ID Instagram
//   INSTAGRAM_CLIENT_SECRET  App Secret Instagram
//   INSTAGRAM_REDIRECT_URI   URI de callback (= .../functions/v1/instagram-oauth/callback)
//   INSTAGRAM_SCOPES         (optionnel) scopes séparés par des virgules
//   SITE_URL                 origine du site web (retour après connexion)
//   MOBILE_REDIRECT          (optionnel) deep link mobile, défaut reelvault://instagram

const AUTH_BASE = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = 'https://graph.instagram.com';

const DEFAULT_SCOPES = 'instagram_business_basic,instagram_business_manage_messages';

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

export function redirectUri(): string {
  return env('INSTAGRAM_REDIRECT_URI');
}

/** Construit l'URL d'autorisation Instagram. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env('INSTAGRAM_CLIENT_ID'),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: Deno.env.get('INSTAGRAM_SCOPES') ?? DEFAULT_SCOPES,
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

/** Échange le code d'autorisation contre un jeton long + infos du compte. */
export async function exchangeCode(code: string): Promise<IgTokenResult> {
  const clientId = env('INSTAGRAM_CLIENT_ID');
  const clientSecret = env('INSTAGRAM_CLIENT_SECRET');

  // 1) Code → jeton court
  const shortRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
      code,
    }),
  });
  if (!shortRes.ok) throw new Error(`token court: ${await shortRes.text()}`);
  const shortJson = (await shortRes.json()) as {
    access_token: string;
    user_id?: string | number;
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
  const meParams = new URLSearchParams({ fields: 'user_id,username', access_token: accessToken });
  const meRes = await fetch(`${GRAPH_BASE}/me?${meParams.toString()}`);
  let igAccountId = shortJson.user_id ? String(shortJson.user_id) : '';
  let username: string | null = null;
  if (meRes.ok) {
    const meJson = (await meRes.json()) as { user_id?: string; id?: string; username?: string };
    igAccountId = meJson.user_id ?? meJson.id ?? igAccountId;
    username = meJson.username ?? null;
  }
  if (!igAccountId) throw new Error('compte Instagram introuvable');

  return { igAccountId, username, accessToken, expiresAt };
}
