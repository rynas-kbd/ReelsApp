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
import { extractShortcode, reelUrl } from '../_shared/reel.ts';

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

  // Traitement asynchrone (best-effort).
  try {
    await handlePayload(supabase, payload);
  } catch (e) {
    console.error('handlePayload error', e);
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
      // Le compte connecté (secondaire/business) est le destinataire des messages reçus,
      // ou l'expéditeur des messages "echo" (envoyés par le compte connecté lui-même).
      const businessAccountId = (isEcho ? evt.sender?.id : evt.recipient?.id) ?? entry.id;
      const text = evt.message?.text?.trim();

      // 1) Activation : le texte correspond-il à un code d'activation en attente ?
      if (text && (await tryActivate(supabase, text, businessAccountId))) continue;

      // 2) Capture d'un réel partagé.
      await tryCaptureReel(supabase, evt, businessAccountId);
    }
  }
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
) {
  if (!businessAccountId) return;

  // Trouve l'utilisateur ReelVault propriétaire du compte connecté.
  const { data: conn } = await supabase
    .from('instagram_connections')
    .select('user_id, status')
    .eq('ig_account_id', businessAccountId)
    .eq('status', 'active')
    .maybeSingle();
  if (!conn) return;

  // Récupère les liens IG depuis les attachments + le texte du message.
  const candidates: string[] = [];
  for (const att of evt.message?.attachments ?? []) {
    if (att.payload?.url) candidates.push(att.payload.url);
  }
  if (evt.message?.text) candidates.push(evt.message.text);

  for (const candidate of candidates) {
    const shortcode = extractShortcode(candidate);
    if (!shortcode) continue;

    const { data: reel, error } = await supabase
      .from('reels')
      .insert({
        user_id: conn.user_id,
        ig_url: reelUrl(shortcode),
        shortcode,
        source: 'webhook',
        status: 'pending',
      })
      .select('id')
      .single();

    // Doublon → on ignore proprement.
    if (error) continue;

    await orchestrate(reel.id);
    break; // un réel par message
  }
}

async function orchestrate(reelId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` };
  await fetch(`${supabaseUrl}/functions/v1/enrich-reel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reel_id: reelId }),
  }).catch(() => {});
  await fetch(`${supabaseUrl}/functions/v1/classify-reel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reel_id: reelId }),
  }).catch(() => {});
}
