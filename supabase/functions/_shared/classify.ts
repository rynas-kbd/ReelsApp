// Classification d'un réel par IA — Google Gemini (free tier, AI Studio).
// `classifyWithKey` fait UN appel avec UNE clé et signale les quotas (429) pour
// permettre la rotation côté appelant (voir _shared/keys.ts).
import type { Attempt } from './keys.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
// Catégorie neutre quand l'IA est indisponible : NE PAS retomber sur la 1re catégorie
// existante (sinon tout finit dans « Sport & Fitness »).
export const UNSORTED_CATEGORY = 'À trier';

export interface ClassifyInput {
  title?: string | null;
  caption?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  existingCategories: string[];
}

/** Un appel Gemini avec une clé donnée. `quota:true` → l'appelant essaie la clé suivante. */
export async function classifyWithKey(
  input: ClassifyInput,
  apiKey: string,
): Promise<Attempt<string>> {
  const prompt = buildPrompt(input);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            // Désactive le « thinking » de Gemini 2.5 : tâche simple → plus rapide et moins coûteux.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, quota: res.status === 429, error: `HTTP ${res.status} ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(stripFences(text)) as { category?: string };
    const category = (parsed.category ?? '').trim();
    if (!category) return { ok: false, error: 'réponse vide' };
    return { ok: true, value: category };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Retire d'éventuelles balises ```json ... ``` autour de la réponse. */
function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function buildPrompt(input: ClassifyInput): string {
  const ctx = [
    input.title ? `Titre / légende: ${input.title}` : null,
    input.caption ? `Description: ${input.caption}` : null,
    input.author_username ? `Compte: @${input.author_username}` : null,
    input.author_name ? `Nom de l'auteur: ${input.author_name}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const catList = input.existingCategories.length
    ? input.existingCategories.map((c) => `- ${c}`).join('\n')
    : '(aucune pour l\'instant)';

  return `Tu es un assistant qui range des réels Instagram dans des catégories thématiques, en français.

Catégories déjà existantes de l'utilisateur :
${catList}

Réel à classer :
${ctx || '(très peu d\'informations disponibles)'}

Règles :
1. Analyse le SUJET réel du contenu (jeu vidéo, sport, cuisine, humour, tech, voyage, etc.).
2. Si UNE des catégories existantes correspond clairement au sujet, réutilise-la EXACTEMENT (même orthographe).
3. Sinon, CRÉE une nouvelle catégorie courte et claire au format « Thème & Sous-thème » (ex : « Jeux Vidéo & Esports », « Finance & Crypto »). Ne force jamais un réel dans une catégorie qui ne correspond pas.
4. Une seule catégorie. Pas de doublon sémantique avec une catégorie existante (ex : ne crée pas « Gaming » si « Jeux Vidéo » existe déjà).
5. Si vraiment aucune information exploitable, réponds « À trier ».

Réponds STRICTEMENT en JSON, sans texte autour : {"category": "<nom exact de la catégorie>"}`;
}
