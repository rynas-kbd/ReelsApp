/**
 * Catégories par défaut de ReelVault.
 * ⚠️ Cette liste est la SOURCE DE VÉRITÉ. Elle est répliquée :
 *  - dans la migration SQL `handle_new_user()` (seed à l'inscription)
 *  - dans l'Edge Function `classify-reel` (_shared/categories.ts)
 * Garde les 3 endroits cohérents si tu modifies cette liste.
 */

export interface DefaultCategory {
  name: string;
  slug: string;
  color: string;
  icon: string; // nom d'icône lucide (web) / ionicons-like (mobile)
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Sport & Fitness', slug: 'sport-fitness', color: '#22C55E', icon: 'dumbbell' },
  { name: 'Cuisine & Recettes', slug: 'cuisine-recettes', color: '#F97316', icon: 'utensils' },
  { name: 'Mode & Style', slug: 'mode-style', color: '#EC4899', icon: 'shirt' },
  { name: 'Humour & Divertissement', slug: 'humour-divertissement', color: '#FACC15', icon: 'laugh' },
  { name: 'Business & Motivation', slug: 'business-motivation', color: '#3B82F6', icon: 'trending-up' },
  { name: 'Voyage & Découverte', slug: 'voyage-decouverte', color: '#06B6D4', icon: 'plane' },
  { name: 'Tech & Gaming', slug: 'tech-gaming', color: '#8B5CF6', icon: 'gamepad-2' },
  { name: 'Art & Créativité', slug: 'art-creativite', color: '#F43F5E', icon: 'palette' },
];

/** Palette utilisée pour colorer les catégories créées par l'IA. */
export const CATEGORY_PALETTE = [
  '#22C55E', '#F97316', '#EC4899', '#FACC15',
  '#3B82F6', '#06B6D4', '#8B5CF6', '#F43F5E',
  '#10B981', '#EAB308', '#6366F1', '#14B8A6',
];

/** slugify FR simple (sert pour les catégories créées par l'IA). */
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

/** Couleur déterministe pour une nouvelle catégorie (basée sur son nom). */
export function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}
