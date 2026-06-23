import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/data-deletion
 * Callback Meta (Instagram Login) : supprime les données d'un utilisateur qui révoque l'accès
 * depuis ses paramètres Instagram/Facebook.
 *
 * Protocole :
 *   1. Meta POST signed_request (HMAC-SHA256, base64url)
 *   2. On vérifie la signature avec META_APP_SECRET
 *   3. On supprime instagram_connections + reels associés
 *   4. On retourne { url, confirmation_code }
 *
 * Doc Meta : https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow#deletion
 */
export async function POST(request: Request) {
  let body: string;
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    body = params.get('signed_request') ?? '';
  } else {
    const json = await request.json().catch(() => ({}));
    body = json.signed_request ?? '';
  }

  if (!body) {
    return NextResponse.json({ error: 'missing signed_request' }, { status: 400 });
  }

  const igUserId = await parseSignedRequest(body);
  if (!igUserId) {
    return NextResponse.json({ error: 'invalid signed_request' }, { status: 400 });
  }

  const confirmationCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

  // Suppression asynchrone (best-effort — on répond 200 à Meta immédiatement).
  deleteUserData(igUserId).catch((err) =>
    console.error('[data-deletion] erreur suppression ig_user', igUserId, err),
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? new URL(request.url).origin;

  return NextResponse.json({
    url: `${siteUrl}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}

async function parseSignedRequest(signedRequest: string): Promise<string | null> {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return null;

  const parts = signedRequest.split('.');
  if (parts.length !== 2) return null;
  const [encodedSig, payload] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (computedSig !== encodedSig) return null;

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.user_id ?? null;
  } catch {
    return null;
  }
}

async function deleteUserData(igUserId: string) {
  const admin = createAdminClient();

  // Trouve la connexion Instagram.
  const { data: conn } = await admin
    .from('instagram_connections')
    .select('id, user_id')
    .eq('ig_account_id', igUserId)
    .maybeSingle();

  if (!conn) {
    console.log('[data-deletion] aucune connexion trouvée pour ig_account_id:', igUserId);
    return;
  }

  // Supprime les réels de l'utilisateur.
  await admin.from('reels').delete().eq('user_id', conn.user_id);

  // Supprime la connexion Instagram.
  await admin.from('instagram_connections').delete().eq('id', conn.id);

  console.log('[data-deletion] données supprimées pour ig_account_id:', igUserId, 'user_id:', conn.user_id);
}
