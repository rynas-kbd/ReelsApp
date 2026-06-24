// Utilitaires réels partagés par les Edge Functions (Deno, sans accès aux packages npm du monorepo).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { CategoryNode } from './classify.ts';

const IG_HOSTS = ['instagram.com', 'www.instagram.com', 'instagr.am'];

export function extractShortcode(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!IG_HOSTS.includes(u.hostname.replace(/^m\./, ''))) return null;
    const m = u.pathname.match(/\/(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function reelUrl(shortcode: string): string {
  return `https://www.instagram.com/reel/${shortcode}/`;
}

export const DEFAULT_CATEGORY_NAMES = [
  'Sport & Fitness',
  'Cuisine & Recettes',
  'Mode & Style',
  'Humour & Divertissement',
  'Business & Motivation',
  'Voyage & Découverte',
  'Tech & Gaming',
  'Art & Créativité',
];

const PALETTE = [
  '#22C55E', '#F97316', '#EC4899', '#FACC15',
  '#3B82F6', '#06B6D4', '#8B5CF6', '#F43F5E',
  '#10B981', '#EAB308', '#6366F1', '#14B8A6',
];

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Trouve une catégorie par slug (et parent_id) ou la crée pour cet utilisateur.
 * @param parentId  null = catégorie racine ; uuid = sous-catégorie sous ce parent.
 */
export async function findOrCreateCategory(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  parentId: string | null = null,
): Promise<string> {
  const slug = slugify(name);

  // Recherche : racine (parent_id IS NULL) ou enfant (parent_id = parentId)
  let lookup = supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug);

  if (parentId === null) {
    lookup = lookup.is('parent_id', null);
  } else {
    lookup = lookup.eq('parent_id', parentId);
  }

  const { data: existing } = await lookup.maybeSingle();
  if (existing) return existing.id as string;

  // Ordre d'insertion : max sort_order + 1
  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((maxRow?.sort_order as number) ?? 0) + 1;

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name,
      slug,
      color: pickColor(name),
      is_default: false,
      sort_order,
      parent_id: parentId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}

/**
 * Charge l'arbre des catégories de l'utilisateur (racines + leurs enfants directs).
 * Utilisé pour construire le contexte du prompt Gemini.
 */
export async function fetchCategoryTree(
  supabase: SupabaseClient,
  userId: string,
): Promise<CategoryNode[]> {
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  const rows = (cats ?? []) as Array<{ id: string; name: string; parent_id: string | null }>;
  const childrenByParent = new Map<string, string[]>();
  const roots: Array<{ id: string; name: string }> = [];

  for (const row of rows) {
    if (row.parent_id === null) {
      roots.push({ id: row.id, name: row.name });
    } else {
      const list = childrenByParent.get(row.parent_id) ?? [];
      list.push(row.name);
      childrenByParent.set(row.parent_id, list);
    }
  }

  return roots.map((r) => ({
    name: r.name,
    children: childrenByParent.get(r.id) ?? [],
  }));
}
