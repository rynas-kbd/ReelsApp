// Génération d'embeddings texte via Gemini text-embedding-004 (768 dimensions).
// Utilisé par classify-reel pour stocker les embeddings sémantiques des réels.
import type { Attempt } from './keys.ts';

const EMBED_MODEL = 'text-embedding-004';
const EMBED_DIMS = 768;

/**
 * Génère un embedding pour le texte donné via l'API Gemini.
 * @param text   Texte à encoder (titre + résumé + tags + transcript, ~1-2 phrases max)
 * @param apiKey Clé API Gemini de l'utilisateur
 * @returns Attempt<number[]> — vecteur de 768 floats ou échec quota (429).
 */
export async function embedWithKey(
  text: string,
  apiKey: string,
): Promise<Attempt<number[]>> {
  if (!text.trim()) return { ok: false, error: 'Texte vide' };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: EMBED_DIMS,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, quota: res.status === 429, error: `HTTP ${res.status} ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const values: number[] | undefined = data?.embedding?.values;
    if (!values?.length) return { ok: false, error: 'Embedding vide dans la réponse Gemini' };
    return { ok: true, value: values };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Dimensions de l'embedding text-embedding-004. */
export const EMBED_DIMENSIONS = EMBED_DIMS;
