import { supabase } from './supabase';
import { SUPABASE_URL } from './env';

export type ReprocessResult =
  | { ok: true }
  | { ok: false; reason: 'unauthorized' | 'error' };

/**
 * Lance le re-classement IA de toute la bibliothèque de l'utilisateur.
 * Appelle l'edge function reprocess-library (auth = JWT utilisateur).
 * La fonction répond immédiatement 202 et traite en arrière-plan (EdgeRuntime.waitUntil).
 */
export async function reprocessLibrary(): Promise<ReprocessResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { ok: false, reason: 'unauthorized' };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reprocess-library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    if (res.status === 202 || res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, reason: 'unauthorized' };
    return { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
