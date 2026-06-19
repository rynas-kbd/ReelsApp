import { supabase } from './supabase';
import { SUPABASE_URL } from './env';

export type AddReelSource = 'manual' | 'share';

export type AddReelResult =
  | { ok: true; status: 200 }
  | { ok: false; status: 409; reason: 'duplicate' }
  | { ok: false; status: 422; reason: 'invalid' }
  | { ok: false; status: number; reason: 'error' };

/**
 * Appelle l'Edge Function add-reel avec le JWT de l'utilisateur courant.
 * POST ${SUPABASE_URL}/functions/v1/add-reel  body { url, source }
 * Réponses gérées : 200 (ok), 409 (doublon), 422 (lien invalide).
 */
export async function addReel(url: string, source: AddReelSource): Promise<AddReelResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, status: 401, reason: 'error' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/add-reel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url, source }),
    });

    if (res.status === 200) return { ok: true, status: 200 };
    if (res.status === 409) return { ok: false, status: 409, reason: 'duplicate' };
    if (res.status === 422) return { ok: false, status: 422, reason: 'invalid' };
    return { ok: false, status: res.status, reason: 'error' };
  } catch {
    return { ok: false, status: 0, reason: 'error' };
  }
}
