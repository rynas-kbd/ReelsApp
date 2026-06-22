// Sélection IA d'un digest (réels personnalisés) — Google Gemini 2.5-flash.
// Calque exact du pattern de _shared/classify.ts : un appel par clé, rotation côté appelant.
import type { Attempt } from './keys.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';

export interface ReelSnippet {
  reel_id: string;
  title?: string | null;
  caption?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  category?: string | null;
}

export interface DigestInput {
  goals: string[];
  interests: string[];
  persona: string | null;
  expertise_level: string | null;
  time_per_week: string | null;
  digest_about: string | null;
  reels: ReelSnippet[];
  maxPicks?: number;
}

export interface DigestOutput {
  summary: string;
  picks: { reel_id: string; reason: string }[];
}

export async function selectDigestWithKey(
  input: DigestInput,
  apiKey: string,
): Promise<Attempt<DigestOutput>> {
  const prompt = buildDigestPrompt(input);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
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
    const parsed = JSON.parse(stripFences(text)) as Partial<DigestOutput>;

    if (!parsed.summary || !Array.isArray(parsed.picks) || parsed.picks.length === 0) {
      return { ok: false, error: 'réponse incomplète' };
    }
    return { ok: true, value: { summary: parsed.summary, picks: parsed.picks } };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function buildDigestPrompt(input: DigestInput): string {
  const max = input.maxPicks ?? 7;

  const profileParts = [
    input.persona ? `Qui es-tu : ${input.persona}` : null,
    input.expertise_level ? `Niveau : ${input.expertise_level}` : null,
    input.time_per_week ? `Temps dispo / semaine : ${input.time_per_week}` : null,
    input.goals.length ? `Objectifs : ${input.goals.join(', ')}` : null,
    input.interests.length ? `Centres d'intérêt : ${input.interests.join(', ')}` : null,
    input.digest_about ? `En ses mots : "${input.digest_about}"` : null,
  ].filter(Boolean).join('\n');

  const reelsList = input.reels
    .map((r, i) => {
      const parts = [
        `[${i + 1}] id: ${r.reel_id}`,
        r.category ? `catégorie: ${r.category}` : null,
        r.author_username ? `compte: @${r.author_username}` : null,
        r.title ? `titre: ${r.title}` : null,
        r.caption ? `légende: ${r.caption.slice(0, 200)}` : null,
      ].filter(Boolean).join(' | ');
      return parts;
    })
    .join('\n');

  return `Tu es un assistant curatorial expert. Un utilisateur a sauvegardé des réels Instagram sur une période. \
Tu dois sélectionner les ${max} meilleurs réels selon son profil, et rédiger une synthèse personnalisée en français.

PROFIL DE L'UTILISATEUR :
${profileParts || '(non renseigné)'}

RÉELS DISPONIBLES (${input.reels.length}) :
${reelsList}

RÈGLES :
1. Sélectionne entre 5 et ${max} réels parmi ceux listés. Priorise ceux alignés avec les objectifs et intérêts.
2. Pour chaque réel sélectionné, écris une justification courte (1-2 phrases max) en français.
3. Rédige une synthèse globale de 2-4 phrases, personnalisée pour l'utilisateur, qui explique pourquoi cette sélection lui sera utile.
4. Ne sélectionne QUE des reel_id présents dans la liste ci-dessus.
5. Réponds STRICTEMENT en JSON, sans texte autour.

Format attendu :
{
  "summary": "<synthèse personnalisée en français>",
  "picks": [
    { "reel_id": "<id exact>", "reason": "<justification courte>" },
    ...
  ]
}`;
}
