// Classification d'un réel par IA — Google Gemini 2.5-flash multimodal.
// Selon le type de média :
//   - Reel vidéo : transcript + miniature + légende/hashtags
//   - Post image : image(s) + légende/hashtags
// Renvoie catégorie hiérarchique (racine + sous-catégorie), tags et résumé.
import type { Attempt } from './keys.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
export const UNSORTED_CATEGORY = 'À trier';

// Arbre des catégories passé au prompt
export interface CategoryNode {
  name: string;
  children: string[];
}

export interface ClassifyInput {
  title?: string | null;
  caption?: string | null;
  transcript?: string | null;     // paroles (STT) — pour les vidéos
  author_username?: string | null;
  author_name?: string | null;
  media_type?: 'video' | 'image' | null;
  thumbnail_url?: string | null;  // URL publique de la miniature (bucket)
  image_urls?: string[];          // URLs des images (post photo)
  categoryTree: CategoryNode[];   // arbre existant de l'utilisateur
}

export interface ClassifyResult {
  category: string;
  subcategory: string | null;
  tags: string[];
  summary: string;
}

/** Un appel Gemini multimodal avec une clé donnée. `quota:true` → l'appelant essaie la clé suivante. */
export async function classifyWithKey(
  input: ClassifyInput,
  apiKey: string,
): Promise<Attempt<ClassifyResult>> {
  const parts: Array<Record<string, unknown>> = [];

  // ── 1. Images (miniature pour vidéo, images du post pour photo) ──
  const imageUrlsToSend: string[] = [];
  if (input.media_type === 'video' && input.thumbnail_url) {
    imageUrlsToSend.push(input.thumbnail_url);
  } else if (input.media_type === 'image' || !input.media_type) {
    if (input.image_urls?.length) {
      // Max 3 images pour limiter les tokens
      imageUrlsToSend.push(...input.image_urls.slice(0, 3));
    } else if (input.thumbnail_url) {
      imageUrlsToSend.push(input.thumbnail_url);
    }
  }

  for (const imgUrl of imageUrlsToSend) {
    try {
      const imgData = await fetchImageBase64(imgUrl);
      if (imgData) {
        parts.push({
          inlineData: { mimeType: 'image/jpeg', data: imgData },
        });
      }
    } catch {
      // Image non accessible → on continue sans elle
    }
  }

  // ── 2. Partie texte ──
  parts.push({ text: buildPrompt(input) });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
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
    const parsed = JSON.parse(stripFences(text)) as Partial<ClassifyResult>;

    const category = (parsed.category ?? '').trim();
    if (!category) return { ok: false, error: 'réponse vide' };

    return {
      ok: true,
      value: {
        category,
        subcategory: (parsed.subcategory ?? null) as string | null,
        tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 10) : [],
        summary: (parsed.summary ?? '').trim(),
      },
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Retire d'éventuelles balises ```json ... ``` autour de la réponse. */
function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

/** Télécharge une image et la convertit en base64 pour l'API Gemini. */
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    // Encode en base64 (compatible Deno)
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

function buildPrompt(input: ClassifyInput): string {
  // Contexte textuel du réel
  const lines: string[] = [];
  if (input.title)    lines.push(`Titre / texte principal : ${input.title}`);
  if (input.caption)  lines.push(`Légende Instagram : ${input.caption}`);
  if (input.transcript) lines.push(`Paroles / sous-titres : ${input.transcript.slice(0, 1500)}`);
  if (input.author_username) lines.push(`Compte : @${input.author_username}`);
  const ctx = lines.join('\n') || '(très peu d\'informations disponibles)';

  // Arbre des catégories existantes
  let catTree = '';
  if (input.categoryTree.length === 0) {
    catTree = '(aucune catégorie pour l\'instant — crée-en une nouvelle)';
  } else {
    catTree = input.categoryTree.map((root) => {
      const children = root.children.length
        ? '\n' + root.children.map((c) => `    └ ${c}`).join('\n')
        : '';
      return `- ${root.name}${children}`;
    }).join('\n');
  }

  return `Tu es un assistant qui classe des réels Instagram dans des catégories hiérarchiques, en français.

ARBRE DES CATÉGORIES EXISTANTES (2 niveaux max) :
${catTree}

CONTENU À CLASSER :
${ctx}

${input.media_type === 'video'
  ? 'ℹ️ La miniature ci-dessus est la couverture du réel vidéo. Les paroles ont été transcrites et fournies dans "Paroles / sous-titres" si disponibles.'
  : 'ℹ️ Les images ci-dessus sont du post Instagram à classer.'
}

RÈGLES :
1. Analyse le SUJET réel du contenu (sport, cuisine, humour, tech, voyage, etc.).
2. Choisis une CATÉGORIE RACINE (niveau 1) parmi les racines existantes, ou crée-en une nouvelle courte.
3. Optionnel : choisis ou crée une SOUS-CATÉGORIE (niveau 2) sous cette racine, si le sujet est suffisamment précis. Sinon, mets null.
4. Ne crée pas de doublon sémantique : réutilise exactement le nom existant (même orthographe) si le sujet correspond.
5. Génère entre 3 et 8 TAGS courts (un mot ou deux mots), en minuscules, sans # (ex : "débutant", "recette rapide").
6. Rédige un RÉSUMÉ très court (1 à 2 phrases max) décrivant ce que montre/explique le réel.
7. Si vraiment aucune information exploitable, utilise "À trier" comme catégorie et résumé vide.

Réponds STRICTEMENT en JSON, sans texte autour :
{"category":"<catégorie racine>","subcategory":"<sous-catégorie ou null>","tags":["...","..."],"summary":"<résumé court>"}`;
}
