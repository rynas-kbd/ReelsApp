import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase service-role (bypass RLS).
 * À n'utiliser QUE côté serveur (route handlers) — jamais exposé au client.
 * Nécessaire dans le callback OAuth Instagram : pas de session utilisateur
 * disponible (la requête vient du navigateur d'Instagram), on écrit donc pour
 * l'utilisateur identifié par le `state`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE service role non configuré');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
