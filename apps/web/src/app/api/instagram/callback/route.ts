import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramUserInfo,
  subscribeToWebhooks,
} from '@/lib/meta/oauth';

/**
 * GET /api/instagram/callback
 * Retour OAuth Instagram. Valide le state, échange le code, enregistre la
 * connexion dans `instagram_connections`, abonne au webhook, puis redirige
 * (web : vers le site ; mobile : vers le deep link reelvault://).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const admin = createAdminClient();

  // Récupère le state (utilisateur + plateforme + origine).
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
    if (state) void admin.from('oauth_states').delete().eq('state', state);
    return redirectBack(request, platform, row?.next_path ?? null, row?.origin ?? null, status);
  };

  if (oauthError) return done('denied');
  if (!code || !state || !row) return done('state');

  try {
    const shortToken = await exchangeCodeForToken(request, code);
    const { accessToken, expiresIn } = await exchangeForLongLivedToken(shortToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const igUser = await getInstagramUserInfo(accessToken);
    const igAccountId = igUser.user_id ?? igUser.id;

    const patch = {
      ig_account_id: igAccountId,
      ig_username: igUser.username ?? null,
      access_token: accessToken,
      token_expires_at: expiresAt,
      status: 'active' as const,
      connected_at: new Date().toISOString(),
    };

    // Une ligne existe déjà (créée à l'inscription) : on la met à jour, sinon insert.
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

    // Abonne le compte aux webhooks (capture des réels partagés).
    await subscribeToWebhooks(igAccountId, accessToken);

    return done('connected');
  } catch (e) {
    console.error('[IG callback]', e);
    return done('exchange');
  }
}

function redirectBack(
  request: Request,
  platform: string,
  next: string | null,
  origin: string | null,
  status: string,
): Response {
  let location: string;
  if (platform === 'mobile') {
    location = `reelvault://instagram?status=${status}`;
  } else {
    const base = (origin ?? new URL(request.url).origin).replace(/\/$/, '');
    location = `${base}${next ?? '/settings'}?ig=${status}`;
  }
  const res = NextResponse.redirect(location, { status: 303 });
  res.cookies.delete('oauth_state');
  return res;
}
