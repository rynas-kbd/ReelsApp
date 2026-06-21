import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl, IG_NEXT_COOKIE, IG_STATE_COOKIE } from '@/lib/instagram/oauth';

/** Démarre le flux OAuth Instagram : génère un state anti-CSRF puis redirige. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const state = crypto.randomUUID();

  // Chemin de retour après connexion (onboarding ou réglages). Relatif uniquement.
  const nextParam = new URL(request.url).searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/settings';

  let authUrl: string;
  try {
    authUrl = buildAuthUrl(request, state);
  } catch {
    return NextResponse.redirect(new URL(`${next}?ig=config`, request.url), { status: 303 });
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600, // 10 min
  };

  const res = NextResponse.redirect(authUrl, { status: 303 });
  res.cookies.set(IG_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(IG_NEXT_COOKIE, next, cookieOpts);
  return res;
}
