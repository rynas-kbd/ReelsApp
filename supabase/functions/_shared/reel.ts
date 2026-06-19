// Utilitaires réels partagés par les Edge Functions (Deno, sans accès aux packages npm du monorepo).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

/** Trouve une catégorie par nom (insensible casse) ou la crée pour cet utilisateur. */
export async function findOrCreateCategory(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<string> {
  const slug = slugify(name);
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle();
  if (existing) return existing.id as string;

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
    .insert({ user_id: userId, name, slug, color: pickColor(name), is_default: false, sort_order })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}
