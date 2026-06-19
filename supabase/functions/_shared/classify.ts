// Classification d'un réel par IA — Google Gemini (free tier, AI Studio).
// Renvoie le nom d'une catégorie : soit une existante, soit une nouvelle proposée par l'IA.

const GEMINI_MODEL = 'gemini-1.5-flash';

export interface ClassifyInput {
  title?: string | null;
  caption?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  existingCategories: string[];
}

export interface ClassifyResult {
  category: string;
  isNew: boolean;
}

/**
 * Demande à Gemini de ranger le réel dans une catégorie existante,
 * ou d'en proposer une nouvelle (concise, format « Thème & Sous-thème »).
 * Fallback : 'Humour & Divertissement' si l'IA est indisponible.
 */
export async function classifyReel(input: ClassifyInput): Promise<ClassifyResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const fallbackCategory = input.existingCategories[0] ?? 'Humour & Divertissement';
  if (!apiKey) return { category: fallbackCategory, isNew: false };

  const prompt = buildPrompt(input);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) return { category: fallbackCategory, isNew: false };
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text) as { category?: string };
    const category = (parsed.category ?? '').trim();
    if (!category) return { category: fallbackCategory, isNew: false };

    const isNew = !input.existingCategories.some(
      (c) => c.toLowerCase() === category.toLowerCase(),
    );
    return { category, isNew };
  } catch (_e) {
    return { category: fallbackCategory, isNew: false };
  }
}

function buildPrompt(input: ClassifyInput): string {
  const ctx = [
    input.title ? `Titre: ${input.title}` : null,
    input.caption ? `Légende: ${input.caption}` : null,
    input.author_username ? `Compte: @${input.author_username}` : null,
    input.author_name ? `Nom: ${input.author_name}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `Tu es un assistant qui classe des réels Instagram par thème, en français.

Catégories existantes :
${input.existingCategories.map((c) => `- ${c}`).join('\n')}

Réel à classer :
${ctx || '(peu d\'informations disponibles)'}

Consigne :
- Choisis la catégorie EXISTANTE la plus pertinente si elle convient.
- Sinon, propose UNE nouvelle catégorie courte au format « Thème & Sous-thème » (ex: « Finance & Crypto »).
- Réponds STRICTEMENT en JSON : {"category": "<nom exact de la catégorie>"}.`;
}
