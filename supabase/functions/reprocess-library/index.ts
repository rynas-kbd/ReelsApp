// reprocess-library — re-classe TOUS les réels de l'utilisateur authentifié.
// Body: {} (aucun paramètre — l'utilisateur est extrait du JWT)
//
// Répond immédiatement 202 et traite en arrière-plan (EdgeRuntime.waitUntil)
// pour éviter le timeout de l'edge function sur les grosses bibliothèques.
// Traite par lots de 10 avec une pause de 2 s entre chaque lot pour respecter
// les quotas gratuits (Gemini, Groq, RapidAPI). Idempotent (rejouable).
import { adminClient, userClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';

const BATCH_SIZE = 10;
const PAUSE_MS = 2000;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  // Auth : JWT utilisateur (le front envoie session.access_token)
  const authedClient = userClient(req);
  const { data: authData } = await authedClient.auth.getUser();
  const user = authData?.user;
  if (!user) return json({ error: 'non authentifié' }, 401);

  try {
    const supabase = adminClient();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const internalHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    };

    // Récupère uniquement les réels de cet utilisateur
    const { data: reels } = await supabase
      .from('reels')
      .select('id')
      .eq('user_id', user.id)
      .order('added_at', { ascending: true });

    const ids = (reels ?? []).map((r: { id: string }) => r.id);

    // Réinitialise tous les réels à 'pending' immédiatement : cela déclenche les
    // événements Realtime côté client, ce qui affiche le badge « En attente… » sur
    // toutes les cartes de la bibliothèque avant même que le traitement commence.
    if (ids.length > 0) {
      await supabase.from('reels').update({ status: 'pending' }).in('id', ids);
    }

    // Traitement en arrière-plan (ne bloque pas la réponse)
    async function processAll(reelIds: string[]) {
      for (let i = 0; i < reelIds.length; i += BATCH_SIZE) {
        const batch = reelIds.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (reel_id) => {
            try {
              await fetch(`${supabaseUrl}/functions/v1/enrich-reel`, {
                method: 'POST',
                headers: internalHeaders,
                body: JSON.stringify({ reel_id }),
              });
              await fetch(`${supabaseUrl}/functions/v1/classify-reel`, {
                method: 'POST',
                headers: internalHeaders,
                body: JSON.stringify({ reel_id }),
              });
            } catch {
              // Erreur sur un réel isolé → on continue les suivants
            }
          }),
        );

        // Pause entre les lots pour ménager les quotas gratuits
        if (i + BATCH_SIZE < reelIds.length) {
          await new Promise((r) => setTimeout(r, PAUSE_MS));
        }
      }
    }

    // @ts-ignore — EdgeRuntime est disponible dans le runtime Supabase/Deno
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processAll(ids));
    } else {
      // Fallback (tests locaux) : attendre quand même
      await processAll(ids);
    }

    return json({ ok: true, total: ids.length, started: true }, 202);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
