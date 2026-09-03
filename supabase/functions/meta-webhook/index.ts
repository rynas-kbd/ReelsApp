// meta-webhook — réception des partages de réels Instagram (Messaging API) + activation.
//
//  GET  : vérification de l'abonnement (hub.challenge).
//  POST : valide la signature HMAC, journalise l'évènement, puis :
//          • message d'activation (texte == code) → active la connexion Instagram
//          • réel partagé (attachment / lien IG) → crée le réel + enrich + classify
//
// ⚠️ Le mapping exact des champs Instagram Messaging dépend de la config de TON app Meta.
//    Tout est journalisé dans `webhook_events` pour pouvoir ajuster si besoin.
import { adminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { extractShortcode } from '../_shared/reel.ts';
import { ingestSharedAttachment, orchestrate } from '../_shared/ingest.ts';

const VERIFY_TOKEN = () => Deno.env.get('META_VERIFY_TOKEN') ?? '';
const APP_SECRET = () => Deno.env.get('META_APP_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);

  // ───── Vérification de l'abonnement (Meta appelle en GET) ─────
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN()) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  const signatureOk = await verifySignature(req, rawBody);

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const supabase = adminClient();
  await supabase.from('webhook_events').insert({
    payload,
    signature_ok: signatureOk,
    handled: false,
    note: signatureOk ? null : 'signature invalide',
  });

  // On répond 200 rapidement à Meta même si la signature échoue (sinon retries).
  if (!signatureOk) return new Response('EVENT_RECEIVED', { status: 200 });

  // Traitement en arrière-plan (best-effort) sans bloquer la réponse 200 OK à Meta.
  // Meta impose un délai de réponse de 5s max sous peine de rejouer le webhook (retries).
  const bgProcess = handlePayload(supabase, payload).catch((e) => {
    console.error('handlePayload error', e);
  });

  // Utiliser EdgeRuntime.waitUntil pour laisser le job tourner après la réponse HTTP
  // @ts-ignore
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(bgProcess);
  }

  return new Response('EVENT_RECEIVED', { status: 200 });
});

// ───────────────────────────── signature ─────────────────────────────
async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = APP_SECRET();
  if (!secret) return false;
  const header = req.headers.get('x-hub-signature-256');
  if (!header?.startsWith('sha256=')) return false;
  const expected = header.slice('sha256='.length);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

// ───────────────────────────── traitement ────────────────────────────
interface WebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<MessagingEvent>;
  }>;
}
interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: {
    text?: string;
    is_echo?: boolean;
    attachments?: Array<{ type?: string; payload?: { url?: string; title?: string } }>;
  };
}

async function handlePayload(supabase: ReturnType<typeof adminClient>, payload: WebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const evt of entry.messaging ?? []) {
      const isEcho = evt.message?.is_echo ?? false;
      // On ne traite que les messages ENTRANTS (échos = messages du compte connecté lui-même).
      if (isEcho) continue;

      // Compte connecté (secondaire/business) = destinataire ; expéditeur = compte principal.
      const businessAccountId = evt.recipient?.id ?? entry.id;
      const senderId = evt.sender?.id;
      const text = evt.message?.text?.trim();

      // 1) Jumelage du compte principal : le texte correspond-il à un code de jumelage ?
      if (text && senderId && (await tryPairSender(supabase, text, senderId, businessAccountId))) continue;

      // 2) Activation legacy (code d'activation tapé, avant l'OAuth).
      if (text && (await tryActivate(supabase, text, businessAccountId))) continue;

      // 3) Capture d'un réel partagé (uniquement depuis le compte principal autorisé).
      await tryCaptureReel(supabase, evt, businessAccountId, senderId);
    }
  }
}

/**
 * Jumelage : si le texte est le code de jumelage d'une connexion, on mémorise l'IGSID
 * de l'expéditeur (le compte principal). Seuls ses partages seront capturés ensuite.
 */
async function tryPairSender(
  supabase: ReturnType<typeof adminClient>,
  text: string,
  senderId: string,
  businessAccountId?: string,
): Promise<boolean> {
  const code = text.toUpperCase();
  const { data: conn } = await supabase
    .from('instagram_connections')
    .select('id')
    .eq('sender_pairing_code', code)
    .maybeSingle();
  if (!conn) return false;

  await supabase
    .from('instagram_connections')
    .update({
      sender_id: senderId,
      sender_paired_at: new Date().toISOString(),
      // Enregistre l'IGSID de messagerie (recipient.id du webhook) — différent du user_id OAuth.
      ig_messaging_id: businessAccountId ?? null,
    })
    .eq('id', conn.id);
  return true;
}

async function tryActivate(
  supabase: ReturnType<typeof adminClient>,
  text: string,
  businessAccountId?: string,
): Promise<boolean> {
  const code = text.toUpperCase();
  const { data: conn } = await supabase
    .from('instagram_connections')
    .select('id')
    .eq('activation_code', code)
    .maybeSingle();
  if (!conn) return false;

  await supabase
    .from('instagram_connections')
    .update({
      status: 'active',
      ig_account_id: businessAccountId ?? null,
      connected_at: new Date().toISOString(),
    })
    .eq('id', conn.id);
  return true;
}

async function tryCaptureReel(
  supabase: ReturnType<typeof adminClient>,
  evt: MessagingEvent,
  businessAccountId?: string,
  senderId?: string,
) {
  if (!businessAccountId) return;

  // Trouve l'utilisateur ReelVault propriétaire du compte connecté.
  // On cherche d'abord par ig_messaging_id (IGSID, appris au jumelage), puis par ig_account_id
  // (user_id OAuth, présent dès la connexion mais différent de l'IGSID — rétro-compat).
  const { data: conn } = await supabase
    .from('instagram_connections')
    .select('user_id, status, sender_id')
    .or(`ig_messaging_id.eq.${businessAccountId},ig_account_id.eq.${businessAccountId}`)
    .eq('status', 'active')
    .maybeSingle();
  if (!conn) return;

  // Si un compte principal est jumelé, on n'accepte QUE ses partages.
  if (conn.sender_id && senderId && conn.sender_id !== senderId) return;

  // ── Itérer les pièces jointes : ig_reel, ig_post (photo/carrousel), etc. ──
  const attachments = evt.message?.attachments ?? [];
  for (const att of attachments) {
    const result = await ingestSharedAttachment(supabase, conn.user_id, att);
    if (result) {
      await orchestrate(result.reelId, result.kind);
      return; // un post par message
    }
  }

  // ── Repli : lien IG collé en texte libre ──────────────────────────────────
  const text = evt.message?.text?.trim();
  if (text) {
    const shortcode = extractShortcode(text);
    if (shortcode) {
      const result = await ingestSharedAttachment(supabase, conn.user_id, {
        payload: { url: `https://www.instagram.com/reel/${shortcode}/` },
      });
      if (result) {
        await orchestrate(result.reelId, result.kind);
      }
    }
  }
}
