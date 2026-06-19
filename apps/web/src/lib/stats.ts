import type { SupabaseClient } from '@supabase/supabase-js';
import type { LibraryStats } from '@reelvault/shared';

/**
 * Récupère les statistiques agrégées via la RPC `library_stats()`.
 * Renvoie un jsonb { totalReels, byCategory[], topAuthors[], overTime[] }.
 */
export async function fetchLibraryStats(supabase: SupabaseClient): Promise<LibraryStats> {
  const { data, error } = await supabase.rpc('library_stats');
  if (error) throw error;

  const raw = (data ?? {}) as Partial<LibraryStats>;
  return {
    totalReels: raw.totalReels ?? 0,
    byCategory: raw.byCategory ?? [],
    mostViewed: raw.mostViewed ?? [],
    topAuthors: raw.topAuthors ?? [],
    overTime: raw.overTime ?? [],
  };
}
