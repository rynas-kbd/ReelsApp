/**
 * POST /api/search
 * Recherche hybride (plein-texte + sémantique) dans la bibliothèque de l'utilisateur.
 *
 * Body: { query: string; tags?: string[]; dateFrom?: string; dateTo?: string; limit?: number }
 *
 * Pipeline :
 *   1. Auth (cookie web ou Bearer mobile)
 *   2. Génère un embedding du query via Gemini (clé BYOK ou env GEMINI_API_KEY)
 *   3. Appelle la RPC search_reels (RRF plein-texte × sémantique)
 *   4. Récupère les réels dans l'ordre RRF, avec filtres optionnels (tags, date)
 *   5. Repli plein-texte (ilike) si Gemini indisponible ou embedding vide
 */
import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const GEMINI_EMBED_MODEL = 'text-embedding-004';
const EMBED_DIMS = 768;
const DEFAULT_LIMIT = 30;

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const isMobile = !!authHeader?.startsWith('Bearer ');

  let userId: string | null = null;
  let supabase: ReturnType<typeof createSbClient>;

  if (isMobile && authHeader) {
    supabase = createSbClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } else {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
    // Pour les requêtes suivantes on utilise le client admin (RLS bypassed, on filtre par user_id manuellement)
    supabase = createAdminClient() as unknown as ReturnType<typeof createSbClient>;
  }

  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    query?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  };

  const query = (body.query ?? '').trim();
  if (!query) return NextResponse.json({ reels: [] });

  const limit = Math.min(body.limit ?? DEFAULT_LIMIT, 100);
  const admin = createAdminClient();

  // ── Embedding (best-effort) ───────────────────────────────────────────────
  let embedding: number[] | null = null;
  try {
    // Priorité : clé BYOK de l'utilisateur, puis variable d'env
    const { data: keyRows } = await admin
      .from('user_api_keys')
      .select('key')
      .eq('user_id', userId)
      .eq('provider', 'gemini')
      .is('cooldown_until', null)
      .order('created_at', { ascending: true })
      .limit(1);

    const geminiKey =
      (keyRows?.[0] as { key?: string } | undefined)?.key ??
      process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${GEMINI_EMBED_MODEL}`,
            content: { parts: [{ text: query }] },
            outputDimensionality: EMBED_DIMS,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        embedding = data?.embedding?.values ?? null;
      }
    }
  } catch {
    // Non bloquant — on replie sur le plein-texte seul
  }

  // ── RPC search_reels ──────────────────────────────────────────────────────
  let reelIds: string[] = [];
  try {
    const { data: rpcResult } = await admin.rpc('search_reels', {
      p_user: userId,
      p_query: query,
      p_embedding: embedding,
      p_limit: limit * 3, // marge pour les filtres tags/date
    });

    reelIds = ((rpcResult ?? []) as { reel_id: string }[]).map((r) => r.reel_id);
  } catch {
    // Repli ilike si la RPC échoue (pgvector pas encore actif, etc.)
  }

  if (reelIds.length === 0) {
    // Repli plein-texte simple
    const s = `%${query}%`;
    let q = admin
      .from('reels')
      .select('*, category:categories(id, name, slug, color, icon, parent_id, parent:parent_id(id, name, slug, color))')
      .eq('user_id', userId)
      .or(`title.ilike.${s},caption.ilike.${s},summary.ilike.${s},author_username.ilike.${s}`)
      .order('added_at', { ascending: false })
      .limit(limit);
    if (body.tags?.length) q = q.overlaps('tags', body.tags);
    if (body.dateFrom) q = q.gte('added_at', body.dateFrom);
    if (body.dateTo) q = q.lte('added_at', body.dateTo);
    const { data } = await q;
    return NextResponse.json({ reels: data ?? [], searchType: 'ilike' });
  }

  // ── Fetch complet des réels par IDs (avec filtres) ────────────────────────
  let reelQuery = admin
    .from('reels')
    .select('*, category:categories(id, name, slug, color, icon, parent_id, parent:parent_id(id, name, slug, color))')
    .in('id', reelIds.slice(0, limit * 2))
    .eq('user_id', userId);

  if (body.tags?.length) reelQuery = reelQuery.overlaps('tags', body.tags);
  if (body.dateFrom) reelQuery = reelQuery.gte('added_at', body.dateFrom);
  if (body.dateTo) reelQuery = reelQuery.lte('added_at', body.dateTo);

  const { data: reels } = await reelQuery;

  // Re-trier par ordre RRF
  const idRank = new Map(reelIds.map((id, i) => [id, i]));
  const sorted = ((reels ?? []) as { id: string }[])
    .sort((a, b) => (idRank.get(a.id) ?? 999) - (idRank.get(b.id) ?? 999))
    .slice(0, limit);

  return NextResponse.json({
    reels: sorted,
    searchType: embedding ? 'hybrid' : 'fulltext',
  });
}
