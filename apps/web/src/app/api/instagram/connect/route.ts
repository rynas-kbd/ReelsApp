import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLoginUrl } from '@/lib/meta/oauth';

/**
 * GET /api/instagram/connect
 * Démarre le flux OAuth Instagram.
 *  - Web : session cookie → 302 vers Instagram.
 *  - Mobile : header Authorization Bearer → JSON { authUrl }.
 * Le `state` (anti-CSRF + utilisateur + plateforme) est stocké dans `oauth_states`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextParam = url.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/settings';

  const authHeader = request.headers.get('authorization');
  const isMobile =
    url.searchParams.get('platform') === 'mobile' || !!authHeader?.startsWith('Bearer ');

  // ── Identifier l'utilisateur ──
  let userId: string | null = null;
  if (isMobile && authHeader) {
    const sb = createSbClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } else {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    if (isMobile) return NextResponse.json({ error: 'non authentifié' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  }

  // ── Créer le state ──
  const state = crypto.randomUUID();
  const platform = isMobile ? 'mobile' : 'web';
  const admin = createAdminClient();
  const { error } = await admin.from('oauth_states').insert({
    state,
    user_id: userId,
    platform,
    next_path: next,
    origin: isMobile ? null : new URL(request.url).origin,
  });
  if (error) {
    if (isMobile) return NextResponse.json({ error: 'state' }, { status: 500 });
    return NextResponse.redirect(new URL('/settings?ig=config', request.url), { status: 303 });
  }

  let authUrl: string;
  try {
    authUrl = getLoginUrl(request, state);
  } catch {
    if (isMobile) return NextResponse.json({ error: 'config' }, { status: 500 });
    return NextResponse.redirect(new URL('/settings?ig=config', request.url), { status: 303 });
  }

  if (isMobile) return NextResponse.json({ authUrl });

  const res = NextResponse.redirect(authUrl, { status: 303 });
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
