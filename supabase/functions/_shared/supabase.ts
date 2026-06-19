import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/** Client admin (service_role) — bypass RLS. À n'utiliser que côté serveur. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client lié au JWT de l'utilisateur appelant (respecte la RLS). */
export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
