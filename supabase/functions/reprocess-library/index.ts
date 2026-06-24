// reprocess-library — re-classe TOUS les réels d'un utilisateur (backfill complet).
// Body: { user_id?: string }  (admin uniquement ; si absent → tous les utilisateurs)
//
// Traite par lots de 10 avec une pause de 2 s entre chaque lot pour respecter
// les quotas gratuits (Gemini, Groq, RapidAPI). Idempotent (rejouable).
//
// ⚠️ Cette fonction s'exécute en service-role et est protégée par le secret SUPABASE_SERVICE_ROLE_KEY.
//    Elle ne doit PAS être exposée publiquement sans vérification d'auth.
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';

const BATCH_SIZE = 10;
const PAUSE_MS = 2000;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  // Auth basique : vérifier que l'appelant passe le service-role key
  const auth = req.headers.get('authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!auth.includes(serviceKey)) {
    return json({ error: 'non autorisé' }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUser: string | null = body?.user_id ?? null;

    const supabase = adminClient();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    };

    // Récupère les réels à retraiter (tous ou pour un user spécifique)
    let query = supabase.from('reels').select('id').order('added_at', { ascending: true });
    if (targetUser) query = query.eq('user_id', targetUser);
    const { data: reels } = await query;

    const ids = (reels ?? []).map((r: { id: string }) => r.id);
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (reel_id) => {
          try {
            // Re-enrich pour récupérer la légende complète + type de média
            await fetch(`${supabaseUrl}/functions/v1/enrich-reel`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ reel_id }),
            });
            // Re-classify avec le nouveau pipeline multimodal
            await fetch(`${supabaseUrl}/functions/v1/classify-reel`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ reel_id }),
            });
            processed++;
          } catch {
            errors++;
          }
        }),
      );

      // Pause entre les lots
      if (i + BATCH_SIZE < ids.length) {
        await new Promise((r) => setTimeout(r, PAUSE_MS));
      }
    }

    return json({ ok: true, total: ids.length, processed, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
