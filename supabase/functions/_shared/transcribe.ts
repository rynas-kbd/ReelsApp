// Transcription audio des réels vidéo via Groq Whisper (whisper-large-v3-turbo).
// Télécharge le mp4 depuis l'URL fournie, l'envoie en multipart à Groq.
// Compatible avec l'interface OpenAI /audio/transcriptions.
import type { Attempt } from './keys.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';
// Limite Groq Whisper : 25 Mo. Si le fichier est plus gros ou inaccessible → transcript vide.
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Transcrit l'audio d'une vidéo via Groq Whisper.
 * @param videoUrl URL publique du mp4 (depuis raw_metadata.videoUrl)
 * @param apiKey   Clé API Groq de l'utilisateur
 * @returns Attempt<string> — le texte transcrit, ou un échec signalant le quota (429).
 */
export async function transcribeWithKey(
  videoUrl: string,
  apiKey: string,
): Promise<Attempt<string>> {
  try {
    // 1. Télécharger la vidéo (sans ffmpeg : Groq accepte le mp4 brut)
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return { ok: false, error: `Téléchargement vidéo échoué : HTTP ${videoRes.status}` };
    }

    const bytes = new Uint8Array(await videoRes.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      // Trop gros → on ne transcrit pas, on classe sur miniature+légende
      return { ok: false, error: `Vidéo trop lourde (${Math.round(bytes.length / 1e6)} Mo > 25 Mo)` };
    }

    // 2. POST multipart vers Groq Whisper
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'audio/mp4' }), 'reel.mp4');
    form.append('model', WHISPER_MODEL);
    form.append('response_format', 'text');

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 429) {
        // Groq renvoie Retry-After en secondes (ex. 60 s pour la limite par minute).
        // On le lit pour éviter un cooldown de 6 h sur une limite transitoire.
        const retryAfterSec = Number(res.headers.get('retry-after') ?? 0);
        const MIN_MS = 5_000;   // ne pas mettre moins de 5 s
        const MAX_MS = 6 * 60 * 60 * 1000; // cap à 6 h (cas extrême)
        const cooldownMs = retryAfterSec > 0
          ? Math.min(Math.max(retryAfterSec * 1000, MIN_MS), MAX_MS)
          : undefined; // undefined → fallback COOLDOWN_MS de keys.ts (6 h)
        return { ok: false, quota: true, cooldownMs, error: `Groq 429 ${body.slice(0, 200)}` };
      }
      return { ok: false, error: `Groq HTTP ${res.status} ${body.slice(0, 200)}` };
    }

    // Groq renvoie le texte brut (response_format=text)
    const text = (await res.text()).trim();
    return { ok: true, value: text };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
