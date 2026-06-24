/**
 * Accès aux données ReelVault — fonctions partagées web + mobile.
 * Chaque fonction prend un SupabaseClient déjà authentifié (RLS s'occupe de l'isolation).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApiKeyProvider,
  Category,
  CategoryWithChildren,
  Digest,
  DigestWithReels,
  InstagramConnection,
  LibraryFilters,
  Profile,
  ReelWithCategory,
  UserApiKey,
} from './types';

const REEL_SELECT =
  '*, category:categories(id, name, slug, color, icon, parent_id, parent:parent_id(id, name, slug, color))';

/** Récupère les réels avec filtres + recherche. */
export async function fetchReels(
  supabase: SupabaseClient,
  filters: LibraryFilters = {},
  { limit = 30, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<ReelWithCategory[]> {
  let query = supabase.from('reels').select(REEL_SELECT).range(offset, offset + limit - 1);

  if (filters.categoryIds?.length) {
    query = query.in('category_id', filters.categoryIds);
  } else if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.tags?.length) query = query.overlaps('tags', filters.tags);
  if (filters.authorUsername) query = query.eq('author_username', filters.authorUsername);
  if (filters.dateFrom) query = query.gte('added_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('added_at', filters.dateTo);
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${s},caption.ilike.${s},author_username.ilike.${s},author_name.ilike.${s},summary.ilike.${s}`,
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

/**
 * Renvoie les catégories sous forme d'arbre (racines avec leurs enfants).
 * Utile pour la sidebar hiérarchique et la gestion des catégories.
 */
export async function fetchCategoryTree(supabase: SupabaseClient): Promise<CategoryWithChildren[]> {
  const cats = await fetchCategories(supabase);
  const childrenMap = new Map<string, Category[]>();
  const roots: Category[] = [];

  for (const cat of cats) {
    if (cat.parent_id === null) {
      roots.push(cat);
    } else {
      const list = childrenMap.get(cat.parent_id) ?? [];
      list.push(cat);
      childrenMap.set(cat.parent_id, list);
    }
  }

  return roots.map((r) => ({ ...r, children: childrenMap.get(r.id) ?? [] }));
}

/** Compte de réels par catégorie (agrège les enfants dans le total de la racine). */
export async function fetchCategoryCounts(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const [reelRows, cats] = await Promise.all([
    supabase.from('reels').select('category_id'),
    fetchCategories(supabase),
  ]);
  if (reelRows.error) throw reelRows.error;

  // Comptage direct
  const direct: Record<string, number> = {};
  for (const row of reelRows.data ?? []) {
    const id = (row as { category_id: string | null }).category_id ?? 'none';
    direct[id] = (direct[id] ?? 0) + 1;
  }

  // Propagation vers les racines (sous-catégories → racine)
  const parentOf = new Map<string, string | null>();
  for (const cat of cats) parentOf.set(cat.id, cat.parent_id);

  const counts: Record<string, number> = { ...direct };
  for (const [id, cnt] of Object.entries(direct)) {
    const parentId = parentOf.get(id);
    if (parentId) {
      counts[parentId] = (counts[parentId] ?? 0) + cnt;
    }
  }

  return counts;
}

/** Tags distincts de la bibliothèque (pour les chips de filtre). */
export async function fetchAllTags(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('reels')
    .select('tags')
    .not('tags', 'eq', '{}');
  if (error) throw error;
  const tagSet = new Set<string>();
  for (const row of (data ?? []) as { tags: string[] }[]) {
    for (const t of row.tags) if (t) tagSet.add(t);
  }
  return [...tagSet].sort();
}

/** Crée une nouvelle catégorie. */
export async function createCategory(
  supabase: SupabaseClient,
  name: string,
  options?: { parentId?: string | null; color?: string; icon?: string },
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: name.trim(),
      slug: slugifyClient(name),
      color: options?.color ?? '#7C3AED',
      icon: options?.icon ?? null,
      parent_id: options?.parentId ?? null,
      is_default: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Category;
}

/** Met à jour le nom/couleur/parent d'une catégorie. */
export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'parent_id'>>,
): Promise<void> {
  const update: Record<string, unknown> = { ...patch };
  if (patch.name) update.slug = slugifyClient(patch.name);
  const { error } = await supabase.from('categories').update(update).eq('id', id);
  if (error) throw error;
}

/** Supprime une catégorie (les réels seront déclassés via ON DELETE SET NULL). */
export async function deleteCategory(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

/** Fusionne deux catégories (RPC merge_categories). */
export async function mergeCategories(
  supabase: SupabaseClient,
  srcId: string,
  dstId: string,
): Promise<void> {
  const { error } = await supabase.rpc('merge_categories', { p_src: srcId, p_dst: dstId });
  if (error) throw error;
}

function slugifyClient(input: string): string {
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

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'display_name'
      | 'notif_enabled'
      | 'expo_push_token'
      | 'onboarded'
      | 'goals'
      | 'interests'
      | 'persona'
      | 'expertise_level'
      | 'time_per_week'
      | 'digest_about'
      | 'digest_frequency'
      | 'profile_completed'
    >
  >,
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

/**
 * Démarre le flux OAuth Instagram pour le MOBILE : appelle la route web
 * `/api/instagram/connect?platform=mobile` (sur `siteUrl`) avec le JWT de
 * l'utilisateur, et renvoie l'URL d'autorisation Instagram à ouvrir dans le
 * navigateur d'auth. (Le web, lui, navigue directement vers la route.)
 */
export async function startInstagramOAuth(
  supabase: SupabaseClient,
  siteUrl: string,
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('non authentifié');

  const res = await fetch(`${siteUrl.replace(/\/$/, '')}/api/instagram/connect?platform=mobile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('connect failed');
  const data = (await res.json()) as { authUrl?: string };
  if (!data.authUrl) throw new Error('authUrl manquant');
  return data.authUrl;
}

/** Déconnecte le compte Instagram de l'utilisateur courant (RLS = ses lignes). */
export async function disconnectInstagram(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from('instagram_connections')
    .update({
      status: 'revoked',
      access_token: null,
      token_expires_at: null,
      connected_at: null,
    })
    .eq('status', 'active');
  if (error) throw error;
}

/**
 * Clés API de l'utilisateur (BYOK). RLS garantit qu'on ne voit que les siennes.
 * On ne renvoie pas la clé en clair (masquée) — l'app n'a besoin que de son existence.
 */
export async function fetchApiKeys(supabase: SupabaseClient): Promise<UserApiKey[]> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, user_id, provider, key, label, cooldown_until, last_error, last_used_at, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserApiKey[];
}

/** Ajoute une clé API pour l'utilisateur courant. */
export async function addApiKey(
  supabase: SupabaseClient,
  userId: string,
  provider: ApiKeyProvider,
  key: string,
  label?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('user_api_keys')
    .insert({ user_id: userId, provider, key: key.trim(), label: label?.trim() || null });
  if (error) throw error;
}

/** Supprime une clé API (RLS = uniquement les siennes). */
export async function deleteApiKey(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('user_api_keys').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────── Digest (sélection IA) ───────────────────────────────

const DIGEST_REEL_SELECT =
  'rank, reason, reel:reels(*, category:categories(id, name, slug, color, icon))';

/** Dernier digest généré avec ses réels (jointure complète). */
export async function fetchLatestDigest(supabase: SupabaseClient): Promise<DigestWithReels | null> {
  const { data: digest, error } = await supabase
    .from('digests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!digest) return null;

  const { data: rows, error: err2 } = await supabase
    .from('digest_reels')
    .select(DIGEST_REEL_SELECT)
    .eq('digest_id', digest.id)
    .order('rank', { ascending: true });
  if (err2) throw err2;

  const reels = ((rows ?? []) as unknown as { rank: number; reason: string | null; reel: ReelWithCategory }[])
    .filter((r) => r.reel != null)
    .map(({ rank, reason, reel }) => ({ ...reel, rank, reason }));

  return { ...(digest as Digest), reels };
}

/** Historique des digests (sans les réels). */
export async function fetchDigests(supabase: SupabaseClient): Promise<Digest[]> {
  const { data, error } = await supabase
    .from('digests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Digest[];
}

/** Enregistre la note de l'utilisateur sur un digest. */
export async function rateDigest(
  supabase: SupabaseClient,
  digestId: string,
  rating: number,
): Promise<void> {
  const { error } = await supabase
    .from('digests')
    .update({ rating, rated_at: new Date().toISOString() })
    .eq('id', digestId);
  if (error) throw error;
}

/** Masque une clé pour l'affichage : ne montre que les derniers caractères. */
export function maskApiKey(key: string): string {
  if (key.length <= 6) return '••••';
  return `${'•'.repeat(Math.min(key.length - 4, 16))}${key.slice(-4)}`;
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

/**
 * Recherche hybride (plein-texte + sémantique) via l'edge function search-reels.
 * Partagée web + mobile. Nécessite l'URL Supabase et le JWT de l'utilisateur.
 * La fonction gère elle-même le repli ilike si pgvector/Gemini sont indisponibles.
 */
export async function searchReelsHybrid(
  supabaseUrl: string,
  accessToken: string,
  params: {
    query: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  },
): Promise<ReelWithCategory[]> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/search-reels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { reels?: ReelWithCategory[] };
    return (data.reels ?? []) as ReelWithCategory[];
  } catch {
    return [];
  }
}
