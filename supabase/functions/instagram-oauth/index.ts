// instagram-oauth — connexion d'un compte Instagram par OAuth, partagée web + mobile.
//
//  POST  body { action: 'start', platform?: 'web'|'mobile', next?: string }  (JWT requis)
//        → crée un state lié à l'utilisateur, renvoie { authUrl }.
//
//  GET   /callback?code=&state=   (public, appelé par le navigateur d'Instagram)
//        → échange le code, enregistre la connexion, redirige vers le web ou le deep link.
//
// La fonction est déployée avec verify_jwt = false (le callback est public) ;
// l'action 'start' vérifie le JWT manuellement.
import { adminClient, userClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { buildAuthUrl, exchangeCode } from '../_shared/instagram-oauth.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith('/callback');

  if (isCallback) return handleCallback(url);
  if (req.method === 'POST') return handleStart(req);
  return json({ error: 'méthode non autorisée' }, 405);
});

// ───────────────────────── start (authentifié) ─────────────────────────
async function handleStart(req: Request): Promise<Response> {
  try {
    const supabase = userClient(req);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: 'non authentifié' }, 401);

    const body = (await req.json().catch(() => ({}))) as {
      platform?: string;
      next?: string;
    };
    const platform = body.platform === 'mobile' ? 'mobile' : 'web';
    const next = typeof body.next === 'string' && body.next.startsWith('/') ? body.next : null;

    // Origine du site web appelant (gère prod + previews sans config en dur).
    const origin = req.headers.get('origin');

    const state = crypto.randomUUID();
    const admin = adminClient();
    const { error } = await admin.from('oauth_states').insert({
      state,
      user_id: user.id,
      platform,
      next_path: next,
      origin: platform === 'web' ? origin : null,
    });
    if (error) throw error;

    return json({ authUrl: buildAuthUrl(state) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

// ───────────────────────── callback (public) ─────────────────────────
async function handleCallback(url: URL): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const admin = adminClient();

  // On récupère le state (et donc l'utilisateur + la plateforme) avant tout.
  let row:
    | { user_id: string; platform: string; next_path: string | null; origin: string | null }
    | null = null;
  if (state) {
    const { data } = await admin
      .from('oauth_states')
      .select('user_id, platform, next_path, origin')
      .eq('state', state)
      .maybeSingle();
    row = data ?? null;
  }
  const platform = row?.platform === 'mobile' ? 'mobile' : 'web';

  const done = (status: string) => {
    if (state) admin.from('oauth_states').delete().eq('state', state).then(() => {});
    return redirectBack(platform, row?.next_path ?? null, row?.origin ?? null, status);
  };

  if (oauthError) return done('denied');
  if (!code || !state || !row) return done('state');

  try {
    const result = await exchangeCode(code);
    const patch = {
      ig_account_id: result.igAccountId,
      ig_username: result.username,
      access_token: result.accessToken,
      token_expires_at: result.expiresAt,
      status: 'active' as const,
      connected_at: new Date().toISOString(),
    };

    const { data: existing } = await admin
      .from('instagram_connections')
      .select('id')
      .eq('user_id', row.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin.from('instagram_connections').update(patch).eq('id', existing.id);
    } else {
      await admin.from('instagram_connections').insert({ user_id: row.user_id, ...patch });
    }

    return done('connected');
  } catch (_e) {
    return done('exchange');
  }
}

function redirectBack(
  platform: string,
  next: string | null,
  origin: string | null,
  status: string,
): Response {
  let location: string;
  if (platform === 'mobile') {
    const base = Deno.env.get('MOBILE_REDIRECT') ?? 'reelvault://instagram';
    location = `${base}?status=${status}`;
  } else {
    // Origine capturée au démarrage, sinon SITE_URL en repli.
    const site = (origin ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
    const path = next ?? '/settings';
    location = `${site}${path}?ig=${status}`;
  }
  return new Response(null, { status: 302, headers: { Location: location } });
}
