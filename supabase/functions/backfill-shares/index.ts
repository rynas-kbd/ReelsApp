// backfill-shares — rejoue les posts photo/carrousel Instagram qui ont été
// reçus par le webhook (et journalisés dans `webhook_events`) mais jamais
// ingérés parce que l'ancien code ne savait pas traiter les attachments `ig_post`.
//
// Usage (une seule fois, admin) :
//   curl -X POST "$SUPABASE_URL/functions/v1/backfill-shares" \
//        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
//
// Idempotent : le dédoublonnage par raw_metadata->>'media_id' empêche les doublons.
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { ingestSharedAttachment, orchestrate, type IgAttachment } from '../_shared/ingest.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const supabase = adminClient();

  // Charge tous les événements webhook avec signature valide.
  const { data: events, error } = await supabase
    .from('webhook_events')
    .select('id, payload')
    .eq('signature_ok', true)
    .order('id', { ascending: true });

  if (error) return json({ error: error.message }, 500);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const evt of events ?? []) {
    const payload = evt.payload as Record<string, unknown>;

    // Parcourt entry[] → messaging[] → message.attachments[]
    const entries = (payload.entry ?? []) as Array<Record<string, unknown>>;
    for (const entry of entries) {
      const messagingList = (entry.messaging ?? []) as Array<Record<string, unknown>>;
      for (const msg of messagingList) {
        // Vérifie qu'il ne s'agit pas d'un écho (message envoyé par le compte connecté).
        const isEcho = (msg.message as Record<string, unknown> | undefined)?.is_echo ?? false;
        if (isEcho) continue;

        // Matching de connexion (même logique que meta-webhook).
        const recipientId = (msg.recipient as Record<string, unknown> | undefined)?.id as string | undefined;
        const entryId = entry.id as string | undefined;
        const businessAccountId = recipientId ?? entryId;
        const senderId = (msg.sender as Record<string, unknown> | undefined)?.id as string | undefined;

        if (!businessAccountId) continue;

        const { data: conn } = await supabase
          .from('instagram_connections')
          .select('user_id, sender_id')
          .or(`ig_messaging_id.eq.${businessAccountId},ig_account_id.eq.${businessAccountId}`)
          .eq('status', 'active')
          .maybeSingle();

        if (!conn) continue;
        if (conn.sender_id && senderId && conn.sender_id !== senderId) continue;

        // Traite uniquement les pièces jointes de type ig_post (carrousels / photos).
        const attachments = (
          (msg.message as Record<string, unknown> | undefined)?.attachments ?? []
        ) as IgAttachment[];

        for (const att of attachments) {
          if (att.type !== 'ig_post') continue;

          try {
            const result = await ingestSharedAttachment(supabase, conn.user_id, att);
            if (result) {
              await orchestrate(result.reelId, result.kind);
              inserted++;
            } else {
              skipped++; // doublon ou payload vide
            }
          } catch (e) {
            errors.push(String(e));
            skipped++;
          }
        }
      }
    }

    // Marque l'événement comme traité (idempotent si on rejoue).
    await supabase
      .from('webhook_events')
      .update({ handled: true })
      .eq('id', evt.id);
  }

  return json({ ok: true, inserted, skipped, errors: errors.slice(0, 20) });
});
