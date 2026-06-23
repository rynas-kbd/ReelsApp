import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/account/delete
 * Supprime définitivement le compte de l'utilisateur authentifié et toutes ses données.
 *
 * Auth duale :
 *   - Web : session cookie (createClient server)
 *   - Mobile (futur) : Authorization: Bearer <jwt>
 *
 * Ordre des opérations :
 *   1. Identifier l'utilisateur
 *   2. Collecter les shortcodes des réels AVANT suppression
 *   3. Supprimer les miniatures orphelines (non partagées par un autre user)
 *   4. Purger best-effort les webhook_events liés aux IDs Instagram
 *   5. admin.auth.admin.deleteUser() → cascade toutes les tables
 *   6. signOut() → invalide la session courante
 */
export async function POST(request: Request) {
  // ── Auth ──
  const authHeader = request.headers.get('authorization');
  const isMobile = !!authHeader?.startsWith('Bearer ');

  let userId: string | null = null;
  if (isMobile && authHeader) {
    const sb = createSbClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } else {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'non authentifié' }, { status: 401 });
  }

  const admin = createAdminClient();

  // ── 1. Collecter les shortcodes des réels (avant suppression) ──
  const { data: userReels } = await admin
    .from('reels')
    .select('shortcode')
    .eq('user_id', userId);

  const shortcodes = (userReels ?? []).map((r: { shortcode: string }) => r.shortcode).filter(Boolean);

  // ── 2. Miniatures orphelines (non référencées par un autre utilisateur) ──
  if (shortcodes.length > 0) {
    const { data: sharedReels } = await admin
      .from('reels')
      .select('shortcode')
      .in('shortcode', shortcodes)
      .neq('user_id', userId);

    const sharedSet = new Set((sharedReels ?? []).map((r: { shortcode: string }) => r.shortcode));
    const orphanPaths = shortcodes
      .filter((s) => !sharedSet.has(s))
      .map((s) => `${s}.jpg`);

    if (orphanPaths.length > 0) {
      await admin.storage.from('thumbnails').remove(orphanPaths);
    }
  }

  // ── 3. Purge best-effort des webhook_events (aucune colonne user_id — log global) ──
  try {
    const { data: conn } = await admin
      .from('instagram_connections')
      .select('ig_account_id, ig_messaging_id, sender_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (conn) {
      const igIds = [conn.ig_account_id, conn.ig_messaging_id, conn.sender_id].filter(Boolean);
      if (igIds.length > 0) {
        // Récupère les IDs des événements qui mentionnent ces IDs Instagram dans le payload.
        const { data: events } = await admin
          .from('webhook_events')
          .select('id, payload');

        if (events && events.length > 0) {
          const toDelete = events
            .filter((e: { id: string; payload: unknown }) => {
              const raw = JSON.stringify(e.payload);
              return igIds.some((id) => raw.includes(id as string));
            })
            .map((e: { id: string }) => e.id);

          if (toDelete.length > 0) {
            // TODO: si webhook_events grossit, remplacer par une requête .in() sur le payload jsonb.
            for (const id of toDelete) {
              await admin.from('webhook_events').delete().eq('id', id);
            }
          }
        }
      }
    }
  } catch (err) {
    // Non bloquant : le log global n'empêche pas la suppression du compte.
    console.warn('[account/delete] purge webhook_events non critique:', err);
  }

  // ── 4. Supprimer l'utilisateur — cascade toutes les tables par FK ──
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('[account/delete] deleteUser échoué:', deleteError);
    return NextResponse.json({ error: 'suppression échouée' }, { status: 500 });
  }

  // ── 5. Invalider la session courante (web cookie) ──
  if (!isMobile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}
