// Clés API par utilisateur (BYOK) + rotation, pour les Edge Functions.
// Les fonctions tournent en service-role : elles lisent les clés de l'utilisateur
// propriétaire du réel, et basculent sur la suivante en cas de quota (429).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type Provider = 'gemini' | 'rapidapi';

export interface ApiKey {
  id: string | null; // null = clé d'environnement (repli), pas de cooldown persistant
  key: string;
}

// Durée de mise en pause d'une clé après un quota (429). Le free tier Gemini est
// journalier → on attend quelques heures avant de la réessayer.
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

/**
 * Clés à essayer pour (user, provider), dans l'ordre :
 *   1. clés de l'utilisateur hors cooldown (les plus anciennes d'abord),
 *   2. clé(s) d'environnement en repli (GEMINI_API_KEY / RAPIDAPI_KEY),
 *   3. clés de l'utilisateur en cooldown (dernier recours).
 */
export async function getApiKeys(
  supabase: SupabaseClient,
  userId: string,
  provider: Provider,
): Promise<ApiKey[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('user_api_keys')
    .select('id, key, cooldown_until')
    .eq('user_id', userId)
    .eq('provider', provider)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as Array<{ id: string; key: string; cooldown_until: string | null }>;
  const ready = rows.filter((r) => !r.cooldown_until || r.cooldown_until < nowIso);
  const cooling = rows.filter((r) => r.cooldown_until && r.cooldown_until >= nowIso);

  const envKey = provider === 'gemini'
    ? Deno.env.get('GEMINI_API_KEY')
    : Deno.env.get('RAPIDAPI_KEY');

  const list: ApiKey[] = ready.map((r) => ({ id: r.id, key: r.key }));
  if (envKey) list.push({ id: null, key: envKey });
  list.push(...cooling.map((r) => ({ id: r.id, key: r.key })));
  return list;
}

export interface AttemptOk<T> { ok: true; value: T }
export interface AttemptFail { ok: false; quota?: boolean; error?: string }
export type Attempt<T> = AttemptOk<T> | AttemptFail;

/**
 * Essaie chaque clé jusqu'à un succès. Sur quota (429), la clé est mise en cooldown
 * et on passe à la suivante. Renvoie la valeur, ou null si toutes les clés échouent.
 */
export async function runWithRotation<T>(
  supabase: SupabaseClient,
  keys: ApiKey[],
  attempt: (key: string) => Promise<Attempt<T>>,
): Promise<T | null> {
  for (const k of keys) {
    let res: Attempt<T>;
    try {
      res = await attempt(k.key);
    } catch (e) {
      res = { ok: false, error: String(e) };
    }

    if (res.ok) {
      if (k.id) {
        await supabase.from('user_api_keys')
          .update({ last_used_at: new Date().toISOString(), last_error: null })
          .eq('id', k.id);
      }
      return res.value;
    }

    if (res.quota && k.id) {
      await supabase.from('user_api_keys')
        .update({
          cooldown_until: new Date(Date.now() + COOLDOWN_MS).toISOString(),
          last_error: (res.error ?? 'quota (429)').slice(0, 300),
        })
        .eq('id', k.id);
    } else if (k.id) {
      await supabase.from('user_api_keys')
        .update({ last_error: (res.error ?? 'échec').slice(0, 300) })
        .eq('id', k.id);
    }
    // clé suivante
  }
  return null;
}
