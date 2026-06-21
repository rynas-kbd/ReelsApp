import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCode, IG_NEXT_COOKIE, IG_STATE_COOKIE } from '@/lib/instagram/oauth';

function readCookie(request: Request, name: string): string | undefined {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1];
}

/** Callback OAuth Instagram : valide le state, échange le code, stocke la connexion. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const cookieState = readCookie(request, IG_STATE_COOKIE);
  const nextCookie = readCookie(request, IG_NEXT_COOKIE);
  const next = nextCookie?.startsWith('/') ? nextCookie : '/settings';

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete(IG_STATE_COOKIE);
    res.cookies.delete(IG_NEXT_COOKIE);
    return res;
  };

  const fail = (reason: string) =>
    clearCookies(
      NextResponse.redirect(new URL(`${next}?ig=${reason}`, request.url), { status: 303 }),
    );

  if (error) return fail('denied');
  if (!code || !state || !cookieState || state !== cookieState) return fail('state');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  let result;
  try {
    result = await exchangeCode(request, code);
  } catch {
    return fail('exchange');
  }

  const patch = {
    ig_account_id: result.igAccountId,
    ig_username: result.username,
    access_token: result.accessToken,
    token_expires_at: result.expiresAt,
    status: 'active' as const,
    connected_at: new Date().toISOString(),
  };

  // Une ligne de connexion existe déjà (créée à l'inscription) : on la met à jour,
  // sinon on en crée une.
  const { data: existing } = await supabase
    .from('instagram_connections')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase.from('instagram_connections').update(patch).eq('id', existing.id);
  } else {
    await supabase.from('instagram_connections').insert({ user_id: user.id, ...patch });
  }

  return clearCookies(
    NextResponse.redirect(new URL(`${next}?ig=connected`, request.url), { status: 303 }),
  );
}
