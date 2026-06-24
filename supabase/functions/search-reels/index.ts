// search-reels — Recherche hybride (plein-texte + sémantique) pour l'utilisateur authentifié.
// Partagée web + mobile. Body: { query, tags?, dateFrom?, dateTo?, limit? }
//
// Pipeline :
//   1. Auth JWT utilisateur
//   2. Embedding Gemini via rotation BYOK (_shared/embed.ts + keys.ts)
//   3. RPC search_reels (RRF fulltext × sémantique)
//   4. Fetch réels par ids + filtres optionnels ; re-tri RRF
//   5. Repli ilike si RPC vide ou pgvector indisponible
import { adminClient, userClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { getApiKeys, runWithRotation } from '../_shared/keys.ts';
import { embedWithKey } from '../_shared/embed.ts';

// Copie de packages/shared/src/data.ts:20 — garder synchro avec ce fichier.
const REEL_SELECT =
  '*, category:categories(id, name, slug, color, icon, parent_id, parent:parent_id(id, name, slug, color))';

const DEFAULT_LIMIT = 30;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  // ── Auth JWT utilisateur ────────────────────────────────────────────────
  const { data: authData } = await userClient(req).auth.getUser();
  const user = authData?.user;
  if (!user) return json({ error: 'non authentifié' }, 401);

  const body = await req.json().catch(() => ({})) as {
    query?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  };

  const query = (body.query ?? '').trim();
  if (!query) return json({ reels: [] });

  const limit = Math.min(body.limit ?? DEFAULT_LIMIT, 100);
  const admin = adminClient();

  // ── Embedding Gemini (best-effort via rotation BYOK) ───────────────────
  let embedding: number[] | null = null;
  try {
    const keys = await getApiKeys(admin, user.id, 'gemini');
    embedding = await runWithRotation(admin, keys, (k) => embedWithKey(query, k));
  } catch {
    // Non bloquant — repli sur plein-texte seul
  }

  // ── RPC search_reels (RRF fulltext × sémantique) ───────────────────────
  let reelIds: string[] = [];
  try {
    const { data: rpcResult } = await admin.rpc('search_reels', {
      p_user: user.id,
      p_query: query,
      p_embedding: embedding,
      p_limit: limit * 3, // marge pour les filtres tags/date
    });
    reelIds = ((rpcResult ?? []) as { reel_id: string }[]).map((r) => r.reel_id);
  } catch {
    // Repli ilike si pgvector/RPC indisponible
  }

  if (reelIds.length === 0) {
    // ── Repli plein-texte simple ─────────────────────────────────────────
    const s = `%${query}%`;
    let q = admin
      .from('reels')
      .select(REEL_SELECT)
      .eq('user_id', user.id)
      .or(`title.ilike.${s},caption.ilike.${s},summary.ilike.${s},author_username.ilike.${s}`)
      .order('added_at', { ascending: false })
      .limit(limit);
    if (body.tags?.length) q = q.overlaps('tags', body.tags);
    if (body.dateFrom) q = q.gte('added_at', body.dateFrom);
    if (body.dateTo) q = q.lte('added_at', body.dateTo);
    const { data } = await q;
    return json({ reels: data ?? [], searchType: 'ilike' });
  }

  // ── Fetch complet des réels par IDs (avec filtres optionnels) ───────────
  let reelQuery = admin
    .from('reels')
    .select(REEL_SELECT)
    .in('id', reelIds.slice(0, limit * 2))
    .eq('user_id', user.id);

  if (body.tags?.length) reelQuery = reelQuery.overlaps('tags', body.tags);
  if (body.dateFrom) reelQuery = reelQuery.gte('added_at', body.dateFrom);
  if (body.dateTo) reelQuery = reelQuery.lte('added_at', body.dateTo);

  const { data: reels } = await reelQuery;

  // Re-trier par ordre RRF puis tronquer
  const idRank = new Map(reelIds.map((id, i) => [id, i]));
  const sorted = ((reels ?? []) as { id: string }[])
    .sort((a, b) => (idRank.get(a.id) ?? 999) - (idRank.get(b.id) ?? 999))
    .slice(0, limit);

  return json({ reels: sorted, searchType: embedding ? 'hybrid' : 'fulltext' });
});
