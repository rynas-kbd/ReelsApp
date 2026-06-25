/** Types des lignes de la base ReelVault (alignés sur les migrations SQL). */

export type ReelSource = 'webhook' | 'manual' | 'share';
export type ReelStatus = 'pending' | 'enriched' | 'classified' | 'failed';
export type ConnectionStatus = 'pending' | 'active' | 'revoked';
export type DigestFrequency = 'weekly' | 'monthly' | 'off';

export interface Profile {
  id: string;
  display_name: string | null;
  notif_enabled: boolean;
  expo_push_token: string | null;
  onboarded: boolean;
  created_at: string;
  // Second brain
  goals: string[] | null;
  interests: string[] | null;
  persona: string | null;
  expertise_level: string | null;
  time_per_week: string | null;
  digest_about: string | null;
  digest_frequency: DigestFrequency;
  profile_completed: boolean;
}

export interface Digest {
  id: string;
  user_id: string;
  frequency: string | null;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  rating: number | null;
  rated_at: string | null;
  status: string;
  created_at: string;
}

export interface DigestReel {
  digest_id: string;
  reel_id: string;
  rank: number;
  reason: string | null;
}

export interface DigestWithReels extends Digest {
  reels: (ReelWithCategory & { rank: number; reason: string | null })[];
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  is_default: boolean;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
}

/** Catégorie racine avec ses sous-catégories (pour la navigation en arbre). */
export interface CategoryWithChildren extends Category {
  children: Category[];
}

export interface Reel {
  id: string;
  user_id: string;
  ig_url: string | null;  // null pour les posts photo/carrousel (pas d'URL instagram.com exploitable)
  shortcode: string | null;
  thumbnail_url: string | null;
  title: string | null;
  caption: string | null;
  author_username: string | null;
  author_name: string | null;
  category_id: string | null;
  source: ReelSource;
  status: ReelStatus;
  view_count: number;
  added_at: string;
  raw_metadata: Record<string, unknown> | null;
  // Champs avancés (migration 0012)
  tags: string[];
  summary: string | null;
  notes: string | null;
  transcript: string | null;
  media_type: 'video' | 'image' | null;
}

/** Catégorie partielle pour l'affichage (jointe sur reels). */
export type CategoryRef = Pick<Category, 'id' | 'name' | 'slug' | 'color' | 'icon' | 'parent_id'> & {
  parent: Pick<Category, 'id' | 'name' | 'slug' | 'color'> | null;
};

/** Reel + sa catégorie jointe avec le parent (vue d'affichage). */
export interface ReelWithCategory extends Reel {
  category: CategoryRef | null;
}

export interface InstagramConnection {
  id: string;
  user_id: string;
  ig_account_id: string | null;
  ig_username: string | null;
  page_id: string | null;
  activation_code: string | null;
  access_token: string | null;
  token_expires_at: string | null;
  status: ConnectionStatus;
  connected_at: string | null;
  created_at: string;
  // Jumelage du compte principal autorisé à partager des réels.
  sender_pairing_code: string | null;
  sender_id: string | null;
  sender_username: string | null;
  sender_paired_at: string | null;
}

export type ApiKeyProvider = 'gemini' | 'rapidapi' | 'groq';

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: ApiKeyProvider;
  key: string;
  label: string | null;
  cooldown_until: string | null;
  last_error: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface ReelView {
  id: string;
  reel_id: string;
  user_id: string;
  viewed_at: string;
}

/** Filtres de la bibliothèque (web + mobile). */
export interface LibraryFilters {
  search?: string;
  categoryId?: string | null;
  categoryIds?: string[] | null;  // plusieurs catégories (racine + enfants)
  tags?: string[];                // filtre multi-tags (overlaps)
  authorUsername?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: 'recent' | 'oldest' | 'most_viewed';
}

/** Statistiques agrégées du dashboard web. */
export interface LibraryStats {
  totalReels: number;
  byCategory: { categoryId: string; name: string; color: string; count: number }[];
  mostViewed: ReelWithCategory[];
  topAuthors: { author_username: string; author_name: string | null; count: number }[];
  overTime: { date: string; count: number }[];
}
