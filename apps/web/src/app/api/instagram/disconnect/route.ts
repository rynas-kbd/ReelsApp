import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Déconnecte le compte Instagram : statut « revoked » + jeton effacé. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  await supabase
    .from('instagram_connections')
    .update({
      status: 'revoked',
      access_token: null,
      token_expires_at: null,
      connected_at: null,
    })
    .eq('user_id', user.id);

  return NextResponse.redirect(new URL('/settings?ig=disconnected', request.url), { status: 303 });
}
