/**
 * Accès aux données ReelVault — fonctions partagées web + mobile.
 * Chaque fonction prend un SupabaseClient déjà authentifié (RLS s'occupe de l'isolation).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Category,
  InstagramConnection,
  LibraryFilters,
  Profile,
  ReelWithCategory,
} from './types';

const REEL_SELECT =
  '*, category:categories(id, name, slug, color, icon)';

/** Récupère les réels avec filtres + recherche. */
export async function fetchReels(
  supabase: SupabaseClient,
  filters: LibraryFilters = {},
  { limit = 30, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<ReelWithCategory[]> {
  let query = supabase.from('reels').select(REEL_SELECT).range(offset, offset + limit - 1);

  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.authorUsername) query = query.eq('author_username', filters.authorUsername);
  if (filters.dateFrom) query = query.gte('added_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('added_at', filters.dateTo);
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${s},caption.ilike.${s},author_username.ilike.${s},author_name.ilike.${s}`,
    );
  }

  switch (filters.sort) {
    case 'oldest':
      query = query.order('added_at', { ascending: true });
      break;
    case 'most_viewed':
      query = query.order('view_count', { ascending: false });
      break;
    default:
      query = query.order('added_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ReelWithCategory[];
}

export async function fetchCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

/** Compte de réels par catégorie (pour les badges de la sidebar). */
export async function fetchCategoryCounts(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('reels').select('category_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { category_id: string | null }).category_id ?? 'none';
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'notif_enabled' | 'expo_push_token'>>,
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function fetchConnection(
  supabase: SupabaseClient,
): Promise<InstagramConnection | null> {
  const { data, error } = await supabase
    .from('instagram_connections')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as InstagramConnection | null;
}

/** Crée (ou retourne) la connexion Instagram + son code d'activation. */
export async function ensureConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<InstagramConnection> {
  const existing = await fetchConnection(supabase);
  if (existing) return existing;
  const activation_code = `RV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data, error } = await supabase
    .from('instagram_connections')
    .insert({ user_id: userId, activation_code, status: 'pending' })
    .select('*')
    .single();
  if (error) throw error;
  return data as InstagramConnection;
}

/** Incrémente le compteur de vues + journalise (pour les stats). */
export async function recordView(supabase: SupabaseClient, reelId: string): Promise<void> {
  await supabase.rpc('increment_reel_view', { p_reel_id: reelId });
}

/** Supprime un réel. */
export async function deleteReel(supabase: SupabaseClient, reelId: string): Promise<void> {
  const { error } = await supabase.from('reels').delete().eq('id', reelId);
  if (error) throw error;
}

/** Liste les comptes auteurs distincts (pour le filtre). */
export async function fetchAuthors(
  supabase: SupabaseClient,
): Promise<{ author_username: string; author_name: string | null }[]> {
  const { data, error } = await supabase
    .from('reels')
    .select('author_username, author_name')
    .not('author_username', 'is', null);
  if (error) throw error;
  const seen = new Map<string, { author_username: string; author_name: string | null }>();
  for (const r of (data ?? []) as { author_username: string; author_name: string | null }[]) {
    if (!seen.has(r.author_username)) seen.set(r.author_username, r);
  }
  return [...seen.values()];
}
