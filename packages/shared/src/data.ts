/**
 * Accès aux données ReelVault — fonctions partagées web + mobile.
 * Chaque fonction prend un SupabaseClient déjà authentifié (RLS s'occupe de l'isolation).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApiKeyProvider,
  Category,
  Digest,
  DigestWithReels,
  InstagramConnection,
  LibraryFilters,
  Profile,
  ReelWithCategory,
  UserApiKey,
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
